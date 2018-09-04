import { EventEmitter } from "events";
import { VError } from "verror";
import { LocalConfig } from "../config";
import { ClientCode, ServerCode } from "../envisalink/codes";
import { decodeIntCode } from "../envisalink/encodings";
import { ClientMessage, ServerMessage } from "../envisalink/message";
import createLogger from "../logger";
import { Connection } from "./Connection";
import { MessageEncoderDecoder } from "./messageEncoderDecoder";

export type MessageHandler = (msg: ServerMessage) => void;

const logger = createLogger(__filename);

export interface BufferedMessageReaderWriter {
  sendMessage(msg: ClientMessage): void;
  on(event: "message", handler: MessageHandler): void;
}

export function createBufferedMessageReaderWriter(params: {
  connection: Connection;
  config: LocalConfig;
}): BufferedMessageReaderWriter {
  return new BufferedMessageReaderWriterImpl(params);
}

class BufferedMessageReaderWriterImpl implements BufferedMessageReaderWriter {
  private readonly connection: Connection;
  private readonly maxWriteBufferSize: number;
  private readonly maxAwaitingAckCount: number;
  private readonly unackedMessageRequeueDelayMs: number;
  private readonly unackedMessageExpiryMs: number;
  private readonly checkAckQueueIntervalMs: number;

  private readonly writeBuffer: ClientMessage[] = [];
  private readonly ackQueue: Array<{
    message: ClientMessage;
    enqueuedAt: number;
  }> = [];
  private emitter = new EventEmitter();
  private messageEncoderDecoder = new MessageEncoderDecoder();

  constructor(params: { connection: Connection; config: LocalConfig }) {
    const { connection, config } = params;
    this.connection = connection;
    this.maxWriteBufferSize = config.maxWriteBufferSize;
    this.maxAwaitingAckCount = 16;
    this.unackedMessageRequeueDelayMs = 2000;
    this.unackedMessageExpiryMs = 60000;
    this.checkAckQueueIntervalMs = 4000;

    this.connection.on("data", data => this.processData(data));

    this.connection.on("connected", () => {
      this.resetAckQueue();
      this.flushWriteBuffer();
    });

    setInterval(() => {
      this.checkAckQueue();
    }, this.checkAckQueueIntervalMs);
  }

  sendMessage(msg: ClientMessage) {
    if (this.writeBuffer.length === this.maxWriteBufferSize) {
      throw new VError(
        "writeBuffer maximum size %d exceeded",
        this.maxWriteBufferSize
      );
    }
    this.writeBuffer.push(msg);
    this.flushWriteBuffer();
  }

  on(event: "message", handler: MessageHandler) {
    this.emitter.on(event, handler);
  }

  private processData(data: Buffer) {
    this.messageEncoderDecoder.decode(data).map(msg => {
      this.processMessage(msg);
    });
  }

  private processMessage(msg: ServerMessage) {
    if (msg.code === ServerCode.Ack) {
      this.processAck(msg);
    } else {
      this.emitter.emit("message", msg);
    }
  }

  private processAck(msg: ServerMessage) {
    const ackedMsgCode = decodeIntCode(msg.data) as ClientCode;

    const queuedIdx = this.ackQueue.findIndex(
      ({ message }) => message.code === ackedMsgCode
    );

    logger.trace("processAck: %s. queueIdx: %s", msg, queuedIdx);

    if (queuedIdx !== 0) {
      throw new VError(
        {
          name: "UnexpectedAck",
          info: { ackedMsgCode, queuedIdx, queue: this.ackQueue }
        },
        "Unexpected acked message"
      );
    }

    this.ackQueue.splice(queuedIdx, 1);
    this.flushWriteBuffer();
  }

  private flushWriteBuffer() {
    if (!this.connection.connected()) {
      return;
    }
    while (
      this.ackQueue.length < this.maxAwaitingAckCount &&
      this.writeBuffer.length > 0
    ) {
      this.sendNextPendingMessage();
    }
  }

  private sendNextPendingMessage() {
    const message = this.writeBuffer.shift();
    if (message == null) {
      throw new Error("attempted to shift an empty write buffer");
    }
    this.ackQueue.push({ message, enqueuedAt: Date.now() });
    const buf = this.messageEncoderDecoder.encode(message);
    this.connection.sendData(buf);
  }

  private resetAckQueue() {
    if (this.ackQueue.length > 0) {
      logger.debug(
        "resetAckQueue: requeuing %d messages",
        this.ackQueue.length
      );
      const msgs = this.ackQueue.map(({ message }) => message);
      this.writeBuffer.unshift(...msgs);
      this.ackQueue.length = 0;
    }
  }

  /**
   * loop through the ack queue to identify messages that are either expired altogether, or that need to be retried
   */
  private checkAckQueue() {
    if (!this.connection.connected()) {
      return;
    }

    let needsFlush = false;
    const now = Date.now();
    while (this.ackQueue.length > 0) {
      const { enqueuedAt, message } = this.ackQueue[0];
      const elapsed = now - enqueuedAt;
      if (elapsed > this.unackedMessageExpiryMs) {
        logger.error(
          { elapsed, message },
          "Abandoning unacked message after %d ms",
          this.unackedMessageExpiryMs
        );
        this.ackQueue.shift();
      } else if (elapsed > this.unackedMessageRequeueDelayMs) {
        logger.info(
          { message, enqueuedAt },
          "message unacked for %d ms, requeueing",
          elapsed
        );
        this.ackQueue.shift();
        this.writeBuffer.unshift(message);
        needsFlush = true;
      } else {
        break;
      }
    }

    if (needsFlush) {
      this.flushWriteBuffer();
    }
  }
}
