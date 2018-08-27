import { Context } from "aws-lambda";

import { SiteEvent } from "../../../common/siteEvent";
import { Services } from "../services";

export interface SecCtrlIoTPayload {
  event: SiteEvent;
  receivedAt: string;
  thingId: string;
}

export async function handler(
  services: Services,
  payload: SecCtrlIoTPayload,
  context: Context
) {
  services.logger.debug(payload, "IoT event");

  try {
    await services.saveEvent({
      siteId: payload.thingId,
      event: payload.event,
      receivedAt: new Date(payload.receivedAt)
    });
  } catch (err) {
    services.logger.error({ payload, err }, "failed to process event");
    context.fail(err);
  }
}
