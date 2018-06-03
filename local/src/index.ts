import * as awsIot from "aws-iot-device-sdk";

import { LocalSiteConnector } from "./localSiteConnector";
import { LocalSite } from "./localSite";
import { ServerMessage, ClientMessage } from "../../common/message";
import { Event, fromServerMessage } from "../../common/event";
import { UserCommand, toClientMessage } from "../../common/userCommand";
import { CloudConnector } from "./cloudConnector";

const STATUS_REFRESH_INTERVAL_MS = 1000 * 60 * 5;

async function main() {
  console.log("starting");

  const localSite = new LocalSite({
    port: 4025,
    hostname: "localhost",
    password: "mock123",
    statusRefreshIntervalMs: STATUS_REFRESH_INTERVAL_MS,
  });
  const cloudConnector = new CloudConnector({
    clientId: "test-sec-ctrl-1",
    dataDir: ".",
    host: "a1nto8ch8ason0.iot.us-east-1.amazonaws.com",
  });

  localSite.onMessage(msg => {
    const evt = fromServerMessage(msg);
    console.log("parsed msg:", msg, "=>", evt);
    cloudConnector.publishEvent(evt);
  });

  cloudConnector.onCommand((cmd: UserCommand) => {
    if (cmd.validUntil >= new Date()) {
      const msg = toClientMessage(cmd);
      console.log("received cmd:", cmd, "=>", msg);
      localSite.sendMessage(msg);
    } else {
      console.log("ignoring expired command:", cmd);
    }
  });

  await Promise.all([localSite.start(), cloudConnector.start()]);

  console.log("all systems go");
}

main()
  .then(() => {})
  .catch(err => {
    throw err;
  });

process.on("unhandledRejection", (reason, promise) => {
  console.log("unhandledRejection", reason);
  process.exit(1);
});
