import * as AWS from "aws-sdk";
import {
  Event,
  fromJson,
  EventType,
  PartitionChangeEvent,
  PartitionChangeEventType,
  ZoneChangeEvent,
} from "../../../common/event";
import { Partition } from "../../../common/partition";
import { Zone } from "../../../common/zone";
import { SystemTroubleStatus } from "../../../common/systemTroubleStatus";

const docClient = new AWS.DynamoDB.DocumentClient();

// interface Site {
//   partitions: { [id: string]: Partition };
//   zones: { [id: string]: Zone };
//   troubleStatus: SystemTroubleStatus;
// }

export interface StoredEvent {
  data: {
    event: Event;
    receivedAt: string;
  };
  thingID: string;
  eventID: string;
}

export function processRecord(thingID: string, evt: Event) {
  switch (evt.type) {
    case EventType.PartitionChange:
      return updatePartition(thingID, evt);
    case EventType.ZoneChange:
      return updateZone(thingID, evt);
    // case EventType.Alarm:
    //   await processAlarm(evt);
  }
}

// export async function processPayload(params: {
//   thingID: string;
//   payload: any;
// }) {
//   const { thingID, payload } = params;
//   const evt = fromJson(payload);
//   console.log("processPayload: ", payload, "=>", evt);

//   await Promise.all([processEvent(thingID, evt), logEvent(evt)]);
// }

// async function processEvent(thingID: string, evt: Event) {
//   switch (evt.type) {
//     case EventType.PartitionChange:
//       await updatePartition(thingID, evt);
//       break;
//     // case EventType.ZoneChange:
//     //   await updateZone(evt);
//     //   break;
//     // case EventType.Alarm:
//     //   await processAlarm(evt);
//   }
// }

async function updatePartition(thingID: string, evt: PartitionChangeEvent) {
  const { partitionID } = evt;

  try {
    await docClient
      .update({
        TableName: "secCtrl.sites",
        Key: { thingID },
        UpdateExpression: "SET #parts = :initParts",
        ExpressionAttributeNames: {
          "#parts": "partitions",
        },
        ExpressionAttributeValues: {
          ":initParts": {},
        },
        ConditionExpression: "attribute_not_exists(#parts)",
      })
      .promise();
  } catch (err) {
    if (err.code != "ConditionalCheckFailedException") {
      throw err;
    }
  }

  try {
    await docClient
      .update({
        TableName: "secCtrl.sites",
        Key: { thingID },
        UpdateExpression: "SET #parts.#part = :initPart",
        ExpressionAttributeNames: {
          "#parts": "partitions",
          "#part": partitionID,
        },
        ExpressionAttributeValues: {
          ":initPart": {},
        },
        ConditionExpression: "attribute_not_exists(#parts.#part)",
      })
      .promise();
  } catch (err) {
    if (err.code != "ConditionalCheckFailedException") {
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

  await docClient
    .update({
      TableName: "secCtrl.sites",
      Key: { thingID },
      UpdateExpression: updateExp,
      ExpressionAttributeNames: {
        "#parts": "partitions",
        "#part": partitionID,
        ...updateNames,
      },
      ExpressionAttributeValues: updateAttrs,
    })
    .promise();
}

async function updateZone(
  thingID: string,
  { zoneID, partitionID, status }: ZoneChangeEvent,
) {
  const zone = { zoneID, partitionID, status };

  console.log("updateZone:", thingID, zone);

  try {
    await docClient
      .update({
        TableName: "secCtrl.sites",
        Key: { thingID },
        UpdateExpression: "SET zones = :initZones",
        ExpressionAttributeValues: {
          ":initZones": {},
        },
        ConditionExpression: "attribute_not_exists(zones)",
      })
      .promise();
  } catch (err) {
    if (err.code != "ConditionalCheckFailedException") {
      throw err;
    }
  }

  await docClient
    .update({
      TableName: "secCtrl.sites",
      Key: { thingID },
      UpdateExpression: `SET zones.#zoneID = :zone`,
      ExpressionAttributeNames: { "#zoneID": zoneID },
      ExpressionAttributeValues: {
        ":zone": zone,
      },
    })
    .promise();
}
