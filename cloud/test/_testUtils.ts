// tslint:disable:no-console
import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as util from "util";

import * as AWS from "aws-sdk";
import * as chai from "chai";
import * as Knex from "knex";
import "mocha";
import * as uuid from "uuid/v4";

import createApp from "../src/api/app";
import { Config, loadConfig } from "../src/config";
import { createLogger, Logger } from "../src/logger";
import { connect, initModels, Models } from "../src/models";
import { BaseModel } from "../src/models/BaseModel";
import { IotPublisher, Services, ServicesImpl } from "../src/services";

const { expect } = chai;
const readFile = util.promisify(fs.readFile);

export interface MockIotPublisher {
  requests: AWS.IotData.Types.PublishRequest[];
  publish: IotPublisher;
  clear(): void;
}

// tslint:disable-next-line:variable-name
let _knex: Knex;
// tslint:disable-next-line:variable-name
let _config: Config;
// tslint:disable-next-line:variable-name
let _logger: Logger;

before(async () => {
  await initConfig();
  await initConnection();
  await initLogger();
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

  getConfig(): Config {
    return _config;
  },

  getConnection(): Knex {
    return _knex;
  },

  getLogger() {
    return _logger;
  },

  async expectNoRecordAdded(
    tableName: string,
    work: PromiseLike<any>
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

  async createModels(): Promise<Models> {
    const config = this.getConfig();
    const knex = this.getConnection();
    const logger = this.getLogger();
    const models = await initModels({ knex, config, logger });

    return models;
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
    const [knex, config] = await Promise.all([
      this.getConnection(),
      this.getConfig()
    ]);

    const logger = createLogger(config);
    const models = await initModels({ config, knex, logger });

    return new ServicesImpl({ models, logger, config, iotPublisher });
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

async function initConfig() {
  _config = await loadConfig();
}

async function initConnection() {
  _knex = connect(_config.get("db"));
}

async function initLogger() {
  _logger = createLogger(_config);
}
