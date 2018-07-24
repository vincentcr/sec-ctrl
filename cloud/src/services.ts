import AWS = require("aws-sdk");
import * as dateFns from "date-fns";
import * as Knex from "knex";

import { EventType, SiteEvent } from "../../common/siteEvent";
import {
  UserCommand,
  UserCommandWithExpiration
} from "../../common/userCommand";
import config from "./config";
import { initModels, Models } from "./models";

export type IotPublisher = (
  req: AWS.IotData.Types.PublishRequest
) => Promise<void>;

export default class Services {
  readonly models: Models;
  private readonly iotPublisher: IotPublisher;

  static instance: Services;
  static async getInstance() {
    if (this.instance == null) {
      const awsPublisher = await mkAwsIotPublisher();
      this.instance = await this.create(awsPublisher);
    }
    return this.instance;
  }

  static async create(iotPublisher: IotPublisher) {
    const models = await initModels(config.get("db"));
    return new Services(models, iotPublisher);
  }

  private constructor(models: Models, iotPublisher: IotPublisher) {
    this.models = models;
    this.iotPublisher = iotPublisher;
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

    await this.iotPublisher({
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

async function mkAwsIotPublisher(): Promise<IotPublisher> {
  const iotData = await initIotDataPlane();

  async function publish(req: AWS.IotData.Types.PublishRequest) {
    await iotData.publish(req).promise();
  }

  return publish;
}

async function initIotDataPlane() {
  const iot = new AWS.Iot();
  const iotEndpointResponse = await iot.describeEndpoint().promise();
  const iotData = new AWS.IotData({
    endpoint: iotEndpointResponse.endpointAddress
  });
  return iotData;
}
