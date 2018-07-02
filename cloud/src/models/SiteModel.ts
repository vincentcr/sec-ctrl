import { BaseModel } from "./BaseModel";
import { VError } from "verror";
import {
  ZoneChangeEvent,
  PartitionChangeEvent,
  PartitionChangeEventType,
  SystemTroubleStatusEvent,
  SiteEvent,
  EventType
} from "../../../common/siteEvent";
import logger from "../logger";
import { SiteAlreadyClaimedError, SiteDoesNotExistError } from "../errors";
import { Site } from "../../../common/site";

export class SiteModel extends BaseModel<Site> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "sites");
  }

  async getByThingID(thingID: string): Promise<Site | undefined> {
    return this.get({ thingID });
  }

  async claim(params: { thingID: string; claimedByID: string }): Promise<void> {
    const { thingID, claimedByID } = params;

    if ((await this.getByThingID(thingID)) == null) {
      throw new SiteDoesNotExistError();
    }

    const req = {
      Key: { thingID },
      UpdateExpression: "SET #claimedByID = :claimedByID",
      ExpressionAttributeNames: {
        "#claimedByID": "claimedByID"
      },
      ExpressionAttributeValues: {
        ":claimedByID": claimedByID
      },
      ConditionExpression: "attribute_not_exists(#claimedByID)"
    };
    try {
      await this.update(req);
    } catch (err) {
      if (err.code === "ConditionalCheckFailedException") {
        throw new SiteAlreadyClaimedError();
      } else {
        throw new VError(
          { cause: err, info: req },
          "unexpected db error in claim"
        );
      }
    }
  }

  async updateFromEvent(thingID: string, event: SiteEvent) {
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

    logger.debug({ thingID, event }, "updatePartitionFromEvent");

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

    logger.debug({ thingID, zone }, "updateZoneFromEvent");

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

    logger.debug({ thingID, status }, "updateSystemTroubleStatusFromEvent");

    await this.update({
      Key: { thingID },
      UpdateExpression: `SET systemTroubleStatus = :status`,
      ExpressionAttributeValues: {
        ":status": status
      }
    });
  }
}
