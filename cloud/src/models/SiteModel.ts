import { BaseModel } from "./BaseModel";
import { SiteRecord, DBError } from "./types";
import { VError } from "verror";
import {
  ZoneChangeEvent,
  PartitionChangeEvent,
  PartitionChangeEventType,
  SystemTroubleStatusEvent,
  Event,
  EventType
} from "../../../common/event";
import logger from "../logger";

export class SiteModel extends BaseModel<SiteRecord> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "sites");
  }

  async getByThingID(thingID: string): Promise<SiteRecord | undefined> {
    return this.get({ thingID });
  }

  async claim(params: { thingID: string; claimedByID: string }): Promise<void> {
    const { thingID, claimedByID } = params;
    try {
      await this.update({
        Key: { thingID },
        UpdateExpression: "SET #claimedByID = :claimedByID",
        ExpressionAttributeNames: {
          "#claimedByID": "claimedByID"
        },
        ExpressionAttributeValues: {
          ":claimedByID": claimedByID
        },
        ConditionExpression: "attribute_not_exists(#claimedByID)"
      });
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

  async updateFromEvent(thingID: string, event: Event) {
    switch (event.type) {
      case EventType.PartitionChange:
        await this.updatePartitionFromEvent(thingID, event);
        break;
      case EventType.ZoneChange:
        await this.updateZoneFromEvent(thingID, event);
        break;
      case EventType.SystemTroubleStatus:
        await this.updateSystemTroubleStatusFromEvent(thingID, event);
        break;
    }
  }

  private async updatePartitionFromEvent(
    thingID: string,
    event: PartitionChangeEvent
  ) {
    const { partitionID } = event;

    try {
      await this.update({
        Key: { thingID },
        UpdateExpression: "SET #parts = :initParts",
        ExpressionAttributeNames: {
          "#parts": "partitions"
        },
        ExpressionAttributeValues: {
          ":initParts": {}
        },
        ConditionExpression: "attribute_not_exists(#parts)"
      });
    } catch (err) {
      if (err.code !== "ConditionalCheckFailedException") {
        throw err;
      }
    }

    try {
      await this.update({
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
      });
    } catch (err) {
      if (err.code !== "ConditionalCheckFailedException") {
        throw err;
      }
    }

    let props: any;

    switch (event.changeType) {
      case PartitionChangeEventType.Status:
        props = { status: event.status };
        break;
      case PartitionChangeEventType.KeypadLed:
        const propName = event.flash ? "keypadLedFlashState" : "keypadLedState";
        props = { [propName]: event.keypadState };
        break;
      case PartitionChangeEventType.TroubleLed:
        props = { troubleLed: event.on };
        break;
      default:
        throw new Error("unmapped change type:" + JSON.stringify(event));
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

    await this.update({
      Key: { thingID },
      UpdateExpression: updateExp,
      ExpressionAttributeNames: {
        "#parts": "partitions",
        "#part": partitionID,
        ...updateNames
      },
      ExpressionAttributeValues: updateAttrs
    });
  }

  private async updateZoneFromEvent(
    thingID: string,
    { zoneID, partitionID, status }: ZoneChangeEvent
  ) {
    const zone = { zoneID, partitionID, status };

    logger.debug("updateZoneFromEvent:", thingID, zone);

    try {
      await this.update({
        Key: { thingID },
        UpdateExpression: "SET zones = :initZones",
        ExpressionAttributeValues: {
          ":initZones": {}
        },
        ConditionExpression: "attribute_not_exists(zones)"
      });
    } catch (err) {
      if (err.code !== "ConditionalCheckFailedException") {
        throw err;
      }
    }

    await this.update({
      Key: { thingID },
      UpdateExpression: `SET zones.#zoneID = :zone`,
      ExpressionAttributeNames: { "#zoneID": zoneID },
      ExpressionAttributeValues: {
        ":zone": zone
      }
    });
  }

  private async updateSystemTroubleStatusFromEvent(
    thingID: string,
    event: SystemTroubleStatusEvent
  ) {
    const { status } = event;

    await this.update({
      Key: { thingID },
      UpdateExpression: `SET systemTroubleStatus = :status`,
      ExpressionAttributeValues: {
        ":status": status
      }
    });
  }
}
