import * as Knex from "knex";

import { Site } from "../../../common/site";
import { EventType, SiteEvent } from "../../../common/siteEvent";
import { Item } from "../../node_modules/aws-sdk/clients/mediastoredata";
import { SiteAlreadyClaimedError } from "../errors";
import logger from "../logger";
import { BaseModel } from "./BaseModel";
import { mapObjectKeys } from "./keyMapper";

export type SiteRecord = Omit<Omit<Site, "partitions">, "zones">;

export class SiteModel extends BaseModel<SiteRecord> {
  constructor(knex: Knex) {
    super(knex, "sites");
  }

  upsert(
    site: Partial<SiteRecord>,
    transaction?: Knex.Transaction
  ): Promise<SiteRecord> {
    return this.upsertHelper({
      data: site,
      constraintFields: ["id"],
      transaction
    });
  }

  upsertFromEvent(params: {
    id: string;
    event: SiteEvent;
    transaction: Knex.Transaction;
  }) {
    const { transaction, id, event } = params;
    const systemTroubleStatus =
      event.type === EventType.SystemTroubleStatus ? event.status : undefined;

    const data: Partial<SiteRecord> = { id, systemTroubleStatus };

    logger.debug({ data, event, id }, "SiteModel.upsertFromEvent");

    return this.upsert(data, transaction);
  }

  async claim(params: {
    id: string;
    ownerId: string;
    name: string;
  }): Promise<void> {
    const { id, ownerId, name } = params;
    const nAffected = await this.queryBuilder()
      .update({ name, ownerId })
      .whereNull("ownerId")
      .and.where({ id });

    if (nAffected === 0) {
      throw new SiteAlreadyClaimedError();
    }
  }

  async getByID(id: string): Promise<Site | undefined> {
    const rows = await this.queryBuilder().where({ id });
    return rows[0];
  }

  async getPopulatedSites(...ids: string[]): Promise<SiteRecord[]> {
    const q = this.queryBuilder()
      .column(this.knex.raw("sites.*"))
      .column(
        this.knex.raw(`(
          SELECT json_agg(zones) FROM (
            SELECT  id,
                    partition_id,
                    status
              FROM site_zones
              WHERE site_zones.site_id = sites.id
              ORDER BY partition_id, site_zones.id
          ) AS zones
        ) AS zones`)
      )
      .column(
        this.knex.raw(`(
          SELECT json_agg(partitions) FROM (
            SELECT  id,
                    keypad_led_flash_state,
                    keypad_led_state,
                    status,
                    trouble_state_led
              FROM site_partitions
              WHERE site_partitions.site_id = sites.id
              ORDER BY site_partitions.id
          ) AS partitions
        ) AS partitions`)
      )
      .select()
      .whereIn("sites.id", ids)
      .orderBy("sites.id");

    return await q;
  }
}
