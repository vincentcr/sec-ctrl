import * as awsIot from "aws-iot-device-sdk";

import { Event, fromServerMessage } from "../../common/event";
import { ClientMessage, ServerMessage } from "../../common/message";
import { toClientMessage, UserCommand } from "../../common/userCommand";
import { CloudConnector } from "./cloudConnector";
import { loadConfig } from "./config";
import { LocalSite } from "./localSite";
import { LocalSiteConnector } from "./localSiteConnector";
import logger from "./logger";

async function main() {
  logger.debug("starting");

  const config = loadConfig();
  const localSite = new LocalSite(config.local);
  const cloudConnector = new CloudConnector(config.cloud);

  localSite.onMessage(msg => {
    const evt = fromServerMessage(msg);
    logger.debug("parsed msg:", msg, "=>", evt);
    cloudConnector.publishEvent(evt);
  });

  cloudConnector.onCommand((cmd: UserCommand) => {
    if (cmd.validUntil >= new Date()) {
      const msg = toClientMessage(cmd);
      logger.debug("received cmd:", cmd, "=>", msg);
      localSite.sendMessage(msg);
    } else {
      logger.debug("ignoring expired command:", cmd);
    }
  });

  await Promise.all([localSite.start(), cloudConnector.start()]);

  logger.debug("all systems go");
}

main()
  .then(() => undefined)
  .catch(err => {
    throw err;
  });

process.on("unhandledRejection", (reason, promise) => {
  logger.error("unhandledRejection", reason);
  process.exit(1);
});
