import * as Knex from "knex";

import { KeyMapper, mapKeys, mapObjectKeys } from "./keyMapper";

interface BaseItem {
  [k: string]: any;
}

export class BaseModel<TItem extends BaseItem> {
  protected readonly knex: Knex;
  protected readonly tableName: string;
  protected readonly schemaName: string;
  protected readonly keyMapper?: KeyMapper;
  readonly fqTableName: string;

  constructor(
    knex: Knex,
    tableName: string,
    keyMapper?: KeyMapper,
    schemaName = "public"
  ) {
    this.knex = knex;
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
