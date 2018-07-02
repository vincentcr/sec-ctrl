import { VError } from "verror";
import createApp from "./app";
import logger, { die } from "../logger";
import Services from "../services";

const { PORT = 3000 } = process.env;

process.env.AWS_SDK_LOAD_CONFIG = "true";

async function main() {
  const services = await Services.create();
  const app = await createApp(services);
  app.listen(PORT, () => {
    logger.info("listening to PORT", PORT);
  });
}

main().catch(err => {
  die(new VError({ cause: err }, "Unhandled promise rejection"));
});
