import createLogger from "./logger";

import { fromServerMessage } from "../../common/event";
import { toClientMessage, UserCommand } from "../../common/userCommand";
import { CloudConnector } from "./cloudConnector";
import { loadConfig } from "./config";
import { LocalSite } from "./localSite";

const logger = createLogger(__filename);

async function main() {
  logger.debug("starting");

  const config = loadConfig();
  logger.debug(config, "config");
  const localSite = new LocalSite(config.local);
  const cloudConnector = new CloudConnector(config.dataDir, config.cloud);

  localSite.onMessage(msg => {
    const evt = fromServerMessage(msg);
    cloudConnector.publishEvent(evt);
  });

  cloudConnector.onCommand((cmd: UserCommand) => {
    if (cmd.validUntil >= new Date()) {
      const msg = toClientMessage(cmd);
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
