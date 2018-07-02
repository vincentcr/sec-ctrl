import { promisify } from "util";
import * as crypto from "crypto";

import { BaseModel } from "./BaseModel";

const randomBytes = promisify(crypto.randomBytes);

export interface AccessToken {
  readonly userID: string;
  readonly token: string;
}

export class AccessTokenModel extends BaseModel<AccessToken> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "accessTokens");
  }

  async create(userID: string): Promise<AccessToken> {
    const token = await this.genToken(32);

    const accessToken = {
      token,
      userID
    };
    await this.put({ item: accessToken });
    return accessToken;
  }

  async genToken(numBytes: number) {
    const tokenBytes = await randomBytes(numBytes);
    const token = tokenBytes
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return token;
  }

  async authenticate(token: string): Promise<string | undefined> {
    const rec = await this.get({ token });
    if (rec != null && token === rec.token) {
      return rec.userID;
    } else {
      return undefined;
    }
  }
}
