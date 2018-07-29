import { EventEmitter } from "events";

import * as VError from "verror";

import { LocalConfig } from "./config";
import { ClientCode, ServerCode } from "./envisalink/codes";
import { ClientMessage, ServerMessage } from "./envisalink/message";
import { LocalSiteConnector } from "./localSiteConnector";
import createLogger, { Logger } from "./logger";
import { getLoginRes, LoginRes } from "./loginRes";

export class LocalSite {
  private readonly password: string;
  private readonly connector: LocalSiteConnector;
  private readonly emitter = new EventEmitter();
  private readonly statusRefreshIntervalMs: number;
  private readonly keepAliveIntervalMs: number;
  private loggedIn: boolean = false;
  private readonly logger: Logger;

  constructor(config: LocalConfig) {
    this.password = config.password;
    this.emitter = new EventEmitter();
    this.connector = new LocalSiteConnector(config.port, config.hostname);
    this.statusRefreshIntervalMs = config.statusRefreshIntervalMs;
    this.keepAliveIntervalMs = config.keepAliveIntervalMs;
    this.logger = createLogger(__filename, {
      tpiServer: config.hostname + ":" + config.port
    });
  }

  async start() {
    this.connector.onMessage(msg => this.processMessage(msg));
    this.connector.start();

    setInterval(() => {
      if (this.loggedIn) {
        this.sendMessage(new ClientMessage(ClientCode.StatusReport));
      }
    }, this.statusRefreshIntervalMs);

    setInterval(() => {
      if (this.loggedIn) {
        this.sendMessage(new ClientMessage(ClientCode.Poll));
      }
    }, this.keepAliveIntervalMs);
  }

  onMessage(listener: (msg: ServerMessage) => void) {
    this.emitter.on("message", listener);
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

  async sendMessage(msg: ClientMessage) {
    await this.connector.sendMessage(msg);
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
