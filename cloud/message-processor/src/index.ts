import { Context, DynamoDBStreamEvent } from "aws-lambda";
import * as AWS from "aws-sdk";
import { Event } from "../../../common/event";
import { processRecord } from "./processRecord";

import logger from "./logger";

interface StoredEvent {
  data: {
    event: Event;
    receivedAt: string;
  };
  thingID: string;
  eventID: string;
}

export async function handler(data: DynamoDBStreamEvent, context: Context) {
  logger.debug("dynamo event = ", data);

  try {
    await processAll(data);
  } catch (err) {
    logger.debug("failed to process event with payload", data, "\nerror:", err);
  }
}

async function processAll(data: DynamoDBStreamEvent) {
  for (const evt of parseStreamData(data)) {
    await processRecord(evt.thingID, evt.data.event);
  }
}

function parseStreamData(event: DynamoDBStreamEvent): StoredEvent[] {
  return event.Records.filter(({ eventName }) => eventName === "INSERT").map(
    ({ dynamodb }) => {
      const img = dynamodb!.NewImage!;
      const evt = AWS.DynamoDB.Converter.unmarshall(img) as StoredEvent;
      logger.debug("evt =>", evt);
      return evt;
    }
  );
}
