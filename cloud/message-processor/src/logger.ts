import * as bunyan from "bunyan";

const logger = bunyan.createLogger({ name: "event-processor" });
export default logger;
