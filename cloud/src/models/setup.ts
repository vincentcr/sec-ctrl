import * as Knex from "knex";
import * as _ from "lodash";
import * as yargs from "yargs";

import { VError } from "verror";
import { Config, loadConfig } from "../config";
import { createLogger } from "../logger";
import { connect, initModels, Models } from "./index";

type SetupParams =
  | {
      all: true;
    }
  | SetupGranularParams;

type SetupGranularParams = {
  user?: boolean;
  db?: boolean;
  ext?: boolean;
  schema?: boolean;
};

async function main() {
  const argv = yargs
    .boolean("all")
    .boolean("user")
    .boolean("db")
    .boolean("ext")
    .boolean("schema")
    .boolean("drop")
    .boolean("create")
    .default("create", true).argv;

  const config = await loadConfig();
  const params = _.pick(argv, "all", "user", "db", "ext", "schema");

  if (argv.drop) {
    await drop(config, params);
  }
  if (argv.create) {
    await create(config, params);
  }
}

export async function create(config: Config, params: SetupParams) {
  const { user, db, ext, schema } = granularizeParams(params);

  const logger = createLogger(config);

  logger.info("Creating database infrastructure", {
    config: config.getAll(),
    params
  });

  const connConfig = config.get("db");

  if (db || user) {
    // connect as admin into the admin db.
    const knex = getAdminConnection(config);

    if (user) {
      logger.info("Creating user %s", connConfig.user);
      await createUser(knex, {
        user: connConfig.user,
        password: connConfig.password
      });
    }

    if (db) {
      logger.info("Creating database %s", connConfig.database);
      await createDatabase(knex, {
        user: connConfig.user,
        database: connConfig.database
      });
    }

    await knex.destroy();
  }

  if (ext) {
    // connect _as admin_ into the _app_ db
    const knex = getAppConnectionAsAdmin(config);
    logger.info("Creating extensions in db: %s", connConfig.database);
    await createExtensions(knex, connConfig.user);
    await knex.destroy();
  }

  if (schema) {
    logger.info("Creating schema in db: %s", connConfig.database);
    const knex = getAppConnection(config);
    const models = await initModels({ logger, knex, config });
    await createSchema(models);
    await models.destroy();
  }
}

function granularizeParams(params: SetupParams): SetupGranularParams {
  if ("all" in params) {
    return { user: true, db: true, ext: true, schema: true };
  } else {
    return params;
  }
}

function getAppConnection(config: Config) {
  return connect(config.get("db"));
}

function getAdminConnection(config: Config) {
  const connConfig = {
    ...config.get("db"),
    ...config.get("adminDB")
  };

  return connect(connConfig);
}

function getAppConnectionAsAdmin(config: Config) {
  const { user, password } = config.get("adminDB");

  const connConfig = {
    ...config.get("db"),
    user,
    password
  };

  return connect(connConfig);
}

async function createDatabase(
  knex: Knex,
  params: { database: string; user: string }
) {
  await execSql(knex, `CREATE DATABASE :database: OWNER :user:`, params);
}

async function createUser(
  knex: Knex,
  params: {
    user: string;
    password: string;
  }
) {
  await execSql(knex, `CREATE ROLE :user: LOGIN PASSWORD :password`, params);
}

async function createExtensions(knex: Knex, owner: string) {
  await execSql(
    knex,
    `
    CREATE SCHEMA ext;
    CREATE EXTENSION pgcrypto WITH SCHEMA ext;

    GRANT USAGE ON SCHEMA ext TO :owner:;
    GRANT SELECT ON ALL TABLES IN SCHEMA ext TO :owner:;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ext TO :owner:;

    ALTER SCHEMA public OWNER to :owner:;
      `,
    {
      owner
    }
  );
}

async function createSchema(models: Models) {
  await models.Users.ensureSchema();
  await models.AccessTokens.ensureSchema();
  await models.Sites.ensureSchema();
  await models.SitePartitions.ensureSchema();
  await models.SiteZones.ensureSchema();
  await models.SiteEvents.ensureSchema();
}

export async function drop(config: Config, params: SetupParams) {
  const { user, db, ext, schema } = granularizeParams(params);

  const logger = createLogger(config);

  const connConfig = config.get("db");

  logger.info("Dropping database infrastructure", {
    config: config.getAll(),
    params
  });

  if (schema) {
    await ifDbExists(
      () => getAppConnectionAsAdmin(config),
      async knex => {
        logger.info("Dropping schema");
        const models = await initModels({ logger, knex, config });
        await dropSchema(knex, models);
      }
    );
  }

  if (ext) {
    await ifDbExists(
      () => getAppConnectionAsAdmin(config),
      async knex => {
        logger.info("Dropping extensions");
        await dropExtensions(knex);
      }
    );
  }

  if (db || user) {
    const knex = getAdminConnection(config);
    if (db) {
      logger.info("Dropping database", connConfig.database);
      await dropDatabase(knex, connConfig.database);
    }
    if (user) {
      logger.info("Dropping user", connConfig.user);
      await dropUser(knex, connConfig.user);
    }
    await knex.destroy();
  }
}

async function ifDbExists(
  getConnection: () => Knex,
  work: (conn: Knex) => Promise<void>
) {
  let knex: Knex;
  try {
    knex = getConnection();
    await knex.raw("SELECT 1");
  } catch (err) {
    if (err.code === "3D000") {
      return;
    } else {
      throw new VError({ cause: err }, "Failed to establish connection");
    }
  }

  await work(knex);
  await knex.destroy();
}

async function dropSchema(knex: Knex, models: Models) {
  for (const model of [
    models.Users,
    models.AccessTokens,
    models.SiteEvents,
    models.Sites,
    models.SitePartitions,
    models.SiteZones
  ]) {
    await execSql(knex, "DROP TABLE IF EXISTS :table: CASCADE", {
      table: model.fqTableName
    });
  }
}

async function dropExtensions(knex: Knex) {
  await execSql(knex, "DROP SCHEMA IF EXISTS ext CASCADE");
}

async function dropDatabase(knex: Knex, database: string) {
  await execSql(knex, "DROP DATABASE IF EXISTS :database:", { database });
}

async function dropUser(knex: Knex, user: string) {
  await execSql(knex, "DROP USER IF EXISTS :user:", { user });
}

async function execSql(knex: Knex, sql: string, params?: { [k: string]: any }) {
  const fullSql = params ? knex.raw(sql, params).toQuery() : sql;

  try {
    await knex.raw(fullSql);
  } catch (err) {
    throw new VError(
      { cause: err, info: { fullSql, sql, params } },
      "failed to execute query"
    );
  }
}

main().catch(err => {
  // tslint:disable-next-line:no-console
  console.log("Database setup failed:", err);
  process.exit(1);
});
