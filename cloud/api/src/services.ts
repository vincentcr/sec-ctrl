import AWS = require("aws-sdk");
import { initModels, Models } from "./models";

export interface Services {
  models: Models;
  iot: AWS.IotData;
}

export default async function createServices() {
  const [models, iot] = await Promise.all([
    initModels(new AWS.DynamoDB.DocumentClient()),
    initIotDataPlane()
  ]);

  return { models, iot };
}

async function initIotDataPlane() {
  const iot = new AWS.Iot();
  const iotEndpointResponse = await iot.describeEndpoint().promise();

  const iotData = new AWS.IotData({
    endpoint: iotEndpointResponse.endpointAddress
  });

  return iotData;
}
