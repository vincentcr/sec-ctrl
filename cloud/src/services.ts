import AWS = require("aws-sdk");
import * as config from "config";
import * as dateFns from "date-fns";
import * as Knex from "knex";
import { Site } from "../../common/site";
import { EventType, SiteEvent } from "../../common/siteEvent";
import {
  UserCommand,
  UserCommandWithExpiration
} from "../../common/userCommand";
import { initModels, Models } from "./models";

export default class Services {
  readonly models: Models;
  private readonly iot: AWS.IotData;

  static instance: Services;
  static async getInstance() {
    if (this.instance == null) {
      this.instance = await this.create();
    }
    return this.instance;
  }

  static async create() {
    const [models, iot] = await Promise.all([
      initModels(config.get("db")),
      Services.initIotDataPlane()
    ]);
    return new Services(models, iot);
  }

  private static async initIotDataPlane() {
    const iot = new AWS.Iot();
    const iotEndpointResponse = await iot.describeEndpoint().promise();
    const iotData = new AWS.IotData({
      endpoint: iotEndpointResponse.endpointAddress
    });
    return iotData;
  }

  private constructor(models: Models, iot: AWS.IotData) {
    this.models = models;
    this.iot = iot;
  }

  async sendCommand(params: {
    siteId: string;
    cmd: UserCommand;
    ttlSeconds?: number;
  }) {
    const { siteId, cmd, ttlSeconds = 30 } = params;
    const expiresAt = dateFns.addSeconds(new Date(), ttlSeconds);
    const cmdWithExpiration: UserCommandWithExpiration = { ...cmd, expiresAt };
    const payload = JSON.stringify(cmdWithExpiration);

    await this.iot.publish({
      topic: `sec-ctrl/${siteId}/commands`,
      qos: 1,
      payload
    });
  }

  async saveEvent(params: {
    siteId: string;
    event: SiteEvent;
    receivedAt: Date;
  }) {
    const { siteId, event, receivedAt } = params;

    await this.models.withTransaction(async transaction => {
      await this.models.SiteEvents.create({
        siteId,
        events: [event],
        receivedAt,
        transaction
      });

      await this.updateSite({ siteId, event, transaction });

      await transaction.commit();
    });
  }

  private async updateSite(params: {
    siteId: string;
    event: SiteEvent;
    transaction: Knex.Transaction;
  }) {
    const { siteId, event, transaction } = params;

    await this.models.Sites.upsertFromEvent({
      id: siteId,
      event,
      transaction
    });

    switch (event.type) {
      case EventType.PartitionChange:
        await this.models.SitePartitions.upsertFromEvent({
          siteId,
          event,
          transaction
        });
        break;
      case EventType.ZoneChange:
        await this.models.SiteZones.upsertFromEvent({
          siteId,
          event,
          transaction
        });
        break;
    }
  }

  async destroy() {
    this.models.destroy();
  }
}
