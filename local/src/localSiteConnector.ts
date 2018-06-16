import { EventEmitter } from "events";
import { Socket } from "net";

import { ClientMessage, ServerMessage } from "../../common/message";
import createLogger from "./logger";
const logger = createLogger(__filename);

const SEP = new Buffer("\r\n");

export class LocalSiteConnector {
  private readonly port: number;
  private readonly hostname: string;
  private readonly socket = new Socket();
  private readonly emitter = new EventEmitter();
  private buf = Buffer.alloc(0);

  constructor(port: number, hostname: string) {
    this.port = port;
    this.hostname = hostname;
  }

  async start() {
    this.socket.on("data", (data: Buffer) => {
      logger.debug("received:", data);
      this.processData(data);
    });

    return new Promise(resolve => {
      this.socket.connect(
        this.port,
        this.hostname,
        () => {
          logger.debug(`connected to ${this.hostname}:${this.port}`);
          resolve();
        }
      );
    });
  }

  async sendMessage(msg: ClientMessage) {
    const buf = msg.encode();
    await this.write(buf);
    await this.write(SEP);
  }

  private async write(buf: Buffer) {
    return new Promise((resolve, reject) => {
      this.socket.write(buf, (err?: Error) => {
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  onMessage(listener: (msg: ServerMessage) => void) {
    this.emitter.on("message", listener);
  }

  private processData(data: Buffer) {
    this.buf = Buffer.concat([this.buf, data]);

    if (hasEndOfMessage(data)) {
      this.decodeAndEmitMessages();
      this.buf = Buffer.alloc(0);
    }
  }

  private decodeAndEmitMessages() {
    for (const msg of decodeMessages(this.buf)) {
      this.emitter.emit("message", msg);
    }
  }
}

function hasEndOfMessage(data: Buffer) {
  return SEP.compare(data, data.length - SEP.length) === 0;
}

function* decodeMessages(buf: Buffer) {
  for (const msgBuf of splitBufferBySep(buf)) {
    yield ServerMessage.decode(msgBuf);
  }
}

function* splitBufferBySep(buf: Buffer) {
  let idx = 0;

  while (idx < buf.length) {
    const nextIdx = buf.indexOf(SEP, idx);
    if (nextIdx < 0) {
      throw new Error(
        `Invalid data: crlf not found after index ${idx} in ${buf}`
      );
    }
    const msgBuf = buf.slice(idx, nextIdx);
    yield msgBuf;
    idx = nextIdx + SEP.length;
  }
}
