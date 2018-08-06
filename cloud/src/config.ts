import { LogLevelString } from "bunyan";

import { TypedConfig } from "../../common/typedConfig";

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
    level: LogLevelString;
  };
};

export default new TypedConfig<Config>({
  directory: "config",
  envPrefix: "sec_ctrl"
});
