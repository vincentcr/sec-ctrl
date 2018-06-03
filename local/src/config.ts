import * as fs from "fs";

const CONFIG_FILE = "./config.json";

export type LocalConfig = {
  port: number;
  hostname: string;
  password: string;
  statusRefreshIntervalMs: number;
  keepAliveIntervalMs: number;
};

export type CloudConfig = {
  clientId: string;
  dataDir: string;
  host: string;
};

export type Config = {
  cloud: CloudConfig;
  local: LocalConfig;
};

export function loadConfig(): Config {
  const json = fs.readFileSync(CONFIG_FILE).toString("utf-8");
  return JSON.parse(json);
}
