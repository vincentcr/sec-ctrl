import { APIGatewayEvent, Context } from "aws-lambda";
import * as _ from "lodash";

import * as api from "./api/lambda";
import * as events from "./events";
import { getServicesInstance } from "./services";
import terminationHooks from "./termination-hooks";

export async function handler(
  event: APIGatewayEvent | events.SecCtrlIoTPayload,
  context: Context
) {
  console.log("starting up");
  const services = await getServicesInstance();
  terminationHooks(services);

  if ("thingId" in event) {
    // iot event
    return events.handler(services, event, context);
  } else if ("headers" in event) {
    // api request
    return api.handler(services, event, context);
  } else {
    // not supposed to happen
    throw new Error("Unexpected event: " + JSON.stringify(event));
  }
}
