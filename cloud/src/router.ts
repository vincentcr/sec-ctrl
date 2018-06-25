import { APIGatewayEvent, Context, DynamoDBStreamEvent } from "aws-lambda";

import * as events from "./events/index";
import * as api from "./api/lambda";
import { die } from "./logger";

export function handler(
  event: APIGatewayEvent | DynamoDBStreamEvent,
  context: Context
) {
  if ("Records" in event) {
    // dynamo stream event
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
