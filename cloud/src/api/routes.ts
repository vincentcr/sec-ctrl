import * as dateFns from "date-fns";
import * as Koa from "koa";
import { Services } from "../services";
import * as Router from "koa-router";
import { SiteRecord } from "../models";
import { Middlewares } from "./middlewares";
import logger from "../logger";

interface RouteBuilderParam {
  services: Services;
  app: Koa;
  middlewares: Middlewares;
}

export function setupRoutes(params: RouteBuilderParam) {
  setupRootRoutes(params);
  setupUsersRoutes(params);
  setupSitesRoutes(params);
}

function setupRootRoutes({ app }: RouteBuilderParam) {
  const router = new Router();

  router.get("/", async ctx => {
    ctx.body = { name: "sec-ctrl-api", version: "1.0.0" };
  });

  app.use(router.routes()).use(router.allowedMethods());
}

function setupUsersRoutes({ services, app, middlewares }: RouteBuilderParam) {
  const router = new Router({ prefix: "/users" });

  const { models } = services;
  const { validators } = middlewares;

  router.post("/signup", validators("users-signup"), async ctx => {
    const user = await models.Users.create(ctx.request.body);
    const accessToken = await models.AccessTokens.create(user.id);
    ctx.response.body = accessToken;
  });

  router.post("/signin", validators("users-signin"), async ctx => {
    const user = await models.Users.authenticate(ctx.request.body);
    const accessToken = await models.AccessTokens.create(user.id);
    ctx.response.body = accessToken;
  });

  // users.post("/users/signout");
  // users.get("/users/:id");

  app.use(router.routes()).use(router.allowedMethods());
}

function setupSitesRoutes({ services, app, middlewares }: RouteBuilderParam) {
  const { models } = services;
  const { authorize, validators, getClaimedSite } = middlewares;

  const router = new Router({ prefix: "/sites" });
  router.use(authorize);

  router.post("/:thingID/claim", async ctx => {
    const claimedByID = ctx.state.user.id as string;
    const thingID = ctx.params.thingID as string;
    await models.Sites.claim({ claimedByID, thingID });
    ctx.response.status = 204;
  });

  router.get("/:thingID", getClaimedSite, async ctx => {
    ctx.response.body = ctx.state.site;
  });

  router.post(
    "/:thingID/command",
    validators("sites-thingID-command"),
    getClaimedSite,
    async ctx => {
      const validUntil = dateFns.addSeconds(new Date(), 30);
      const cmd = { validUntil, ...ctx.request.body };
      const site = ctx.state.site as SiteRecord;
      const payload = JSON.stringify(cmd);
      await services.iot.publish({
        topic: `sec-ctrl/${site.thingID}/commands`,
        qos: 1,
        payload
      });
      ctx.response.status = 202;
    }
  );

  router.get(
    "/:thingID/events",
    validators("sites-thingID-events"),
    getClaimedSite,
    async ctx => {
      const { thingID } = ctx.state.site;

      let limit: number | undefined;
      if (ctx.query.limit) {
        limit = parseInt(ctx.query.limit, 10);
      }

      let cursor: object | undefined;
      if (ctx.query.cursor) {
        cursor = JSON.parse(ctx.query.cursor);
      }

      const results = await models.SiteEvents.getByThingID({
        thingID,
        limit,
        cursor
      });
      ctx.response.body = results;
    }
  );

  app.use(router.routes()).use(router.allowedMethods());
}
