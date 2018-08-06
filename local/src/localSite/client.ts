import { EventEmitter } from "events";

import * as VError from "verror";

import { LocalConfig } from "../config";
import { ClientCode, ServerCode } from "../envisalink/codes";
import { ClientMessage, ServerMessage } from "../envisalink/message";
import createLogger, { Logger } from "../logger";
import {
  BufferedMessageReaderWriter,
  MessageHandler
} from "./bufferedMessageReaderWriter";
import { LoginResponse, parseLoginResponse } from "./loginResponse";

export class Client {
  private readonly logger: Logger;
  private readonly password: string;
  private loggedIn: boolean = false;
  private emitter: EventEmitter = new EventEmitter();
  private readonly statusRefreshIntervalMs: number;
  private statusRefreshInterval?: NodeJS.Timer;
  private readonly keepAliveIntervalMs: number;
  private keepAliveInterval?: NodeJS.Timer;

  constructor(
    config: LocalConfig,
    private readonly messageStream: BufferedMessageReaderWriter
  ) {
    this.password = config.password;
    this.statusRefreshIntervalMs = config.statusRefreshIntervalMs;
    this.keepAliveIntervalMs = config.keepAliveIntervalMs;
    this.logger = createLogger(__filename, {
      tpiServer: config.hostname + ":" + config.port
    });

    this.messageStream.on("message", msg => {
      this.processMessage(msg);
    });
  }

  async start() {
    if (this.statusRefreshIntervalMs > 0) {
      this.statusRefreshInterval = setInterval(() => {
        this.requestSiteRefresh();
      }, this.statusRefreshIntervalMs);
    }

    if (this.keepAliveIntervalMs > 0) {
      this.keepAliveInterval = setInterval(() => {
        this.poll();
      }, this.keepAliveIntervalMs);
    }
  }

  stop() {
    if (this.statusRefreshInterval != null) {
      clearInterval(this.statusRefreshInterval);
    }
    if (this.keepAliveInterval != null) {
      clearInterval(this.keepAliveInterval);
    }
    this.loggedIn = false;
  }

  on(event: "message", handler: MessageHandler) {
    this.emitter.on(event, handler);
  }

  sendMessage(msg: ClientMessage) {
    this.logger.debug("sending: %s", msg);
    this.messageStream.sendMessage(msg);
  }

  private processMessage(msg: ServerMessage) {
    this.logger.debug("received: %s", msg);

    if (msg.code === ServerCode.Ack) {
      this.logger.trace("received ack");
    } else if (msg.code === ServerCode.LoginResponse) {
      this.processLoginResponse(msg);
    } else {
      this.emitter.emit("message", msg);
    }
  }

  private processLoginResponse(msg: ServerMessage) {
    const loginResponse = parseLoginResponse(msg.data);
    switch (loginResponse) {
      case LoginResponse.Success:
        this.loggedIn = true;
        this.requestSiteRefresh();
        break;
      case LoginResponse.Timeout:
      case LoginResponse.LoginRequest:
        const loginMsg = new ClientMessage(
          ClientCode.NetworkLogin,
          Buffer.from(this.password)
        );
        this.sendMessage(loginMsg);
        break;
      case LoginResponse.Failure:
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

  private poll() {
    if (this.loggedIn) {
      this.sendMessage(new ClientMessage(ClientCode.Poll));
    }
  }

  private requestSiteRefresh() {
    if (this.loggedIn) {
      this.sendMessage(new ClientMessage(ClientCode.StatusReport));
    }
  }
}
