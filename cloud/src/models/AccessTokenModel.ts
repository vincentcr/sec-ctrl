import * as crypto from "crypto";
import * as Knex from "knex";
import { promisify } from "util";

import { BaseModel, ModelInitParams } from "./BaseModel";

const randomBytes = promisify(crypto.randomBytes);

export interface AccessToken {
  readonly userId: string;
  readonly token: string;
}

export class AccessTokenModel extends BaseModel<AccessToken> {
  constructor(params: ModelInitParams) {
    super(params, "access_tokens");
  }

  protected createSchema(builder: Knex.CreateTableBuilder) {
    builder
      .string("token", 1024)
      .primary()
      .defaultTo(this.knex.raw("encode(ext.gen_random_bytes(16), 'hex')"));
    builder
      .uuid("user_id")
      .notNullable()
      .references("users.id")
      .onDelete("restrict");
    builder.timestamp("expires_at", true);
  }

  async create(userId: string): Promise<AccessToken> {
    const token = await this.genToken(32);

    const accessToken = {
      token,
      userId
    };

    await this.queryBuilder().insert(accessToken);

    return accessToken;
  }

  private async genToken(numBytes: number) {
    const tokenBytes = await randomBytes(numBytes);
    const token = tokenBytes
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return token;
  }

  async delete(token: string): Promise<void> {
    await this.queryBuilder()
      .delete()
      .where({ token });
  }
}
