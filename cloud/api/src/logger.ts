import * as bunyan from "bunyan";

const logger = bunyan.createLogger({ name: "api", level: "debug" });
export default logger;
