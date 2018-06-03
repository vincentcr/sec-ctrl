import { Context, DynamoDBStreamEvent } from "aws-lambda";
import { processRecord } from "./processRecord";
import * as AWS from "aws-sdk";
import { Event } from "../../../common/event";

interface StoredEvent {
  data: {
    event: Event;
    receivedAt: string;
  };
  thingID: string;
  eventID: string;
}

const docClient = new AWS.DynamoDB.DocumentClient();

export async function handler(data: DynamoDBStreamEvent, context: Context) {
  console.log("dynamo event = ", data);

  try {
    await processAll(data);
  } catch (err) {
    console.log("failed to process event with payload", data, "\nerror:", err);
  }

  // const thingID = parseThingID(payload.topic);
  // try {
  //   await processPayload({ thingID, payload });
  // } catch (err) {
  //   console.log(
  //     "failed to process event with payload",
  //     payload,
  //     "\nerror:",
  //     err,
  //   );
  // }
}

async function processAll(data: DynamoDBStreamEvent) {
  return Promise.all(
    parseStreamData(data).map(evt =>
      processRecord(evt.thingID, evt.data.event),
    ),
  );
}

function parseStreamData(event: DynamoDBStreamEvent): StoredEvent[] {
  return event.Records.filter(({ eventName }) => eventName === "INSERT").map(
    ({ dynamodb }) => {
      const img = dynamodb!.NewImage!;
      const evt = <StoredEvent>AWS.DynamoDB.Converter.unmarshall(img);
      console.log("evt =>", evt);
      return evt;
    },
  );
}

// function* parseStreamData() {}

// function parseThingID(topic: string): string {
//   const match = /^.+\/(.+?)\/(.+?)$/.exec(topic);
//   if (match == null) {
//     throw new Error("unexpected topic: unable to extract thingID: " + topic);
//   }

//   return match[1];
// }
