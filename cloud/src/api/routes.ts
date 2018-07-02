import * as Koa from "koa";
import * as Router from "koa-router";

import Services from "../services";
import { Middlewares } from "./middlewares";
import { User } from "../models";

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
  const { validators, authorize } = middlewares;

  router.post("/signup", validators("users-signup"), async ctx => {
    const user = await models.Users.create(ctx.request.body);
    const accessToken = await models.AccessTokens.create(user.id);
    ctx.response.body = { ...user, token: accessToken.token };
  });

  router.post("/signin", validators("users-signin"), async ctx => {
    const user = await models.Users.authenticate(ctx.request.body);
    const accessToken = await models.AccessTokens.create(user.id);
    ctx.response.body = { ...user, token: accessToken.token };
  });

  router.get("/me", authorize, async ctx => {
    const user = ctx.state.user as User;
    ctx.response.body = user;
  });

  router.post("/users/:id/signout", authorize, async ctx => {
    throw new Error("not implemented :(");
  });

  app.use(router.routes()).use(router.allowedMethods());
}

function setupSitesRoutes({ services, app, middlewares }: RouteBuilderParam) {
  const { models } = services;
  const { authorize, validators, getClaimedSite } = middlewares;

  const router = new Router({ prefix: "/sites" });
  router.use(authorize);

  router.post(
    "/:thingID/claim",
    validators("sites-thingID-claim"),
    async ctx => {
      const user = ctx.state.user as User;
      const thingID = ctx.params.thingID as string;
      await models.Sites.claim({ claimedByID: user.id, thingID });
      await models.Users.addClaimedThing({
        ...ctx.request.body,
        username: user.username,
        thingID
      });
      ctx.response.status = 204;
    }
  );

  router.get("/:thingID", getClaimedSite, async ctx => {
    ctx.response.body = ctx.state.site;
  });

  router.post(
    "/:thingID/command",
    validators("sites-thingID-command"),
    getClaimedSite,
    async ctx => {
      const cmd = ctx.request.body;
      const site = ctx.state.site;
      await services.sendCommand({ cmd, site });
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
