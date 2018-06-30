import * as path from "path";

import * as bunyan from "bunyan";

const logger = bunyan.createLogger({
  name: "event-processor",
  level: "debug",
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
