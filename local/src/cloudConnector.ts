import * as path from "path";
import { EventEmitter } from "events";

import * as dateFns from "date-fns";
import * as awsIot from "aws-iot-device-sdk";
const levelStore = require("mqtt-level-store");

import { Event } from "../../common/event";
import { UserCommand, fromJSON } from "../../common/command";

interface connectParams {
  clientId: string;
  dataDir: string;
  host: string;
}

export class CloudConnector {
  private readonly clientId: string;
  private readonly host: string;
  private readonly dataDir: string;
  private readonly emitter: EventEmitter;
  private device?: awsIot.device;

  constructor({ clientId, host, dataDir }: connectParams) {
    this.clientId = clientId;
    this.host = host;
    this.dataDir = dataDir;
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
      outgoingStore: storeManager.outgoing,
    });

    this.device.on("connect", () => {
      this.debug("connection established");
      this.device!.subscribe(this._mkTopic("commands"));
    });
    this.device.on("close", () => {
      this.debug("connection closed");
    });
    this.device.on("error", err => {
      this.debug("connection error:", err);
    });

    this.device.on("message", this._parseIncomingMessage.bind(this));

    return new Promise(resolve => {
      this.device!.once("connect", function() {
        resolve();
      });
    });
  }
  private _mkTopic(name: string) {
    return `sec-ctrl/${this.clientId}/${name}`;
  }

  publishEvent(evt: Event) {
    if (this.device == null) {
      throw new Error("device not connected. call start() first");
    }
    this.device.publish(
      this._mkTopic("events"),
      JSON.stringify(evt),
      { qos: 1 },
      err => {
        if (err != null) {
          this.debug("failed to publish message: ", err);
        }
      },
    );
  }

  _parseIncomingMessage(topic: string, payload: Buffer) {
    this.debug("incoming message: ", topic, payload);

    if (topic != this._mkTopic("commands")) {
      this.debug("received unexpected message:", topic, payload);
    }

    const cmd = fromJSON(payload.toString());
    this.emitter.emit("command", cmd);
  }

  onCommand(listener: (cmd: UserCommand) => void) {
    this.emitter.on("command", listener);
  }

  private debug(...msgs: any[]) {
    const ts = dateFns.format(new Date(), "YYYY-MM-DD HH:mm:ss.SSS");
    console.log(`[CloudConnector ${ts}]:`, ...msgs);
  }
}
