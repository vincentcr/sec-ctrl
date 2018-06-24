import { APIGatewayEvent, Context, DynamoDBStreamEvent } from "aws-lambda";

import * as events from "./events/index";
import * as api from "./api/lambda";
import { die } from "./logger";

export function handler(
  event: APIGatewayEvent | DynamoDBStreamEvent,
  context: Context
) {
  if ("Records" in event) {
    events.handler(event, context);
  } else if ("headers" in event) {
    api.handler(event, context);
  } else {
    throw new Error("Unexpected event: " + JSON.stringify(event));
  }
}

process.on("uncaughtException", err => {
  die(err, "uncaught exception");
});
process.on("unhandledRejection", err => {
  die(err, "unhandled promise rejection");
});
