import { VError } from "verror";
import { getServicesInstance } from "../services";
import terminationHooks from "../termination-hooks";
import createApp from "./app";

process.env.AWS_SDK_LOAD_CONFIG = "true";

async function start() {
  const services = await getServicesInstance();
  terminationHooks(services);
  const app = await createApp(services);
  const port = services.config.get("http").port;
  app.listen(port, () => {
    services.logger.info("listening to port", port);
  });
}

start();
