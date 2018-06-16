import * as path from "path";

import * as bunyan from "bunyan";

const logger = bunyan.createLogger({ name: "event-processor", level: "debug" });

export default function createLogger(fname: string) {
  const { name } = path.parse(fname);
  return logger.child({ module: name });
}
