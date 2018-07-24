// tslint:disable:no-console
import * as fs from "fs";
import * as path from "path";
import * as util from "util";

import * as AWS from "aws-sdk";
import * as config from "config";
import * as Knex from "knex";
import * as uuid from "uuid/v4";

import * as AWSMocks from "aws-sdk-mock";
import * as chai from "chai";
import "mocha";

import createApp from "../src/api/app";
import { connect, Models } from "../src/models";
import { BaseModel } from "../src/models/BaseModel";
import Services, { IotPublisher } from "../src/services";

const { expect } = chai;
const readFile = util.promisify(fs.readFile);

export interface MockIotPublisher {
  requests: AWS.IotData.Types.PublishRequest[];
  publish: IotPublisher;
  clear(): void;
}

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

  async expectNoRecordAdded(
    tableName: string,
    work: Promise<any>
  ): Promise<void> {
    const conn = this.getConnection();
    const [{ count: countBefore }] = await conn.count("*").from(tableName);
    await work;
    const [{ count: countAfter }] = await conn.count("*").from(tableName);
    expect(countAfter).to.equal(countBefore);
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

  async createServices(iotPublisher: IotPublisher): Promise<Services> {
    return Services.create(iotPublisher);
  },

  mkMockIotPublisher(): MockIotPublisher {
    const requests: AWS.IotData.Types.PublishRequest[] = [];

    return {
      requests,
      async publish(req: AWS.IotData.Types.PublishRequest) {
        requests.push(req);
      },
      clear() {
        requests.splice(0, requests.length);
      }
    };
  },

  async createApp(iotPublisher?: IotPublisher) {
    const services = await this.createServices(
      iotPublisher || this.mkMockIotPublisher().publish
    );
    return createApp(services);
  }
};

export default TestUtils;

async function runDDLs(knex: Knex) {
  console.time("runDDLs");
  for (const fname of ["tables.sql", "functions.sql"]) {
    const fullPath = path.join(__dirname, "..", "db", fname);
    const sql = await readFile(fullPath, "utf8");
    await knex.raw(sql);
  }
  console.timeEnd("runDDLs");
}
