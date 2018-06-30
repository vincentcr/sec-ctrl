import * as bunyan from "bunyan";

const logger = bunyan.createLogger({
  name: "api",
  level: "debug",
  serializers: bunyan.stdSerializers
});
export default logger;

export function die(err: Error, ...args: any[]) {
  logger.fatal(err, ...args);
  process.exit(1);
}
