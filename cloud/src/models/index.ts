import * as Knex from "knex";
import { AccessTokenModel } from "./AccessTokenModel";
import { mapKey, mapObjectKeys } from "./keyMapper";
import { SiteEventModel } from "./SiteEventModel";
import { SiteModel } from "./SiteModel";
import { SitePartitionModel } from "./SitePartitionModel";
import { SiteZoneModel } from "./SiteZoneModel";
import { UserModel } from "./UserModel";

type TransactionWorker = (tx: Knex.Transaction) => Promise<void>;

export interface Models {
  readonly Users: UserModel;
  readonly AccessTokens: AccessTokenModel;
  readonly Sites: SiteModel;
  readonly SiteEvents: SiteEventModel;
  readonly SitePartitions: SitePartitionModel;
  readonly SiteZones: SiteZoneModel;
  withTransaction(work: TransactionWorker): Promise<void>;
  destroy(): Promise<void>;
}

export async function initModels(
  config: Knex.ConnectionConfig
): Promise<Models> {
  const knex = connect(config);

  return {
    Users: new UserModel(knex),
    AccessTokens: new AccessTokenModel(knex),
    Sites: new SiteModel(knex),
    SiteEvents: new SiteEventModel(knex),
    SitePartitions: new SitePartitionModel(knex),
    SiteZones: new SiteZoneModel(knex),

    async withTransaction(work: TransactionWorker) {
      return knex.transaction(work);
    },

    async destroy() {
      knex.destroy();
    }
  };
}

export function connect(config: Knex.ConnectionConfig) {
  return Knex({
    client: "pg",
    connection: config,
    postProcessResponse: (data, queryContext) => {
      return mapObjectKeys(
        data,
        "fromDB",
        queryContext != null ? queryContext.keyMapper : null
      );
    },
    wrapIdentifier: (ident, origImpl, queryContext) => {
      const mapped = mapKey(
        ident,
        "toDB",
        queryContext != null ? queryContext.keyMapper : null
      );
      return origImpl(mapped);
    }
  });
}
