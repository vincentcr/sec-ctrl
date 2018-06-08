import * as AWS from "aws-sdk";

import logger from "./logger";

import {
  Event,
  EventType,
  fromJson,
  PartitionChangeEvent,
  PartitionChangeEventType,
  SystemTroubleStatusEvent,
  ZoneChangeEvent
} from "../../../common/event";
import { Partition } from "../../../common/partition";
import { Zone } from "../../../common/zone";

const dynamodbClient = new AWS.DynamoDB.DocumentClient();

interface Site {
  readonly thingID: string;
  readonly partitions: { [id: string]: Partition };
  readonly zones: { [id: string]: Zone };
  readonly systemTroubleStatus: string[];
}

export interface StoredEvent {
  data: {
    event: Event;
    receivedAt: string;
  };
  thingID: string;
  eventID: string;
}

export async function processRecord(thingID: string, evt: Event) {
  switch (evt.type) {
    case EventType.PartitionChange:
      await updatePartition(thingID, evt);
      break;
    case EventType.ZoneChange:
      await updateZone(thingID, evt);
      break;
    case EventType.SystemTroubleStatus:
      await updateSystemTroubleStatus(thingID, evt);
      break;
  }
}

async function updatePartition(thingID: string, evt: PartitionChangeEvent) {
  const { partitionID } = evt;

  try {
    await dynamodbClient
      .update({
        TableName: "secCtrl.sites",
        Key: { thingID },
        UpdateExpression: "SET #parts = :initParts",
        ExpressionAttributeNames: {
          "#parts": "partitions"
        },
        ExpressionAttributeValues: {
          ":initParts": {}
        },
        ConditionExpression: "attribute_not_exists(#parts)"
      })
      .promise();
  } catch (err) {
    if (err.code !== "ConditionalCheckFailedException") {
      throw err;
    }
  }

  try {
    await dynamodbClient
      .update({
        TableName: "secCtrl.sites",
        Key: { thingID },
        UpdateExpression: "SET #parts.#part = :initPart",
        ExpressionAttributeNames: {
          "#parts": "partitions",
          "#part": partitionID
        },
        ExpressionAttributeValues: {
          ":initPart": {}
        },
        ConditionExpression: "attribute_not_exists(#parts.#part)"
      })
      .promise();
  } catch (err) {
    if (err.code !== "ConditionalCheckFailedException") {
      throw err;
    }
  }

  let props: any;

  switch (evt.changeType) {
    case PartitionChangeEventType.Status:
      props = { status: evt.status };
      break;
    case PartitionChangeEventType.KeypadLed:
      const propName = evt.flash ? "keypadLedFlashState" : "keypadLedState";
      props = { [propName]: evt.keypadState };
      break;
    case PartitionChangeEventType.TroubleLed:
      props = { troubleLed: evt.on };
      break;
    default:
      throw new Error("unmapped change type:" + JSON.stringify(evt));
  }

  const updateAttrs: { [k: string]: any } = {};
  const updateNames: { [k: string]: any } = {};
  for (const [key, val] of Object.entries(props)) {
    updateAttrs[":" + key] = val;
    updateNames["#" + key] = key;
  }

  const updateExp =
    "SET " +
    Object.keys(props)
      .map(key => `#parts.#part.#${key}=:${key}`)
      .join(",");

  await dynamodbClient
    .update({
      TableName: "secCtrl.sites",
      Key: { thingID },
      UpdateExpression: updateExp,
      ExpressionAttributeNames: {
        "#parts": "partitions",
        "#part": partitionID,
        ...updateNames
      },
      ExpressionAttributeValues: updateAttrs
    })
    .promise();
}

async function updateZone(
  thingID: string,
  { zoneID, partitionID, status }: ZoneChangeEvent
) {
  const zone = { zoneID, partitionID, status };

  logger.debug("updateZone:", thingID, zone);

  try {
    await dynamodbClient
      .update({
        TableName: "secCtrl.sites",
        Key: { thingID },
        UpdateExpression: "SET zones = :initZones",
        ExpressionAttributeValues: {
          ":initZones": {}
        },
        ConditionExpression: "attribute_not_exists(zones)"
      })
      .promise();
  } catch (err) {
    if (err.code !== "ConditionalCheckFailedException") {
      throw err;
    }
  }

  await dynamodbClient
    .update({
      TableName: "secCtrl.sites",
      Key: { thingID },
      UpdateExpression: `SET zones.#zoneID = :zone`,
      ExpressionAttributeNames: { "#zoneID": zoneID },
      ExpressionAttributeValues: {
        ":zone": zone
      }
    })
    .promise();
}

async function updateSystemTroubleStatus(
  thingID: string,
  evt: SystemTroubleStatusEvent
) {
  const { status } = evt;

  await dynamodbClient
    .update({
      TableName: "secCtrl.sites",
      Key: { thingID },
      UpdateExpression: `SET systemTroubleStatus = :status`,
      ExpressionAttributeValues: {
        ":status": status
      }
    })
    .promise();
}
