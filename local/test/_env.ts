process.env.NODE_ENV = "test";
// tslint:disable-next-line:no-var-requires
require("ts-node").register({
  project: "test/tsconfig.json"
});
