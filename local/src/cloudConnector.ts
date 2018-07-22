import { EventEmitter } from "events";
import * as path from "path";

import * as awsIot from "aws-iot-device-sdk";
import * as levelStore from "mqtt-level-store";

import { SiteEvent } from "../../common/siteEvent";
import {
  userCommandfromJSON,
  UserCommandWithExpiration
} from "../../common/userCommand";
import { CloudConfig } from "./config";
import createLogger, { Logger } from "./logger";

export class CloudConnector {
  private readonly clientId: string;
  private readonly host: string;
  private readonly dataDir: string;
  private readonly emitter: EventEmitter;
  private readonly logger: Logger;
  private device?: awsIot.device;

  constructor(dataDir: string, config: CloudConfig) {
    this.dataDir = path.join(dataDir, config.clientId);
    this.clientId = config.clientId;
    this.host = config.host;
    this.logger = createLogger(__filename, { thingId: config.clientId });
    this.emitter = new EventEmitter();
  }

  async start() {
    const storeManager = levelStore(path.join(this.dataDir, "mqtt-store"));

    this.device = new awsIot.device({
      clientId: this.clientId,
      host: this.host,
      keyPath: path.join(this.dataDir, "certs", "key.pem"),
      certPath: path.join(this.dataDir, "certs", "crt.pem"),
      caPath: path.join(this.dataDir, "certs", "ca.pem"),
      incomingStore: storeManager.incoming,
      outgoingStore: storeManager.outgoing
    });

    this.device.on("connect", () => {
      this.logger.info("connection established");
      this.device!.subscribe(this._mkTopic("commands"));
    });
    this.device.on("close", () => {
      this.logger.info("connection closed");
    });
    this.device.on("error", err => {
      this.logger.error("connection error:", err);
    });

    this.device.on("message", this._parseIncomingMessage.bind(this));

    return new Promise(resolve => {
      this.device!.once("connect", () => {
        resolve();
      });
    });
  }

  private _mkTopic(name: string) {
    return `sec-ctrl/${this.clientId}/${name}`;
  }

  publishEvent(evt: SiteEvent) {
    if (this.device == null) {
      throw new Error("device not connected. call start() first");
    }
    this.logger.debug(evt, "publish to ", this._mkTopic("events"));
    this.device.publish(
      this._mkTopic("events"),
      JSON.stringify(evt),
      { qos: 1 },
      err => {
        if (err != null) {
          this.logger.debug("failed to publish message: ", err);
        }
      }
    );
  }

  _parseIncomingMessage(topic: string, data: Buffer) {
    this.logger.debug({ topic, data }, "incoming message");

    if (topic !== this._mkTopic("commands")) {
      this.logger.error({ topic, data }, "received unexpected message");
      return;
    }

    const cmd = userCommandfromJSON(data.toString());

    this.emitter.emit("command", cmd);
  }

  onCommand(listener: (cmd: UserCommandWithExpiration) => void) {
    this.emitter.on("command", listener);
  }
}
