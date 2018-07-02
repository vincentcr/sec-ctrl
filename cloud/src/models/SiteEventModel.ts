import { BaseModel, QueryResultPage } from "./BaseModel";
import { SiteEvent } from "../../../common/event";

export interface SiteEventRecord {
  readonly data: {
    readonly event: SiteEvent;
    readonly receivedAt: string;
  };
  readonly thingID: string;
  readonly eventID: string;
}

export class SiteEventModel extends BaseModel<SiteEventRecord> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "events");
  }

  async getByThingID(params: {
    thingID: string;
    limit?: number;
    cursor?: object;
  }): Promise<QueryResultPage<SiteEvent>> {
    const { thingID, limit = 10, cursor } = params;
    const results = await this.query({
      keyConditionExpression: "thingID = :thingID",
      expressionAttributeValues: { ":thingID": thingID },
      scanIndexForward: false,
      exclusiveStartKey: cursor,
      limit
    });

    return {
      cursor: results.cursor,
      items: results.items.map(e => e.data.event)
    };
  }
}
