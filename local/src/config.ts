import { LogLevelString } from "bunyan";

import { TypedConfig } from "../../common/typedConfig";

export interface LocalConfig {
  port: number;
  hostname: string;
  password: string;
  statusRefreshIntervalMs: number;
  keepAliveIntervalMs: number;
  maxReconnectAttemts: number;
  maxBackoffExponent: number;
  maxWriteBufferSize: number;
}

export interface CloudConfig {
  clientId: string;
  host: string;
}

export interface Config {
  dataDir: string;
  logging: {
    level: LogLevelString;
  };
  cloud: CloudConfig;
  local: LocalConfig;
}

export default new TypedConfig<Config>({
  directory: "config",
  envPrefix: "sec_ctrl_local"
});
