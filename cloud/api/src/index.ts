import * as http from "http";

import { APIGatewayEvent, Context } from "aws-lambda";
import * as awsServerlessExpress from "aws-serverless-express";
import { init } from "./app";

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
    const app = await init();
    server = awsServerlessExpress.createServer(app.router);
  }
}
