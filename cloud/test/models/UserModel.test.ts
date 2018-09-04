import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as _ from "lodash";
import "mocha";

import { UserModel } from "../../src/models/UserModel";

import { User } from "../../../common/user";
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  UsernameNotFoundError
} from "../../src/errors";
import { Models } from "../../src/models";
import { AccessToken } from "../../src/models/AccessTokenModel";
import TestUtils from "../_testUtils";

chai.use(chaiAsPromised);
const { expect } = chai;

let models: Models;

describe("the User model", () => {
  before(async () => {
    models = await TestUtils.createModels();
  });

  describe("the create method", () => {
    it("creates a new user", async () => {
      const username = TestUtils.genUuid();
      const password = TestUtils.genUuid();
      const user = await models.Users.create({
        username,
        password
      });

      expect(user).to.be.an("object");
      expect(user.id).to.be.a("string");
      expect(user.username).to.equal(username);

      const [userInDb] = await TestUtils.getConnection()
        .select()
        .from("users")
        .where({ username });

      expect(_.pick(userInDb, "id", "username")).to.deep.equal(user);
    });

    it("fails if user with same username already exists", async () => {
      const username = TestUtils.genUuid();
      const password = TestUtils.genUuid();
      const user = await models.Users.create({
        username,
        password
      });

      expect(
        models.Users.create({
          username,
          password
        })
      ).to.eventually.be.rejectedWith(UserAlreadyExistsError);

      const [userInDb] = await TestUtils.getConnection()
        .select()
        .from("users")
        .where({ username });

      expect(_.pick(userInDb, "id", "username")).to.deep.equal(user);
    });
  });

  describe("the getByID method", () => {
    it("returns the user by id", async () => {
      const [, expected] = await Promise.all([
        models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        }),
        models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        }),
        models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        })
      ]);

      const actual = await models.Users.getByID(expected.id);

      expect(actual).to.deep.equal(expected);
    });

    it("returns undefined if the user does not exist", async () => {
      const noSuchUser = await models.Users.getByID(TestUtils.genUuid());
      expect(noSuchUser).to.be.undefined;
    });
  });

  describe("authenticateByPassword", () => {
    let user: User;
    const password = TestUtils.genUuid();

    before(async () => {
      user = await models.Users.create({
        username: TestUtils.genUuid(),
        password
      });
    });

    it("returns the user if the password is correct", async () => {
      const authUser = await models.Users.authenticateByPassword({
        username: user.username,
        password
      });

      expect(authUser).to.deep.equal(user);
    });

    it("throws InvalidCredentialsError if the password is correct", async () => {
      await expect(
        models.Users.authenticateByPassword({
          username: user.username,
          password: "abc"
        })
      ).to.eventually.be.rejectedWith(InvalidCredentialsError);
    });

    it("throws UsernameNotFoundError if the username is incorrect", async () => {
      await expect(
        models.Users.authenticateByPassword({
          username: TestUtils.genUuid(),
          password
        })
      ).to.eventually.be.rejectedWith(UsernameNotFoundError);
    });
  });

  describe("authenticateByToken", () => {
    let user: User;
    let tok: AccessToken;
    const password = TestUtils.genUuid();

    before(async () => {
      user = await models.Users.create({
        username: TestUtils.genUuid(),
        password
      });

      tok = await models.AccessTokens.create(user.id);
    });

    it("returns the user if the token is valid", async () => {
      const authUser = await models.Users.authenticateByToken(tok.token);
      expect(authUser).to.deep.equal(user);
    });

    it("throws InvalidCredentialsError if the token is invalid", async () => {
      await expect(
        models.Users.authenticateByToken("foobar")
      ).to.eventually.be.rejectedWith(InvalidCredentialsError);
    });
  });
});
