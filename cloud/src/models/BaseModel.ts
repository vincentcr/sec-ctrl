import {
  ExpressionAttributeNameMap,
  DocumentClient
} from "aws-sdk/clients/dynamodb";
import AWS = require("aws-sdk");
import { QueryResultPage } from "./types";

type DynamoPrimitive = string | number | boolean | Buffer;

type DynamoValue =
  | DynamoPrimitive
  | DynamoPrimitive[]
  | { [key: string]: DynamoValue };

type Diff<
  T extends string | number | symbol,
  U extends string | number | symbol
> = ({ [P in T]: P } & { [P in U]: never } & { [x: string]: never })[T];

type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;

type UpdateParams = Omit<DocumentClient.UpdateItemInput, "TableName">;

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
        IndexName: indexName,
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

  protected async update(params: UpdateParams) {
    await this.dynamodbClient
      .update({ TableName: this.tableName, ...params })
      .promise();
  }
}
