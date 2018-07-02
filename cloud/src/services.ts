import * as dateFns from "date-fns";
import AWS = require("aws-sdk");
import { initModels, Models } from "./models";
import { Site } from "../../common/site";
import { UserCommand } from "../../common/userCommand";

export default class Services {
  readonly models: Models;
  private readonly iot: AWS.IotData;

  static async create() {
    const [models, iot] = await Promise.all([
      initModels(new AWS.DynamoDB.DocumentClient()),
      initIotDataPlane()
    ]);
    return new Services(models, iot);
  }

  private constructor(models: Models, iot: AWS.IotData) {
    this.models = models;
    this.iot = iot;
  }

  async sendCommand(params: { cmd: UserCommand; site: Site }) {
    const { cmd, site } = params;
    const validUntil = dateFns.addSeconds(new Date(), 30);
    const fullCmd: UserCommand = { validUntil, ...cmd };
    const payload = JSON.stringify(fullCmd);
    await this.iot.publish({
      topic: `sec-ctrl/${site.thingID}/commands`,
      qos: 1,
      payload
    });
  }
}

async function initIotDataPlane() {
  const iot = new AWS.Iot();
  const iotEndpointResponse = await iot.describeEndpoint().promise();

  const iotData = new AWS.IotData({
    endpoint: iotEndpointResponse.endpointAddress
  });

  return iotData;
}
