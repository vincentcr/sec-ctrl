import * as AWS from "aws-sdk";
import * as bodyParser from "body-parser";
import * as compression from "compression";
import * as cookieParser from "cookie-parser";
import * as cors from "cors";
import * as dateFns from "date-fns";
import * as express from "express";

import { initModels, Models, SiteRecord, UserRecord } from "./models";
import initValidators from "./validate";

interface SecCtrlApp {
  router: express.Express;
  models: Models;
}

export async function init(): Promise<SecCtrlApp> {
  const router = express();
  router.use(compression());
  router.use(cors());
  router.use(bodyParser.json());
  router.use(cookieParser());
  router.use(bodyParser.urlencoded({ extended: true }));

  const models = await initModels(new AWS.DynamoDB.DocumentClient());

  const app = { router, models };

  await initRoutes(app);

  return app;
}

async function initRoutes(app: SecCtrlApp) {
  const { router, models } = app;
  const [validate, iot] = await Promise.all([
    initValidators(),
    initIotDataPlane()
  ]);
  const authenticate = mkAuthMiddleware(models);
  const getUserSite = mkGetUserSite(models);

  router.get("/", async (req, res) => {
    res.json({ sec_ctrl: "1.0.0" });
  });

  type AsyncRequestHandler = (
    req: express.Request,
    res: express.Response
  ) => Promise<void>;

  function asyncM(handler: AsyncRequestHandler): express.RequestHandler {
    return (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      handler(req, res).catch(next);
    };
  }

  router.post(
    "/users/signup",
    validate("users-signup"),
    asyncM(async (req, res) => {
      const user = await models.Users.create(req.body);
      const accessToken = await models.AccessTokens.create(user.id);
      res.json(accessToken);
    })
  );

  router.post("/users/signin", validate("users-signin"), async (req, res) => {
    const user = await models.Users.authenticate(req.body);
    const accessToken = await models.AccessTokens.create(user.id);
    res.json(accessToken);
  });

  // router.post("/users/signout");
  // router.get("/users/:id");

  const sitesRouter = express.Router();
  router.use("/sites", sitesRouter);

  sitesRouter.use(authenticate);

  sitesRouter.post("/:thingID/claim", async (req, res) => {
    const claimedByID = res.locals.user.id as string;
    const thingID = req.params.thingID as string;
    await models.Sites.claim({ claimedByID, thingID });
    res.status(204);
    res.end();
  });

  sitesRouter.get("/:thingID", getUserSite, async (req, res) => {
    res.json(res.locals.site);
  });

  sitesRouter.post(
    "/:thingID/command",
    validate("sites-thingID-command"),
    getUserSite,
    async (req, res) => {
      const validUntil = dateFns.addSeconds(new Date(), 30);
      const cmd = { validUntil, ...req.body };
      const site = res.locals.site as SiteRecord;
      const payload = JSON.stringify(cmd);
      await iot.publish({
        topic: `sec-ctrl/${site.thingID}/commands`,
        qos: 1,
        payload
      });
      res.status(202);
      res.end();
    }
  );

  sitesRouter.get(
    "/:thingID/events",
    validate("sites-thingID-events"),
    getUserSite,
    async (req, res) => {
      const { thingID } = res.locals.site;

      let limit: number | undefined;
      if (req.query.limit) {
        limit = parseInt(req.query.limit, 10);
      }

      let cursor: object | undefined;
      if (req.query.cursor) {
        cursor = JSON.parse(req.query.cursor);
      }

      const results = models.SiteEvents.getByThingID({
        thingID,
        limit,
        cursor
      });
      res.json(results);
    }
  );
}

async function initIotDataPlane() {
  const iot = new AWS.Iot();
  const iotEndpointResponse = await iot.describeEndpoint().promise();

  const iotData = new AWS.IotData({
    endpoint: iotEndpointResponse.endpointAddress
  });

  return iotData;
}

function mkGetUserSite(models: Models): express.RequestHandler {
  async function getUserSite(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const user = res.locals.user as UserRecord;
    const site = await models.Sites.getByThingID(req.params.thingID);
    if (site == null || site.claimedByID !== user.id) {
      res.status(404);
      res.json({ reason: "unknown site" });
      return;
    }

    res.locals.site = site;
    next();
  }
  return getUserSite;
}

function mkAuthMiddleware(models: Models): express.RequestHandler {
  async function authenticate(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const tok = findRequestAuthToken(req);
    if (tok == null) {
      next();
      return;
    }

    const userID = await models.AccessTokens.authenticate(tok);
    if (userID == null) {
      res.status(401);
      res.json({ reason: "invalid access token" });
      return;
    }

    res.locals.user = await models.Users.getByID(userID);
    next();
  }
  return authenticate;
}

function findRequestAuthToken(req: express.Request): string | undefined {
  if (typeof req.headers.authorization === "string") {
    const match = /^Token (.+)$/.exec(req.headers.authorization);
    if (match != null) {
      return match[1];
    }
  }

  if (typeof req.cookies.token === "string") {
    return req.cookies.token;
  }
}
