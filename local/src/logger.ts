import * as bunyan from "bunyan";

const logger = bunyan.createLogger({ name: "event-processor", level: "debug" });
export default logger;
