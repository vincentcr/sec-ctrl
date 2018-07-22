// tslint:disable:no-console

import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import * as uuid from "uuid/v4";

import * as config from "config";
import * as Knex from "knex";
import "mocha";

import createApp from "../src/api/app";
import { connect, Models } from "../src/models";
import { BaseModel } from "../src/models/BaseModel";
import Services from "../src/services";

// tslint:disable-next-line:variable-name
let _knex: Knex;

before(async () => {
  const knex = TestUtils.getConnection();
  await TestUtils.resetDB();
});

after(async () => {
  const knex = TestUtils.getConnection();
  await knex.destroy();
});

export const TestUtils = {
  genUuid() {
    return uuid();
  },

  getConnection() {
    if (_knex == null) {
      _knex = connect(config.get("db"));
    }
    return _knex;
  },

  async resetDB() {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("NOPE: will only reset db in test environment");
    }
    const knex = this.getConnection();
    await runDDLs(knex);
  },

  async clearModels(models: { [k: string]: BaseModel<any> }) {
    console.time("clearModels");
    const knex = this.getConnection();
    const truncates = Object.values(models).map(model =>
      knex.raw(`TRUNCATE ${model.fqTableName} CASCADE`)
    );

    await Promise.all(truncates);
    console.timeEnd("clearModels");
  },

  async createServices(): Promise<Services> {
    return Services.create();
  },

  // async mockIoT(handler:any) {},

  async startApi() {
    const services = await this.createServices();
    const app = await createApp(services);
    app.listen;
  }
};

export default TestUtils;

const readFile = util.promisify(fs.readFile);

async function runDDLs(knex: Knex) {
  console.time("runDDLs");
  for (const fname of ["tables.sql", "functions.sql"]) {
    const fullPath = path.join(__dirname, "..", "db", fname);
    const sql = await readFile(fullPath, "utf8");
    await knex.raw(sql);
  }
  console.timeEnd("runDDLs");
}
