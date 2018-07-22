import { Context, DynamoDBStreamEvent } from "aws-lambda";

import { SiteEvent } from "../../../common/siteEvent";
import logger from "../logger";
import Services from "../services";

export interface SecCtrlIoTPayload {
  event: SiteEvent;
  receivedAt: string;
  thingId: string;
}

export async function handler(payload: SecCtrlIoTPayload, context: Context) {
  logger.debug(payload, "IoT event");

  const services = await Services.getInstance();

  try {
    await services.saveEvent({
      siteId: payload.thingId,
      event: payload.event,
      receivedAt: new Date(payload.receivedAt)
    });
  } catch (err) {
    logger.error({ payload, err }, "failed to process event");
    context.fail(err);
  }
}
