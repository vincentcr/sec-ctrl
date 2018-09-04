import * as path from "path";

import * as bunyan from "bunyan";

import config from "./config";

const logger = bunyan.createLogger({
  name: "sec-ctrl-local",
  level: config.get("logging").level,
  serializers: bunyan.stdSerializers
});

export type Logger = bunyan;

export default function createLogger(
  fname: string,
  otherProps: any = {}
): bunyan {
  const { name } = path.parse(fname);
  return logger.child({ module: name, ...otherProps });
}
