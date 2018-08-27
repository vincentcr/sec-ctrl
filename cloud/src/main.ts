import { APIGatewayEvent, Context } from "aws-lambda";
import * as _ from "lodash";

import * as api from "./api/lambda";
import * as events from "./events";
import { Logger } from "./logger";
import { getServicesInstance, Services } from "./services";

export async function handler(
  event: APIGatewayEvent | events.SecCtrlIoTPayload,
  context: Context
) {
  const services = await getServicesInstance();
  deathHooks(services);

  if ("thingId" in event) {
    // iot event
    await events.handler(services, event, context);
  } else if ("headers" in event) {
    // api request
    await api.handler(services, event, context);
  } else {
    // not supposed to happen
    throw new Error("Unexpected event: " + JSON.stringify(event));
  }
}

const deathHooks = _.once((services: Services) => {
  const { logger } = services;
  process.on("uncaughtException", err => {
    die(logger, err, "uncaught exception");
  });
  process.on("unhandledRejection", err => {
    die(logger, err, "unhandled promise rejection");
  });
});

function die(logger: Logger, err: Error, ...params: any[]) {
  logger.fatal(err, ...params);
  process.exit(1);
}
