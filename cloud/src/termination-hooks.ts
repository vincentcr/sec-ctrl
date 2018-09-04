import * as _ from "lodash";
import { Logger } from "./logger";
import { Services } from "./services";

export default _.once((services: Services) => {
  const { logger } = services;
  process.on("uncaughtException", err => {
    die(logger, err, "uncaught exception");
  });
  process.on("unhandledRejection", err => {
    die(logger, err, "unhandled promise rejection");
  });
});

function die(logger: Logger, err: Error, ...params: any[]) {
  logger.fatal(err, ...params);
  process.exit(1);
}
