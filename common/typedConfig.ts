import * as fs from "fs";
import * as path from "path";

import * as nconf from "nconf";

export class TypedConfig<TConfig extends { [k: string]: any }> {
  private readonly envPrefix: string;
  private readonly directory: string;

  constructor(params: { directory: string; envPrefix: string }) {
    const { directory, envPrefix } = params;
    this.directory = directory;
    this.envPrefix = envPrefix + "__";

    this.reload();
  }

  get<K extends keyof TConfig>(name: K): TConfig[K] {
    return nconf.get(name as string) as TConfig[K];
  }

  getAll(): TConfig {
    return nconf.get();
  }

  set(key: string, value: any) {
    nconf.set(key, value);
  }

  reload() {
    nconf.reset();
    this.loadConfigFromEnvVars();
    const nodeEnv = process.env.NODE_ENV || "development";
    [nodeEnv + "-local", "local", nodeEnv, "default"].forEach(name => {
      this.loadConfigFile(name);
    });
  }

  private loadConfigFromEnvVars() {
    nconf.env({
      separator: "__",
      parseValues: true,
      transform: this.mapEnvVarToConfig.bind(this)
    });
  }

  private mapEnvVarToConfig(obj: { key: string; value: any }) {
    const { key, value } = obj;
    if (key.startsWith(this.envPrefix)) {
      return {
        key: key.slice(this.envPrefix.length),
        value
      };
    } else {
      return null;
    }
  }

  private loadConfigFile(name: string) {
    const fname = path.join(this.directory, name + ".json");
    if (fs.existsSync(fname)) {
      nconf.file(name, { file: fname });
    }
  }
}
