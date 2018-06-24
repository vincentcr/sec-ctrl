import * as http from "http";

import { APIGatewayEvent, Context } from "aws-lambda";
import * as awsServerlessExpress from "aws-serverless-express";
import createApp from "./app";
import createServices from "./services";

let server: http.Server;

exports.handler = (event: APIGatewayEvent, context: Context) => {
  lazyInitServer()
    .then(() => {
      awsServerlessExpress.proxy(server, event, context);
    })
    .catch(err => {
      context.fail(err);
    });
};

async function lazyInitServer(): Promise<void> {
  if (server == null) {
    const services = await createServices();
    const app = await createApp(services);
    server = awsServerlessExpress.createServer(app.callback());
  }
}
