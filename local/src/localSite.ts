import { EventEmitter } from "events";

import { ServerCode, ClientCode } from "../../common/codes";
import { ServerMessage, ClientMessage } from "../../common/message";
import { LoginRes, getLoginRes } from "./loginRes";
import { LocalSiteConnector } from "./localSiteConnector";
import { LocalConfig } from "./config";

export class LocalSite {
  private readonly password: string;
  private readonly connector: LocalSiteConnector;
  private readonly emitter = new EventEmitter();
  private readonly statusRefreshIntervalMs: number;
  private readonly keepAliveIntervalMs: number;
  private loggedIn: boolean = false;

  constructor(config: LocalConfig) {
    this.password = config.password;
    this.emitter = new EventEmitter();
    this.connector = new LocalSiteConnector(config.port, config.hostname);
    this.statusRefreshIntervalMs = config.statusRefreshIntervalMs;
    this.keepAliveIntervalMs = config.keepAliveIntervalMs;
  }

  async start() {
    this.connector.onMessage(msg => this.processMessage(msg));
    await this.connector.start();

    setInterval(() => {
      if (this.loggedIn) {
        this.sendMessage(new ClientMessage(ClientCode.StatusReport));
      }
    }, this.statusRefreshIntervalMs);

    setInterval(() => {
      if (this.loggedIn) {
        this.sendMessage(new ClientMessage(ClientCode.Poll));
      }
    }, KEEP_ALIVE_INTERVAL_MS);
  }

  onMessage(listener: (msg: ServerMessage) => void) {
    this.emitter.on("message", listener);
  }

  private processMessage(msg: ServerMessage) {
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
          Buffer.from(this.password),
        );
        this.sendMessage(loginMsg);
        break;
      case LoginRes.Failure:
        throw new Error("Panic! Password rejected");
      default:
        throw new Error("unknown login res: " + msg.data);
    }
  }

  private requestSiteRefresh() {
    if (this.loggedIn) {
      this.sendMessage(new ClientMessage(ClientCode.StatusReport));
    }
  }
}
