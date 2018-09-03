import * as Knex from "knex";

import { VError } from "verror";
import { Config } from "../config";
import { Logger } from "../logger";
import { KeyMapper, mapKeys, mapObjectKeys } from "./KeyMapper";

interface BaseItem {
  [k: string]: any;
}

export type ModelInitParams = { knex: Knex; config: Config; logger: Logger };

export abstract class BaseModel<TItem extends BaseItem> {
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

  async ensureSchema() {
    const exists = await this.knex.schema.hasTable(this.fqTableName);
    if (!exists) {
      this.logger.info("Table %s does not exist, creating", this.fqTableName);

      const createTable = this.knex.schema
        .withSchema(this.schemaName)
        .createTable(
          this.tableName,

          builder => this.createSchema(builder)
        );
      try {
        await createTable;
      } catch (err) {
        throw new VError(
          { cause: err, info: { sql: createTable.toString() } },
          "Failed to create table " + this.fqTableName
        );
      }
    }
  }

  protected abstract createSchema(builder: Knex.CreateTableBuilder): void;

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
    const query = this.knex
      .raw(`? ON CONFLICT ${constraint} DO ? returning *`, [insert, update])
      .toString();
    const result = await this.knex.raw(query);
    const [itemRaw] = result.rows;
    const item = mapObjectKeys(itemRaw, "fromDB", this.keyMapper) as TItem;
    return item;
  }
}
