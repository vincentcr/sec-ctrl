import AWS = require("aws-sdk");
import * as dateFns from "date-fns";
import * as Knex from "knex";

import { EventType, SiteEvent } from "../../common/siteEvent";
import {
  UserCommand,
  UserCommandWithExpiration
} from "../../common/userCommand";
import { Config, loadConfig } from "./config";
import { createLogger, Logger } from "./logger";
import { connect, initModels, Models } from "./models";

export type IotPublisher = (
  req: AWS.IotData.Types.PublishRequest
) => Promise<void>;

export interface Services {
  readonly logger: Logger;
  readonly config: Config;
  readonly models: Models;

  sendCommandToSite(params: {
    siteId: string;
    cmd: UserCommand;
    ttlSeconds?: number;
  }): Promise<void>;

  saveEvent(params: {
    siteId: string;
    event: SiteEvent;
    receivedAt: Date;
  }): Promise<void>;

  destroy(): Promise<void>;
}

type ServiceCreateParams = {
  config: Config;
  logger: Logger;
  models: Models;
  iotPublisher: IotPublisher;
};

export class ServicesImpl {
  readonly logger: Logger;
  readonly config: Config;
  readonly models: Models;

  private readonly iotPublisher: IotPublisher;

  constructor(params: ServiceCreateParams) {
    const { config, logger, models, iotPublisher } = params;
    this.config = config;
    this.logger = logger;
    this.models = models;
    this.iotPublisher = iotPublisher;
  }

  async sendCommandToSite(params: {
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
      await this.updateSite({ siteId, event, transaction });

      await this.models.SiteEvents.create({
        siteId,
        events: [event],
        receivedAt,
        transaction
      });

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

let instance: Services;
export async function getServicesInstance(): Promise<Services> {
  if (instance == null) {
    instance = await createServices();
  }
  return instance;
}

async function createServices(): Promise<Services> {
  const [config, iotPublisher] = await Promise.all([
    loadConfig(),
    mkAwsIotPublisher()
  ]);

  const logger = createLogger(config);
  const knex = connect(config.get("db"));

  const models = await initModels({ knex, config, logger });
  return new ServicesImpl({
    config,
    logger,
    models,
    iotPublisher
  });
}
