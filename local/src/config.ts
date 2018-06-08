import * as fs from "fs";

const CONFIG_FILE = "./config.json";

export interface LocalConfig {
  port: number;
  hostname: string;
  password: string;
  statusRefreshIntervalMs: number;
  keepAliveIntervalMs: number;
}

export interface CloudConfig {
  clientId: string;
  dataDir: string;
  host: string;
}

export interface Config {
  cloud: CloudConfig;
  local: LocalConfig;
}

export function loadConfig(): Config {
  const json = fs.readFileSync(CONFIG_FILE).toString("utf-8");
  return JSON.parse(json);
}
