import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

import * as Ajv from "ajv";
import { NextFunction, Request, RequestHandler, Response } from "express";

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

export default async function initValidators() {
  const ajv = new Ajv();
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

function validate(ajv: Ajv.Ajv, schemaName: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const { query, body } = req;
    const valid = ajv.validate(schemaName, { query, body });
    if (valid) {
      next();
      return;
    }

    const error = ajv.errors![0];
    res.status(400);
    res.json({
      name: error.propertyName,
      type: error.keyword,
      message: error.message,
      dataPath: error.dataPath
    });
  };
}