import createLogger from "./logger";

import { CloudConnector } from "./cloudConnector";
import config from "./config";
import * as clientMessageBuilder from "./envisalink/clientMessageBuilder";
import * as eventBuilder from "./envisalink/eventBuilder";
import { LocalSite } from "./localSite";

const logger = createLogger(__filename);

async function main() {
  logger.debug("starting");

  logger.debug(config.getAll(), "config");
  const localSite = new LocalSite(config.get("local"));
  const cloudConnector = new CloudConnector(
    config.get("dataDir"),
    config.get("cloud")
  );

  localSite.on("message", msg => {
    const evt = eventBuilder.fromServerMessage(msg);
    cloudConnector.publishEvent(evt);
  });

  cloudConnector.onCommand(cmd => {
    if (cmd.expiresAt >= new Date()) {
      const msg = clientMessageBuilder.fromUserCommand(cmd);
      logger.debug("[cloud] received cmd:", cmd, "=>", msg);
      localSite.sendMessage(msg);
    } else {
      logger.debug("ignoring expired command:", cmd);
    }
  });

  await Promise.all([localSite.start(), cloudConnector.start()]);

  logger.debug("all systems go");
}

function die(err: any, msg: string) {
  logger.fatal(err, msg);
  process.exit(1);
}

process.on("unhandledRejection", reason => {
  die(reason, "unhandledRejection");
});

process.on("uncaughtException", err => {
  die(err, "uncaughtException");
});

main().catch(err => {
  die(err, "unhandled exception");
});
