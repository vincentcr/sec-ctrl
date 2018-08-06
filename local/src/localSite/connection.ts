import { EventEmitter } from "events";
import { Socket } from "net";

import * as VError from "verror";

import { LocalConfig } from "../config";
import createLogger from "../logger";

const logger = createLogger(__filename);

type DataHandler = (data: Buffer) => void;
type ConnectedHandler = () => void;

export interface Connection {
  start(): Promise<void>;
  stop(): Promise<void>;
  connected(): boolean;
  on(event: "data", handler: DataHandler): void;
  on(event: "connected", handler: ConnectedHandler): void;
  once(event: "data", handler: DataHandler): void;
  sendData(data: Buffer): void;
}

export function createConnection(config: LocalConfig): Connection {
  return new ConnectionImpl(config);
}

class ConnectionImpl {
  private readonly port: number;
  private readonly hostname: string;
  private readonly socket = new Socket();
  private readonly emitter = new EventEmitter();
  private readonly maxBackoffExponent: number;
  private readonly maxReconnectAttemts: number;

  // tslint:disable-next-line:variable-name
  private _connected = false;
  private connAttempts = 0;
  private waitAndReconnectTimer?: NodeJS.Timer;

  constructor(config: LocalConfig) {
    const { port, hostname, maxBackoffExponent, maxReconnectAttemts } = config;
    this.port = port;
    this.hostname = hostname;
    this.maxBackoffExponent = maxBackoffExponent;
    this.maxReconnectAttemts = maxReconnectAttemts;
  }

  async start() {
    this.socket.on("data", (data: Buffer) => {
      logger.trace("received:", data);
      this.emitter.emit("data", data);
    });

    this.socket.on("close", () => {
      logger.warn("Socket was closed");
      this.waitAndReconnect();
    });

    this.socket.on("error", err => {
      logger.error(err, "Socket error");
    });

    this.socket.on("connect", () => {
      logger.info(`Connected to ${this.hostname}:${this.port}`);
      this.connAttempts = 0;
      this._connected = true;
      this.emitter.emit("connected");
    });

    const connectionPromise = new Promise<void>((resolve, reject) => {
      this.socket.once("connect", resolve);
    });

    this.connect();

    return connectionPromise;
  }

  stop(): Promise<void> {
    if (this.waitAndReconnectTimer != null) {
      clearTimeout(this.waitAndReconnectTimer);
    }

    this.socket.removeAllListeners();
    const onceEnded = new Promise<void>(resolve => {
      this.socket.once("end", () => {
        this.socket.unref();
        resolve();
      });
    });
    this.socket.end();
    return onceEnded;
  }

  private connect() {
    if (this.connAttempts >= this.maxReconnectAttemts) {
      throw new VError(
        {
          name: "MaxConnectionAttemptsReached",
          info: { attempts: this.connAttempts }
        },
        "Maximum connection attempts reach, givin up"
      );
    }
    this.connAttempts++;
    logger.debug("Connection attempt #%d", this.connAttempts);
    this.socket.connect(
      this.port,
      this.hostname
    );
  }

  private waitAndReconnect() {
    const backoff = 1 << Math.min(this.maxBackoffExponent, this.connAttempts);
    const delay = Math.round((125 + Math.random() * backoff) * 100) / 100;
    logger.info(
      "Disconnected, sleeping for %d millis before attempting reconnect...",
      delay
    );
    this.waitAndReconnectTimer = setTimeout(() => {
      this.waitAndReconnectTimer = undefined;
      this.connect();
    }, delay);
  }

  connected() {
    return this._connected;
  }

  on(event: "data" | "connected", handler: DataHandler | ConnectedHandler) {
    this.emitter.on(event, handler);
  }

  once(event: "data", handler: DataHandler) {
    this.emitter.once(event, handler);
  }

  sendData(data: Buffer): void {
    logger.trace("sending:", data);

    this.socket.write(data, (err?: Error) => {
      if (err != null) {
        logger.error(err, "error while trying to write to socket");
      }
    });
  }
}
