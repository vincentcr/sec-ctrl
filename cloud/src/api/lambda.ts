import * as http from "http";

import { APIGatewayEvent, Context } from "aws-lambda";
import * as awsServerlessExpress from "aws-serverless-express";
import { Services } from "../services";
import createApp from "./app";

let server: http.Server;

export async function handler(
  services: Services,
  event: APIGatewayEvent,
  context: Context
) {
  await lazyInitServer(services);
  awsServerlessExpress.proxy(server, event, context);
}

async function lazyInitServer(services: Services): Promise<void> {
  if (server == null) {
    const app = await createApp(services);
    server = awsServerlessExpress.createServer(app.callback());
  }
}
