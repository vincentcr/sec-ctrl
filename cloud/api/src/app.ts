import * as bodyParser from "body-parser";

import * as awsServerlessExpressMiddleware from "aws-serverless-express/middleware";
import * as compression from "compression";
import * as cors from "cors";
import * as express from "express";

export const app = express();

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(awsServerlessExpressMiddleware.eventContext());

app.get("/", (req, res) => {
  res.json({ hello: "world" });
});

app.post("/foo", (req, res) => {
  res.json({ foo: "bar" });
});
