import { EventEmitter } from "events";
import { Socket } from "net";

import * as VError from "verror";

import {
  ClientMessage,
  ServerMessage
} from "../../local/src/envisalink/message";
import createLogger from "./logger";
const logger = createLogger(__filename);

const SEP = new Buffer("\r\n");
const MAX_BACKOFF_EXP = 16; // ~= max 1 minute backoff
const MAX_ATTEMPTS = 1 << 16;

export class LocalSiteConnector {
  private readonly port: number;
  private readonly hostname: string;
  private readonly socket = new Socket();
  private readonly emitter = new EventEmitter();
  private connAttempts = 0;
  private buf = Buffer.alloc(0);

  constructor(port: number, hostname: string) {
    this.port = port;
    this.hostname = hostname;
  }

  start() {
    this.socket.on("data", (data: Buffer) => {
      logger.debug("received:", data);
      this.processData(data);
    });

    this.socket.on("close", () => {
      logger.warn("socket was closed");
      this.waitAndReconnect();
    });

    this.socket.on("error", err => {
      logger.error("Socket error:", err);
    });

    this.socket.on("connect", () => {
      this.connAttempts = 0;
      logger.info(`Connected to ${this.hostname}:${this.port}`);
    });

    this.connect();
  }

  private connect() {
    if (this.connAttempts >= MAX_ATTEMPTS) {
      throw new VError(
        {
          name: "MaxConnectionAttemptsReached",
          info: { attempts: this.connAttempts }
        },
        "Maximum connection attempts reach, givin up"
      );
    }
    this.connAttempts++;
    this.socket.connect(
      this.port,
      this.hostname
    );
  }

  private waitAndReconnect() {
    const backoff = 1 << Math.min(MAX_BACKOFF_EXP, this.connAttempts);
    const delay = 500 + Math.random() * backoff;
    logger.info(
      `Disconnected, sleeping for ${delay} millis before attempting reconnect...`
    );
    setTimeout(() => this.connect(), delay);
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
      throw new VError(
        { name: "MissingCrLf", info: { idx, buf, nextIdx } },
        "Invalid data: CR/LF not found in buffer"
      );
    }
    const msgBuf = buf.slice(idx, nextIdx);
    yield msgBuf;
    idx = nextIdx + SEP.length;
  }
}
