import * as Knex from "knex";

import { SiteEvent } from "../../../common/siteEvent";
import { BaseModel } from "./BaseModel";

export interface SiteEventRecord {
  readonly event: SiteEvent;
  readonly receivedAt: Date;
  readonly siteId: string;
  readonly id: number;
}

export class SiteEventModel extends BaseModel<SiteEventRecord> {
  constructor(knex: Knex) {
    super(knex, "site_events");
  }

  async create(params: {
    siteId: string;
    events: SiteEvent[];
    receivedAt: Date;
    transaction?: Knex.Transaction;
  }) {
    const { transaction, siteId, events, receivedAt } = params;

    const records = events.map(event => ({
      event,
      receivedAt,
      siteId
    }));

    await this.queryBuilder(transaction).insert(records);
  }

  async getBySiteId(params: {
    siteId: string;
    limit?: number;
    offsetId?: number;
  }): Promise<SiteEventRecord[]> {
    const { siteId, limit = 10, offsetId } = params;

    const query = this.queryBuilder()
      .select()
      .where({ siteId })
      .orderBy("id", "DESC");

    if (offsetId != null) {
      query.andWhere("id", "<", offsetId);
    }

    if (limit > 0) {
      query.limit(limit);
    }

    return await query;
  }
}
