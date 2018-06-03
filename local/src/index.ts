import * as awsIot from "aws-iot-device-sdk";

import { loadConfig } from "./config";
import { LocalSiteConnector } from "./localSiteConnector";
import { LocalSite } from "./localSite";
import { ServerMessage, ClientMessage } from "../../common/message";
import { Event, fromServerMessage } from "../../common/event";
import { UserCommand, toClientMessage } from "../../common/userCommand";
import { CloudConnector } from "./cloudConnector";

async function main() {
  console.log("starting");

  const config = loadConfig();
  const localSite = new LocalSite(config.local);
  const cloudConnector = new CloudConnector(config.cloud);

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