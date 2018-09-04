import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

import * as Ajv from "ajv";
import { IMiddleware, IRouterContext } from "koa-router";
import { ValidationError } from "../errors";

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

export type ValidatorBuilder = (schemaName: string) => IMiddleware;

export default async function initValidators(): Promise<ValidatorBuilder> {
  const ajv = new Ajv({ coerceTypes: true });
  ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
  await loadSchemas(ajv);
  return (schemaName: string) => validate(ajv, schemaName);
}

async function loadSchemas(ajv: Ajv.Ajv) {
  const dir = "api-validation-schemas";
  const schemaPaths = await listSchemas(dir);
  const schemas = await Promise.all(
    schemaPaths.map(schemaPath => loadSchema(schemaPath))
  );
  for (const [name, schema] of schemas) {
    ajv.addSchema(schema, name);
  }
}

async function listSchemas(dirName: string) {
  const fnames = await readdir(dirName);
  const jsons = fnames
    .filter(fname => fname.endsWith(".json"))
    .map(fname => path.join(dirName, fname));
  return jsons;
}

async function loadSchema(schemaPath: string): Promise<[string, object]> {
  const schemaData = await readFile(schemaPath);
  const schema = JSON.parse(schemaData.toString("utf-8"));
  const { name } = path.parse(schemaPath);
  return [name, schema];
}

function validate(ajv: Ajv.Ajv, schemaName: string): IMiddleware {
  return (ctx: IRouterContext, next: () => Promise<any>) => {
    const { query, body } = ctx.request;
    const valid = ajv.validate(schemaName, { query, body });
    if (valid) {
      return next();
    }

    const error = ajv.errors![0];

    throw new ValidationError(
      { dataPath: error.dataPath, type: error.keyword },
      error.message
    );
  };
}
