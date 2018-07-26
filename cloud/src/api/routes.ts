import * as Koa from "koa";
import * as Router from "koa-router";

import { User } from "../../../common/user";
import Services from "../services";
import { Middlewares } from "./middlewares";

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
    ctx.response.body = { user, token: accessToken.token };
  });

  router.post("/signin", validators("users-signin"), async ctx => {
    const user = await models.Users.authenticateByPassword(ctx.request.body);
    const accessToken = await models.AccessTokens.create(user.id);
    ctx.response.body = { user, token: accessToken.token };
  });

  router.get("/me", authorize, async ctx => {
    const user = ctx.state.user as User;
    ctx.response.body = user;
  });

  router.post("/me/signout", authorize, async ctx => {
    await models.AccessTokens.delete(ctx.state.token);
    ctx.response.status = 204;
  });

  app.use(router.routes()).use(router.allowedMethods());
}

function setupSitesRoutes({ services, app, middlewares }: RouteBuilderParam) {
  const { models } = services;
  const { authorize, validators, getClaimedSite } = middlewares;

  const router = new Router({ prefix: "/sites" });
  router.use(authorize);

  router.post("/:siteId/claim", validators("sites-siteId-claim"), async ctx => {
    const user = ctx.state.user as User;
    const siteId = ctx.params.siteId as string;
    const { name } = ctx.request.body;
    await models.Sites.claim({ id: siteId, name, ownerId: user.id });
    ctx.response.status = 204;
  });

  router.get("/:siteId", getClaimedSite, async ctx => {
    ctx.response.body = ctx.state.site;
  });

  router.post(
    "/:siteId/command",
    validators("sites-siteId-command"),
    getClaimedSite,
    async ctx => {
      const cmd = ctx.request.body;
      const siteId = ctx.state.site.id;
      await services.sendCommand({ cmd, siteId });
      ctx.response.status = 202;
    }
  );

  router.get(
    "/:siteId/events",
    validators("sites-siteId-events"),
    getClaimedSite,
    async ctx => {
      const { siteId } = ctx.state.site;
      const { limit, offsetId } = ctx.query;

      const results = await models.SiteEvents.getBySiteId({
        siteId,
        limit,
        offsetId
      });
      ctx.response.body = results;
    }
  );

  app.use(router.routes()).use(router.allowedMethods());
}
