import * as Knex from "knex";

import { ZoneChangeEvent } from "../../../common/siteEvent";
import { Zone } from "../../../common/zone";
import { BaseModel, ModelInitParams } from "./BaseModel";

export type SiteZoneRecord = Zone & {
  siteId: string;
};

export class SiteZoneModel extends BaseModel<SiteZoneRecord> {
  constructor(params: ModelInitParams) {
    super(params, "site_zones");
  }

  protected createSchema(builder: Knex.CreateTableBuilder) {
    builder
      .string("site_id", 512)
      .notNullable()
      .references("sites.id")
      .onDelete("restrict");
    builder.integer("id").notNullable();
    builder.integer("partition_id").notNullable();
    builder.string("status", 256);
    builder.primary(["site_id", "id"]);
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

    this.logger.debug(zone, "SiteZoneModel.upsertFromEvent");

    return this.upsert(zone, transaction);
  }
}
