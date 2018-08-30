import * as Knex from "knex";
import { AccessTokenModel } from "./AccessTokenModel";
import { ModelInitParams } from "./BaseModel";
import { mapKey, mapObjectKeys } from "./KeyMapper";
import { SiteEventModel } from "./SiteEventModel";
import { SiteModel } from "./SiteModel";
import { SitePartitionModel } from "./SitePartitionModel";
import { SiteZoneModel } from "./SiteZoneModel";
import { UserModel } from "./UserModel";

type TransactionWorker = (tx: Knex.Transaction) => Promise<void>;

export interface Models {
  Users: UserModel;
  AccessTokens: AccessTokenModel;
  Sites: SiteModel;
  SiteEvents: SiteEventModel;
  SitePartitions: SitePartitionModel;
  SiteZones: SiteZoneModel;
  withTransaction(work: TransactionWorker): Promise<void>;
  destroy(): Promise<void>;
}

export async function initModels(params: ModelInitParams): Promise<Models> {
  const { knex } = params;
  return {
    Users: new UserModel(params),
    AccessTokens: new AccessTokenModel(params),
    Sites: new SiteModel(params),
    SiteEvents: new SiteEventModel(params),
    SitePartitions: new SitePartitionModel(params),
    SiteZones: new SiteZoneModel(params),

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
