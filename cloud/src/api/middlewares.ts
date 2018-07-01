import { UserRecord } from "../models";
import * as Router from "koa-router";
import initValidators, { ValidatorBuilder } from "./validate";
import { Services } from "../services";
import { Context } from "koa";
import {
  SiteDoesNotExistError,
  UserNotAuthorizedError,
  InvalidCredentialsError
} from "../errors";
import { IMiddleware } from "koa-router";
import logger from "../logger";

export type Middlewares = {
  validators: ValidatorBuilder;
  authenticate: IMiddleware;
  authorize: IMiddleware;
  getClaimedSite: IMiddleware;
};

export async function setupMiddlewares({
  models
}: Services): Promise<Middlewares> {
  const validators = await initValidators();

  const middlewares = {
    validators,
    async getClaimedSite(ctx: Router.IRouterContext, next: () => Promise<any>) {
      const user = ctx.state.user as UserRecord;
      const site = await models.Sites.getByThingID(ctx.params.thingID);
      if (site == null || site.claimedByID !== user.id) {
        throw new SiteDoesNotExistError();
      }

      ctx.state.site = site;
      return next();
    },

    async authenticate(ctx: Router.IRouterContext, next: () => Promise<any>) {
      const tok = findRequestAuthToken(ctx);
      if (tok == null) {
        return next();
      }

      const userID = await models.AccessTokens.authenticate(tok);
      if (userID == null) {
        throw new InvalidCredentialsError("invalid token");
      }

      ctx.state.user = await models.Users.getByID(userID);
      return next();
    },

    async authorize(ctx: Router.IRouterContext, next: () => Promise<any>) {
      if (ctx.state.user == null) {
        throw new UserNotAuthorizedError();
      }
      return next();
    }
  };

  return middlewares;
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
