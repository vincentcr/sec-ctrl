import { Context } from "koa";
import * as Router from "koa-router";
import { IMiddleware } from "koa-router";
import initValidators, { ValidatorBuilder } from "./validate";

import { User } from "../../../common/user";
import {
  InvalidCredentialsError,
  SiteDoesNotExistError,
  UserNotAuthorizedError
} from "../errors";
import Services from "../services";

export interface Middlewares {
  validators: ValidatorBuilder;
  authenticate: IMiddleware;
  authorize: IMiddleware;
  getClaimedSite: IMiddleware;
}

export async function setupMiddlewares({
  models
}: Services): Promise<Middlewares> {
  const validators = await initValidators();

  const middlewares = {
    validators,
    async getClaimedSite(ctx: Router.IRouterContext, next: () => Promise<any>) {
      const user = ctx.state.user as User;
      const site = await models.Sites.getByID(ctx.params.siteId);
      if (site == null || site.ownerId !== user.id) {
        throw new SiteDoesNotExistError();
      }

      ctx.state.site = site;
      return next();
    },

    async authenticate(ctx: Router.IRouterContext, next: () => Promise<any>) {
      const token = findRequestAuthToken(ctx);
      if (token == null) {
        return next();
      }

      const user = await models.Users.authenticateByToken(token);
      if (user == null) {
        throw new InvalidCredentialsError("invalid token");
      }

      ctx.state.user = user;
      ctx.state.token = token;
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
    const match = /^Bearer (.+)$/.exec(ctx.headers.authorization);
    if (match != null) {
      return match[1];
    }
  }

  const tok = ctx.cookies.get("token");

  if (typeof tok === "string") {
    return tok;
  }
}
