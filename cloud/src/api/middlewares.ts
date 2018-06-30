import { Models, UserRecord } from "../models";
import { IMiddleware } from "koa-router";
import * as Router from "koa-router";
import initValidators from "./validate";
import { Services } from "../services";
import { Context } from "koa";

export async function setupMiddlewares({ models }: Services) {
  const validators = await initValidators();
  const authorize = mkAuthorize(models);
  const getUserSite = mkGetUserSite(models);

  return { authorize, validators, getUserSite };
}

function mkGetUserSite(models: Models): IMiddleware {
  async function getUserSite(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ) {
    const user = ctx.state.user as UserRecord;
    const site = await models.Sites.getByThingID(ctx.params.thingID);
    if (site == null || site.claimedByID !== user.id) {
      ctx.response.status = 404;
      ctx.response.body = { reason: "unknown site" };
      return;
    }

    ctx.state.site = site;
    next();
  }
  return getUserSite;
}

function mkAuthorize(models: Models): IMiddleware {
  async function authenticate(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ) {
    const tok = findRequestAuthToken(ctx);
    if (tok == null) {
      return next();
    }

    const userID = await models.AccessTokens.authenticate(tok);
    if (userID == null) {
      ctx.response.status = 401;
      ctx.response.body = { reason: "invalid access token" };
      return;
    }

    ctx.state.user = await models.Users.getByID(userID);
    return next();
  }
  return authenticate;
}

function findRequestAuthToken(ctx: Context): string | undefined {
  if (typeof ctx.headers.authorization === "string") {
    const match = /^Token (.+)$/.exec(ctx.headers.authorization);
    if (match != null) {
      return match[1];
    }
  }

  const tok = ctx.cookies.get("token");

  if (typeof tok === "string") {
    return tok;
  }
}
