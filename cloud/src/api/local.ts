import { VError } from "verror";
import config from "../config";
import logger, { die } from "../logger";
import Services from "../services";
import createApp from "./app";

process.env.AWS_SDK_LOAD_CONFIG = "true";

async function main() {
  const services = await Services.getInstance();
  const app = await createApp(services);
  const port = config.get("http").port;
  app.listen(port, () => {
    logger.info("listening to port", port);
  });
}

main().catch(err => {
  die(new VError({ cause: err }, "Unhandled promise rejection"));
});
