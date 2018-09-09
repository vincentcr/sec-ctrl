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
  // casting to any because @types definition is not up to date and doesn't support 4th parameter.
  console.log("serving request");
  const { promise } = (awsServerlessExpress.proxy as any)(
    server,
    event,
    context,
    "PROMISE"
  );

  return promise;
}

async function lazyInitServer(services: Services): Promise<void> {
  if (server == null) {
    const app = await createApp(services);
    server = awsServerlessExpress.createServer(app.callback());
  }
}
