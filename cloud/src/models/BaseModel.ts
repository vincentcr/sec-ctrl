import * as Knex from "knex";

import { Config } from "../config";
import { Logger } from "../logger";
import { KeyMapper, mapKeys, mapObjectKeys } from "./keyMapper";

interface BaseItem {
  [k: string]: any;
}

export type ModelInitParams = { knex: Knex; config: Config; logger: Logger };

export class BaseModel<TItem extends BaseItem> {
  protected readonly knex: Knex;
  protected readonly logger: Logger;
  protected readonly config: Config;
  protected readonly tableName: string;
  protected readonly schemaName: string;
  protected readonly keyMapper?: KeyMapper;
  readonly fqTableName: string;

  constructor(
    params: ModelInitParams,
    tableName: string,
    keyMapper?: KeyMapper,
    schemaName = "public"
  ) {
    this.knex = params.knex;
    this.logger = params.logger;
    this.config = params.config;

    this.tableName = tableName;
    this.schemaName = schemaName;
    this.keyMapper = keyMapper;
    this.fqTableName = schemaName + "." + tableName;
  }

  protected queryBuilder(transaction?: Knex.Transaction): Knex.QueryBuilder {
    const ctx = transaction != null ? transaction : this.knex;

    const queryBuilder = ctx.withSchema(this.schemaName).table(this.tableName);

    // Knex.QueryBuilder type definition is missing queryContext
    (queryBuilder as any).queryContext({
      keyMapper: this.keyMapper
    });

    return queryBuilder;
  }

  protected async upsertHelper(params: {
    data: any;
    constraintFields: string[];
    transaction?: Knex.Transaction;
  }): Promise<TItem> {
    const { data, constraintFields, transaction } = params;
    const constraint =
      "(" + mapKeys(constraintFields, "toDB", this.keyMapper) + ")";
    const insert = this.queryBuilder(transaction).insert(data);
    const update = this.knex.queryBuilder().update(data);
    const result = await this.knex.raw(
      `? ON CONFLICT ${constraint} DO ? returning *`,
      [insert, update]
    );
    const [itemRaw] = result.rows;
    const item = mapObjectKeys(itemRaw, "fromDB", this.keyMapper) as TItem;
    return item;
  }
}
