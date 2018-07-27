import { APIGatewayEvent, Context } from "aws-lambda";

import * as api from "./api/lambda";
import * as events from "./events";
import { die } from "./logger";

export function handler(
  event: APIGatewayEvent | events.SecCtrlIoTPayload,
  context: Context
) {
  if ("thingId" in event) {
    // iot event
    events.handler(event, context);
  } else if ("headers" in event) {
    // api request
    api.handler(event, context);
  } else {
    // not supposed to happen
    die(new Error("Unexpected event: " + JSON.stringify(event)));
  }
}

process.on("uncaughtException", err => {
  die(err, "uncaught exception");
});
process.on("unhandledRejection", err => {
  die(err, "unhandled promise rejection");
});
