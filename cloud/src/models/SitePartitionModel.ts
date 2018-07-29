import * as Knex from "knex";
import * as VError from "verror";

import { Partition } from "../../../common/partition";
import {
  PartitionChangeEvent,
  PartitionChangeType
} from "../../../common/siteEvent";
import logger from "../logger";
import { BaseModel } from "./BaseModel";

export type SitePartitionRecord = Partition & {
  siteId: string;
};

export class SitePartitionModel extends BaseModel<SitePartitionRecord> {
  constructor(knex: Knex) {
    super(knex, "site_partitions");
  }

  upsert(
    partition: Partial<SitePartitionRecord>,
    transaction?: Knex.Transaction
  ): Promise<SitePartitionRecord> {
    return this.upsertHelper({
      data: partition,
      constraintFields: ["siteId", "id"],
      transaction
    });
  }

  upsertFromEvent(params: {
    siteId: string;
    event: PartitionChangeEvent;
    transaction: Knex.Transaction;
  }): Promise<SitePartitionRecord> {
    const { siteId, event, transaction } = params;

    const { partitionId } = event;

    logger.debug({ siteId, event }, "updatePartitionFromEvent");

    const partition: Partial<SitePartitionRecord> = { siteId, id: partitionId };

    switch (event.changeType) {
      case PartitionChangeType.Status:
        partition.status = event.status;
        break;
      case PartitionChangeType.KeypadLed:
        const propName = event.flash ? "keypadLedFlashState" : "keypadLedState";
        partition[propName] = event.keypadState;
        break;
      case PartitionChangeType.TroubleLed:
        partition.troubleStateLed = event.on;
        break;
      default:
        throw new VError(
          { name: "UnexpectedPartitionChangeType", info: { event } },
          "Unexpected change type"
        );
    }

    return this.upsert(partition, transaction);
  }
}
