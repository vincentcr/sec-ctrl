import AWS = require("aws-sdk");
import { LogLevelString } from "bunyan";

import { TypedConfig } from "../../common/typedConfig";

type ConfigSpec = {
  http: {
    port: number;
  };
  db: {
    host: string;
    port?: number;
    database: string;
    user: string;
    password: string;
  };
  security: {
    bcryptRounds: 10;
  };
  logging: {
    level: LogLevelString;
  };
  ssmRoot?: string;
};

export type Config = TypedConfig<ConfigSpec>;

export async function loadConfig(): Promise<Config> {
  const config = new TypedConfig<ConfigSpec>({
    directory: "config",
    envPrefix: "sec_ctrl"
  });

  await loadSsmConfig(config);

  return config;
}

async function loadSsmConfig(config: Config) {
  const ssmRoot = config.get("ssmRoot");
  if (ssmRoot != null) {
    const ssmConf = await fetchSsmConf(ssmRoot);
    for (const { name, value } of ssmConf) {
      config.set(name, value);
    }
  }
}

async function fetchSsmConf(root: string) {
  const ssm = new AWS.SSM();
  const results = await ssm
    .getParametersByPath({ Path: root, Recursive: true })
    .promise();
  return results.Parameters!.map(param => ({
    name: param.Name!.slice(root.length + 1),
    value: param.Value!
  }));
}
