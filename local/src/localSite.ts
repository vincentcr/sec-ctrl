import { LocalConfig } from "./config";
import { ClientMessage, ServerMessage } from "./envisalink/message";
import {
  createLocalSiteConnectionManager,
  LocalSiteConnectionManager
} from "./localSiteConnectionManager";
import { LocalSiteStateManager } from "./localSiteStateManager";

export class LocalSite {
  private readonly connectionManager: LocalSiteConnectionManager;
  private readonly stateManager: LocalSiteStateManager;

  constructor(config: LocalConfig) {
    this.connectionManager = new LocalSiteConnectionManager(
      config.port,
      config.hostname
    );

    this.stateManager = new LocalSiteStateManager(
      config,
      this.connectionManager
    );
  }

  async start() {
    this.connectionManager.start();
    this.stateManager.start();
  }

  async sendMessage(msg: ClientMessage) {
    this.stateManager.sendMessage(msg);
  }

  async onMessage(listener: (msg: ServerMessage) => void) {
    this.stateManager.onMessage(listener);
  }
}
