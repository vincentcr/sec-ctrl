import * as crypto from "crypto";
import * as Knex from "knex";
import { promisify } from "util";

import { BaseModel } from "./BaseModel";

const randomBytes = promisify(crypto.randomBytes);

export interface AccessToken {
  readonly userId: string;
  readonly token: string;
}

export class AccessTokenModel extends BaseModel<AccessToken> {
  constructor(knex: Knex) {
    super(knex, "access_tokens");
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
