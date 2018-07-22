import * as Knex from "knex"
import { BaseModel } from "./BaseModel";
import { KeyMapper, mapKeys } from "./keyMapper";


export function upsertHelper<TItem>(model: BaseModel<TItem>, params: {
  knex: Knex;
  data: any;
  constraintFields: string[];
  transaction?: Knex.Transaction;
}): Promise<TItem> {
  const { knex,data, constraintFields, transaction } = params;
  const constraint =
    "(" + mapKeys(constraintFields, "toDB", this.keyMapper) + ")";
  const insert = this.queryBuilder(transaction).insert(data);
  const update = knex.queryBuilder().update(data);
  const res = await knex.raw(
    `? ON CONFLICT ${constraint} DO ? returning *`,
    [insert, update]
  );
  return res[0];
}

}

}
