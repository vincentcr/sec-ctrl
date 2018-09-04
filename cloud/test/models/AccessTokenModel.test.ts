import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

import { Models } from "../../src/models";

import TestUtils from "../_testUtils";
chai.use(chaiAsPromised);
const { expect } = chai;

let models: Models;

describe("the AccessToken model", () => {
  before(async () => {
    models = await TestUtils.createModels();
  });

  describe("the create method", () => {
    it("inserts a new token in the database for an existing user", async () => {
      const user = await models.Users.create({
        username: TestUtils.genUuid(),
        password: "bar"
      });

      const tok = await models.AccessTokens.create(user.id);

      expect(tok).to.not.be.null;
    });

    it("errors out if the user does not exist", async () => {
      const invalidID = "73c501060788462680eb07a617648539";
      await expect(
        models.AccessTokens.create(invalidID)
      ).to.be.eventually.rejectedWith(Error);
    });
  });
});
