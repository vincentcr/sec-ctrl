import * as Knex from "knex";

import { ZoneChangeEvent } from "../../../common/siteEvent";
import { Zone } from "../../../common/zone";
import logger from "../logger";
import { BaseModel } from "./BaseModel";

export type SiteZoneRecord = Zone & {
  siteId: string;
};

export class SiteZoneModel extends BaseModel<SiteZoneRecord> {
  constructor(knex: Knex) {
    super(knex, "site_zones");
  }

  upsert(
    zone: Partial<SiteZoneRecord>,
    transaction?: Knex.Transaction
  ): Promise<SiteZoneRecord> {
    return this.upsertHelper({
      data: zone,
      constraintFields: ["siteId", "id"],
      transaction
    });
  }

  upsertFromEvent(params: {
    siteId: string;
    event: ZoneChangeEvent;
    transaction: Knex.Transaction;
  }): Promise<SiteZoneRecord> {
    const { siteId, event, transaction } = params;
    const { zoneId, partitionId, status } = event;
    const zone: SiteZoneRecord = { siteId, id: zoneId, partitionId, status };

    logger.debug(zone, "SiteZoneModel.upsertFromEvent");

    return this.upsert(zone, transaction);
  }
}
