import { BaseModel } from "./BaseModel";
import { SiteEventRecord, QueryResultPage } from "./types";

export class SiteEventModel extends BaseModel<SiteEventRecord> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "events");
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
