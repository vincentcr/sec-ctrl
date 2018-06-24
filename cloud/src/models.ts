import * as AWS from "aws-sdk";
import {
  AttributeValue,
  ExpressionAttributeNameMap,
  ExpressionAttributeValueMap,
  MapAttributeValue
} from "aws-sdk/clients/dynamodb";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { promisify } from "util";
import * as uuid from "uuid";
import { VError } from "verror";

import { Event } from "../../common/event";
import { Partition } from "../../common/partition";
import { Zone } from "../../common/zone";

export const enum DBError {
  EmailNotFound = "EmailNotFound",
  PasswordMismatch = "PasswordMismatch",
  SiteAlreadyClaimed = "SiteAlreadyClaimed"
}

const randomBytes = promisify(crypto.randomBytes);

type DynamoPrimitive = string | number | boolean | Buffer;

type DynamoValue =
  | DynamoPrimitive
  | DynamoPrimitive[]
  | { [key: string]: DynamoValue };

interface QueryResultPage<T> {
  readonly items: T[];
  readonly cursor?: object;
}

export class BaseModel<TItem> {
  protected readonly dynamodbClient: AWS.DynamoDB.DocumentClient;
  protected readonly tableName: string;
  protected constructor(
    dynamodbClient: AWS.DynamoDB.DocumentClient,
    tableName: string
  ) {
    this.dynamodbClient = dynamodbClient;
    this.tableName = tableName;
  }

  protected async query(params: {
    indexName?: string;
    keyConditionExpression: string;
    expressionAttributeValues?: { [key: string]: DynamoValue };
    expressionAttributeNames?: ExpressionAttributeNameMap;
    scanIndexForward?: boolean;
    limit?: number;
    exclusiveStartKey?: object;
  }): Promise<QueryResultPage<TItem>> {
    const {
      keyConditionExpression,
      indexName,
      expressionAttributeValues,
      expressionAttributeNames,
      scanIndexForward,
      limit,
      exclusiveStartKey
    } = params;

    const valueMap =
      expressionAttributeValues != null
        ? AWS.DynamoDB.Converter.marshall(expressionAttributeValues)
        : undefined;

    const queryOutput = await this.dynamodbClient
      .query({
        TableName: this.tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: valueMap,
        ExpressionAttributeNames: expressionAttributeNames,
        ExclusiveStartKey: exclusiveStartKey,
        ScanIndexForward: scanIndexForward,
        Limit: limit
      })
      .promise();

    if (queryOutput.Items == null) {
      return { items: [] };
    }

    const items = queryOutput.Items.map(
      it => AWS.DynamoDB.Converter.unmarshall(it) as TItem
    );

    return { items, cursor: queryOutput.LastEvaluatedKey };
  }

  protected async get(key: any): Promise<TItem | undefined> {
    const result = await this.dynamodbClient
      .get({ TableName: this.tableName, Key: key })
      .promise();

    if (result.Item == null) {
      return undefined;
    }

    return result.Item as TItem;
  }

  protected async put(params: {
    item: TItem;
    condition?: string;
    expressionAttributeValues?: { [key: string]: DynamoValue };
    expressionAttributeNames?: ExpressionAttributeNameMap;
  }) {
    const req = {
      TableName: this.tableName,
      Item: params.item,
      ConditionExpression: params.condition,
      ExpressionAttributeNames: params.expressionAttributeNames,
      ExpressionAttributeValues: params.expressionAttributeValues
    };

    // logger.debug({ item, req, type: this.constructor.name }, "put");

    await this.dynamodbClient.put(req).promise();
  }
}

export interface UserRecord {
  readonly id: string;
  readonly username: string;
}

interface UserRecordPrivate extends UserRecord {
  readonly hashedPassword: string;
}

class UserModel extends BaseModel<UserRecordPrivate> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "secCtrl.users");
  }

  async create(params: {
    username: string;
    password: string;
  }): Promise<UserRecord> {
    const { username, password } = params;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: uuid.v4(),
      username: params.username
    };
    await this.put({
      item: { ...user, hashedPassword },
      condition: "attribute_not_exists(username)"
    });
    return user;
  }

  async getByID(id: string): Promise<UserRecord | undefined> {
    const res = await this.query({
      indexName: "id-index",
      keyConditionExpression: "id=:id",
      expressionAttributeValues: {
        ":id": id
      }
    });

    if (res.items.length === 0) {
      throw new VError(
        { name: DBError.EmailNotFound },
        "user with specified id not found"
      );
    }

    const [privateUser] = res.items;

    return UserModel.toPublicUser(privateUser);
  }

  private static toPublicUser(privateUser: UserRecordPrivate): UserRecord {
    const { hashedPassword, ...user } = privateUser;
    return user;
  }

  async authenticate(params: {
    username: string;
    password: string;
  }): Promise<UserRecord> {
    const { username, password } = params;

    const privateUser = await this.get({ username });
    if (privateUser == null) {
      throw new VError(
        { name: DBError.EmailNotFound },
        "user with specified username not found"
      );
    }

    const validPassword = await bcrypt.compare(
      password,
      privateUser.hashedPassword
    );
    if (!validPassword) {
      throw new VError(
        { name: DBError.PasswordMismatch },
        "the password did not match"
      );
    }

    return UserModel.toPublicUser(privateUser);
  }
}

export interface AccessTokenRecord {
  userID: string;
  token: string;
}

class AccessTokenModel extends BaseModel<AccessTokenRecord> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "secCtrl.accessTokens");
  }

  async create(userID: string): Promise<AccessTokenRecord> {
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

export interface SiteRecord {
  readonly thingID: string;
  readonly claimedByID: string;
  readonly partitions: { [id: string]: Partition };
  readonly zones: { [id: string]: Zone };
  readonly systemTroubleStatus: string[];
}

class SiteModel extends BaseModel<SiteRecord> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "secCtrl.sites");
  }

  async getByThingID(thingID: string): Promise<SiteRecord | undefined> {
    return this.get({ thingID });
  }

  async claim(params: { thingID: string; claimedByID: string }): Promise<void> {
    const { thingID, claimedByID } = params;
    try {
      await this.dynamodbClient
        .update({
          TableName: this.tableName,
          Key: { thingID },
          UpdateExpression: "SET #claimedByID = :claimedByID",
          ExpressionAttributeNames: {
            "#claimedByID": "claimedByID"
          },
          ExpressionAttributeValues: {
            ":claimedByID": claimedByID
          },
          ConditionExpression: "attribute_not_exists(#claimedByID)"
        })
        .promise();
    } catch (err) {
      if (err.code !== "ConditionalCheckFailedException") {
        throw err;
      } else {
        throw new VError(
          { name: DBError.SiteAlreadyClaimed },
          "site has already been claimed"
        );
      }
    }
  }
}

export interface SiteEventRecord {
  data: {
    event: Event;
    receivedAt: string;
  };
  thingID: string;
  eventID: string;
}

class SiteEventModel extends BaseModel<SiteEventRecord> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "secCtrl.events");
  }

  async getByThingID(params: {
    thingID: string;
    limit?: number;
    cursor?: object;
  }): Promise<QueryResultPage<SiteEventRecord>> {
    const { thingID, limit = 10, cursor } = params;
    return this.query({
      keyConditionExpression: "thingID = :thingID",
      expressionAttributeValues: { ":thingID": thingID },
      scanIndexForward: false,
      exclusiveStartKey: cursor,
      limit
    });
  }
}

export interface Models {
  readonly Users: UserModel;
  readonly AccessTokens: AccessTokenModel;
  readonly Sites: SiteModel;
  readonly SiteEvents: SiteEventModel;
}

export function initModels(
  dynamodbClient: AWS.DynamoDB.DocumentClient
): Models {
  return {
    Users: new UserModel(dynamodbClient),
    AccessTokens: new AccessTokenModel(dynamodbClient),
    Sites: new SiteModel(dynamodbClient),
    SiteEvents: new SiteEventModel(dynamodbClient)
  };
}

// export { Site } from "../../../common/site";
