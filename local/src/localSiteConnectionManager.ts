import { EventEmitter } from "events";
import { Socket } from "net";

import * as VError from "verror";

import createLogger from "./logger";

const logger = createLogger(__filename);

const MAX_ATTEMPTS = 1 << 10;
const MAX_BACKOFF_EXP = 16;
const MAX_WRITE_BUFFER_SIZE = 1 << 16;

type DataHandler = (data: Buffer) => void;

export interface LocalSiteConnectionManager {
  start(): void;
  onData(handler: DataHandler): void;
  sendData(data: Buffer): void;
}

export function createLocalSiteConnectionManager(
  port: number,
  hostname: string
): LocalSiteConnectionManager {
  return new LocalSiteConnectionManagerImpl(port, hostname);
}

class LocalSiteConnectionManagerImpl {
  private readonly port: number;
  private readonly hostname: string;
  private readonly socket = new Socket();
  private readonly emitter = new EventEmitter();
  private connected = false;
  private connAttempts = 0;
  private buf = Buffer.alloc(0);
  private writeBuffer = Buffer.alloc(0);

  constructor(port: number, hostname: string) {
    this.port = port;
    this.hostname = hostname;
  }

  start() {
    this.socket.on("data", (data: Buffer) => {
      logger.debug("received:", data);
      this.emitter.emit("data", data);
    });

    this.socket.on("close", () => {
      logger.warn("socket was closed");
      this.waitAndReconnect();
    });

    this.socket.on("error", err => {
      logger.error("Socket error:", err);
    });

    this.socket.on("connect", () => {
      logger.info(`Connected to ${this.hostname}:${this.port}`);
      this.connAttempts = 0;
      this.connected = true;
      this.consumeWriteBuffer();
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

  onData(handler: DataHandler) {
    this.emitter.on("data", handler);
  }

  sendData(data: Buffer): void {
    if (this.writeBuffer.length + data.length > MAX_WRITE_BUFFER_SIZE) {
      throw new VError(
        {
          name: "MaxWriteBufferSizeExceeded",
          info: { writeBuffer: this.writeBuffer.length, data: data.length }
        },
        "Maximum write buffer size exceeded"
      );
    }
    this.writeBuffer = Buffer.concat([this.writeBuffer, data]);
    this.consumeWriteBuffer();
  }

  private consumeWriteBuffer() {
    if (!this.connected) {
      return;
    }

    const data = this.writeBuffer;
    this.writeBuffer = Buffer.alloc(0);

    this.socket.write(data, (err?: Error) => {
      if (err != null) {
        logger.error(err, "error while trying to write to socket");
      }
    });
  }
}
