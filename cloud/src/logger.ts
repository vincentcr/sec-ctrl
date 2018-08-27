import * as Logger from "bunyan";
import { Config } from "./config";

export { Logger };

export function createLogger(config: Config) {
  return Logger.createLogger({
    name: "cloud",
    level: config.get("logging").level,
    serializers: Logger.stdSerializers
  });
}
