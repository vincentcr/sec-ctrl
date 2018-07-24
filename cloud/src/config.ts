import * as config from "config";

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
    return config.get(name) as Config[K];
  }
};
