import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";

const CONFIG_FOLDER = "./config";

export interface LocalConfig {
  port: number;
  hostname: string;
  password: string;
  statusRefreshIntervalMs: number;
  keepAliveIntervalMs: number;
}

export interface CloudConfig {
  clientId: string;
  host: string;
}

export interface Config {
  dataDir: string;
  cloud: CloudConfig;
  local: LocalConfig;
}

export function loadConfig(): Config {
  const defaults = loadFile(path.join(CONFIG_FOLDER, "default.json"));
  const env = process.env.NODE_ENV || "dev";
  const envFile = path.join(CONFIG_FOLDER, env + ".json");
  const envConf = fs.existsSync(envFile) ? loadFile(envFile) : {};
  return _.merge(defaults, envConf);
}

function loadFile(fname: string) {
  const json = fs.readFileSync(fname).toString("utf-8");
  return JSON.parse(json);
}
