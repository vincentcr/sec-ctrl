import * as Koa from "koa";
import * as _ from "lodash";
import * as bodyParser from "koa-bodyparser";
import { VError } from "verror";

import { Services } from "../services";
import logger from "../logger";
import { setupRoutes } from "./routes";
import { setupMiddlewares } from "./middlewares";

export default async function createApp(services: Services): Promise<Koa> {
  const app = new Koa();
  app.use(bodyParser());
  app.use(errorMiddleware);
  app.on("error", errorHandler);

  const middlewares = await setupMiddlewares(services);
  await setupRoutes({ services, app, middlewares });

  return app;
}

async function errorMiddleware(ctx: Koa.Context, next: () => Promise<any>) {
  try {
    await next();
  } catch (err) {
    ctx.status = VError.info(err).httpStatusCode || 500;

    const isPublicOverride = VError.info(err).isPublic;
    ctx.state.isPublicErr =
      isPublicOverride != null ? isPublicOverride : ctx.status < 500;

    if (ctx.state.isPublicErr) {
      const meta = _.omit(VError.info(err), "httpStatusCode");
      const info = _.pick(err, "message", "name");
      ctx.body = { ...meta, ...info };
    } else {
      ctx.body = {
        name: "InternalError",
        message: "Internal Server Error"
      };
    }
    ctx.app.emit("error", err, ctx);
  }
}

function errorHandler(err: Error, ctx: Koa.Context) {
  const userID = ctx.state.user != null ? ctx.state.user.id : undefined;

  const level = ctx.state.isPublicErr ? "info" : "error";

  logger[level](
    { req: ctx.request, err, userID, resp: ctx.response },
    "request failed"
  );
}
