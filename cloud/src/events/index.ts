import { Context, DynamoDBStreamEvent } from "aws-lambda";
import * as AWS from "aws-sdk";

import logger from "../logger";
import { SiteEventRecord } from "../models";
import createServices, { Services } from "../services";

export async function handler(data: DynamoDBStreamEvent, context: Context) {
  logger.debug("dynamo event = ", data);

  const services = await createServices();

  try {
    await processAll(data, services);
  } catch (err) {
    logger.error({ data, err }, "failed to process event with payload");
  }
}

async function processAll(data: DynamoDBStreamEvent, services: Services) {
  for (const record of parseDynamoEvent(data)) {
    await processEventRecord({ services, record });
  }
}

function parseDynamoEvent(data: DynamoDBStreamEvent): SiteEventRecord[] {
  return data.Records.filter(({ eventName }) => eventName === "INSERT").map(
    ({ dynamodb }) => {
      const img = dynamodb!.NewImage!;
      const evt = AWS.DynamoDB.Converter.unmarshall(img) as SiteEventRecord;
      logger.info(evt, "event record");
      return evt;
    }
  );
}

async function processEventRecord(params: {
  services: Services;
  record: SiteEventRecord;
}) {
  const { services, record } = params;
  const { models } = services;
  await models.Sites.updateFromEvent(record.thingID, record.data.event);
}
