import { EventEmitter } from "events";

import * as VError from "verror";

import { LocalConfig } from "./config";
import { ClientCode, ServerCode } from "./envisalink/codes";
import { ClientMessage, ServerMessage } from "./envisalink/message";
import { LocalSiteConnectionManager } from "./localSiteConnectionManager";
import createLogger, { Logger } from "./logger";
import { getLoginRes, LoginRes } from "./loginRes";

const SEP = new Buffer("\r\n");

export class LocalSiteStateManager {
  private readonly password: string;
  private readonly connectionManager: LocalSiteConnectionManager;
  private readonly emitter = new EventEmitter();
  private readonly statusRefreshIntervalMs: number;
  private readonly keepAliveIntervalMs: number;
  private loggedIn: boolean = false;
  private readonly logger: Logger;
  private messageParser = new MessageParser();

  constructor(
    config: LocalConfig,
    connectionManager: LocalSiteConnectionManager
  ) {
    this.password = config.password;
    this.connectionManager = connectionManager;
    this.statusRefreshIntervalMs = config.statusRefreshIntervalMs;
    this.keepAliveIntervalMs = config.keepAliveIntervalMs;
    this.logger = createLogger(__filename, {
      tpiServer: config.hostname + ":" + config.port
    });
    this.emitter = new EventEmitter();
  }

  async start() {
    this.connectionManager.onData(msg => this.processData(msg));

    if (this.statusRefreshIntervalMs > 0) {
      setInterval(() => {
        if (this.loggedIn) {
          this.sendMessage(new ClientMessage(ClientCode.StatusReport));
        }
      }, this.statusRefreshIntervalMs);
    }

    if (this.keepAliveIntervalMs > 0) {
      setInterval(() => {
        if (this.loggedIn) {
          this.sendMessage(new ClientMessage(ClientCode.Poll));
        }
      }, this.keepAliveIntervalMs);
    }
  }

  onMessage(listener: (msg: ServerMessage) => void) {
    this.emitter.on("message", listener);
  }

  private processData(data: Buffer) {
    const messages = this.messageParser.consume(data);
    for (const msg of messages) {
      this.processMessage(msg);
    }
  }

  private processMessage(msg: ServerMessage) {
    this.logger.debug("received", msg.toString());
    switch (msg.code) {
      case ServerCode.LoginRes:
        this.processLoginRequest(msg);
        break;
      case ServerCode.Ack:
        // do nothing
        break;
      default:
        this.emitter.emit("message", msg);
        break;
    }
  }

  sendMessage(msg: ClientMessage) {
    const buf = msg.encode();
    this.connectionManager.sendData(buf);
    this.connectionManager.sendData(SEP);
  }

  private processLoginRequest(msg: ServerMessage) {
    const loginRes = getLoginRes(msg.data!.toString());
    switch (loginRes) {
      case LoginRes.Success:
        this.loggedIn = true;
        this.requestSiteRefresh();
        break;
      case LoginRes.Timeout:
      case LoginRes.LoginRequest:
        const loginMsg = new ClientMessage(
          ClientCode.NetworkLogin,
          Buffer.from(this.password)
        );
        this.sendMessage(loginMsg);
        break;
      case LoginRes.Failure:
        throw new VError(
          { name: "PasswordRejected" },
          "Panic! Password rejected"
        );
      default:
        throw new VError(
          { name: "UnexpectedLogingResult", info: { message: msg.toString() } },
          "Unexpected login result"
        );
    }
  }

  private requestSiteRefresh() {
    if (this.loggedIn) {
      this.sendMessage(new ClientMessage(ClientCode.StatusReport));
    }
  }
}

export class MessageParser {
  private buffer = Buffer.alloc(0);

  consume(data: Buffer): ServerMessage[] {
    this.buffer = Buffer.concat([this.buffer, data]);

    if (!endsWithCompleteMessage(data)) {
      return [];
    }

    const messages = decodeMessages(this.buffer);
    this.buffer = Buffer.alloc(0);

    return messages;
  }
}

function endsWithCompleteMessage(buf: Buffer) {
  return SEP.compare(buf, buf.length - SEP.length) === 0;
}

function decodeMessages(buf: Buffer) {
  return splitBufferBySep(buf, SEP).map(msgBuf => ServerMessage.decode(msgBuf));
}

function splitBufferBySep(buf: Buffer, sep: Buffer): Buffer[] {
  let idx = 0;

  const msgBufs: Buffer[] = [];

  while (idx < buf.length) {
    const nextIdx = buf.indexOf(sep, idx);
    if (nextIdx < 0) {
      throw new VError(
        { name: "MissingCrLf", info: { idx, buf, nextIdx } },
        "Invalid data: CR/LF not found in buffer"
      );
      const msgBuf = buf.slice(idx, nextIdx);
      msgBufs.push(msgBuf);
      idx = nextIdx + SEP.length;
    }
  }
  return msgBufs;
}
