import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

import { AccessTokenModel } from "../../src/models/AccessTokenModel";
import { UserModel } from "../../src/models/UserModel";

import TestUtils from "../_testUtils";
chai.use(chaiAsPromised);
const { expect } = chai;

let models: { Users: UserModel; AccessTokens: AccessTokenModel };

describe("the AccessToken model", () => {
  before(async () => {
    const knex = TestUtils.getConnection();
    models = {
      Users: new UserModel(knex),
      AccessTokens: new AccessTokenModel(knex)
    };
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
