import { LocalConfig } from "../config";
import { ClientMessage, ServerMessage } from "../envisalink/message";
import { createBufferedMessageReaderWriter } from "./bufferedMessageReaderWriter";
import { Client } from "./client";
import { Connection, createConnection } from "./Connection";

export class LocalSite {
  private readonly connection: Connection;
  private readonly client: Client;

  constructor(config: LocalConfig) {
    this.connection = createConnection(config);
    const msgStream = createBufferedMessageReaderWriter({
      connection: this.connection,
      config
    });
    this.client = new Client(config, msgStream);
  }

  async start() {
    await this.connection.start();
    this.client.start();
  }

  async stop() {
    await this.connection.stop();
    this.client.stop();
  }

  async sendMessage(msg: ClientMessage) {
    this.client.sendMessage(msg);
  }

  on(event: "message", listener: (msg: ServerMessage) => void) {
    this.client.on(event, listener);
  }
}
