import * as fs from "fs";
import * as path from "path";

import * as nconf from "nconf";

const CONFIG_ENV_PREFIX = "sec_ctrl__";
const CONFIG_DIR = "config";

type Config = {
  http: {
    port: number;
  };
  db: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  security: {
    bcryptRounds: 10;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error" | "fatal";
  };
};

export default {
  get<K extends keyof Config>(name: K): Config[K] {
    return nconf.get(name) as Config[K];
  }
};

export function reload() {
  nconf.reset();
  loadConfigFromEnvVars();
  const nodeEnv = process.env.NODE_ENV || "development";
  [nodeEnv + "-local", "local", nodeEnv, "default"].forEach(loadConfigFile);
}

function loadConfigFromEnvVars() {
  nconf.env({
    separator: "__",
    parseValues: true,
    transform: mapEnvVarToConfig
  });
}

function mapEnvVarToConfig(obj: { key: string; value: any }) {
  const { key, value } = obj;
  if (key.startsWith(CONFIG_ENV_PREFIX)) {
    return {
      key: key.slice(CONFIG_ENV_PREFIX.length),
      value
    };
  } else {
    return null;
  }
}

function loadConfigFile(name: string) {
  const fname = path.join(CONFIG_DIR, name + ".json");
  if (fs.existsSync(fname)) {
    nconf.file(name, { file: fname });
  }
}

reload();
