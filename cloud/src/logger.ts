import * as bunyan from "bunyan";
import config from "./config";

const logger = bunyan.createLogger({
  name: "cloud",
  level: config.get("logging").level,
  serializers: bunyan.stdSerializers
});
export default logger;

export function die(err: Error, ...args: any[]) {
  logger.fatal(err, ...args);
  process.exit(1);
}
