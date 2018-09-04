import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as supertestFetch from "supertest-fetch";

import { Server } from "http";

import TestUtils from "../_testUtils";
chai.use(chaiAsPromised);
const { expect } = chai;

import { User } from "../../../common/user";
import createApp from "../../src/api/app";
import { AccessToken } from "../../src/models/AccessTokenModel";
import { Services } from "../../src/services";

const expectNoUserAdded = (work: PromiseLike<any>) =>
  TestUtils.expectNoRecordAdded("users", work);

type Agent = (
  url: string | supertestFetch.Request,
  init?: supertestFetch.RequestInit | undefined
) => supertestFetch.Test;

describe("the /users API", () => {
  let agent: Agent;
  let server: Server;
  let services: Services;
  // let agent:

  before(async () => {
    const config = TestUtils.getConfig();
    const mockIotPublisher = TestUtils.mkMockIotPublisher();
    services = await TestUtils.createServices(mockIotPublisher.publish);
    const app = await createApp(services);
    server = app.listen(config.get("http").port);
    agent = supertestFetch.makeFetch(server);
  });

  after(done => {
    server.close(done);
  });

  describe("the POST /users/signup endpoint", () => {
    it("rejects missing username", async () => {
      await expectNoUserAdded(
        agent("/users/signup", {
          method: "POST",
          body: JSON.stringify({ password: "bar123" })
        }).expect(400)
      );
    });

    it("rejects an empty username", async () => {
      await expectNoUserAdded(
        agent("/users/signup", {
          method: "POST",
          body: JSON.stringify({ username: "", password: "bar123" })
        }).expect(400)
      );
    });

    it("rejects a username too small", async () => {
      await expectNoUserAdded(
        agent("/users/signup", {
          method: "POST",
          body: JSON.stringify({ username: "1", password: "bar123" })
        }).expect(400)
      );
    });

    it("rejects missing password", async () => {
      await expectNoUserAdded(
        agent("/users/signup", {
          method: "POST",
          body: JSON.stringify({ username: TestUtils.genUuid() })
        }).expect(400)
      );
    });

    it("rejects a password too small", async () => {
      await expectNoUserAdded(
        agent("/users/signup", {
          method: "POST",
          body: JSON.stringify({ username: "abcdef", password: "bar12" })
        }).expect(400)
      );
    });

    it("creates a new user if the input is valid, and returns the user along with an access token", async () => {
      const username = TestUtils.genUuid();
      const resp = await agent("/users/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password: "bar123" })
      }).expect(200);

      const body = await resp.json();

      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("token", "user");

      // assert user
      expect(body.user).to.be.an("object");
      expect(body.user.id).to.be.a("string");
      expect(body.user.username).to.equal(username);

      const userFromId = await services.models.Users.getByID(body.user.id);
      expect(userFromId).to.be.an("object");
      if (userFromId != null) {
        expect(userFromId.username).to.equal(username);
      }

      // assert token
      expect(body.token).to.be.a("string");
      const userFromToken = await services.models.Users.authenticateByToken(
        body.token
      );
      expect(userFromToken.username).to.equal(username);
    });
  });

  describe("the POST /users/signin endpoint", () => {
    let user: User;
    const password = TestUtils.genUuid();
    before(async () => {
      [, user] = await Promise.all([
        services.models.Users.create({
          username: TestUtils.genUuid(),
          password
        }),
        services.models.Users.create({
          username: TestUtils.genUuid(),
          password
        }),
        services.models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        })
      ]);
    });

    it("rejects non-existent username", async () => {
      const resp = await agent("/users/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: TestUtils.genUuid(),
          password: "bar123"
        })
      }).expect(422);

      const body = await resp.json();

      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("UsernameNotFound");
    });

    it("rejects invalid password", async () => {
      const resp = await agent("/users/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: user.username, password: "bar123" })
      }).expect(401);

      const body = await resp.json();

      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("InvalidCredentials");
    });

    it("returns a valid token if username and password match", async () => {
      const resp = await agent("/users/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: user.username, password })
      }).expect(200);
      const body = await resp.json();

      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("token", "user");

      expect(body.user).to.deep.equal(user);

      expect(body.token).to.be.a("string");
      expect(body.token.length).to.be.gt(0);
      const userFromToken = await services.models.Users.authenticateByToken(
        body.token
      );
      expect(userFromToken.id).to.equal(user.id);
    });
  });

  describe("the GET /users/me endpoint", () => {
    let user: User;
    let token: AccessToken;
    before(async () => {
      [, user] = await Promise.all([
        services.models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        }),
        services.models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        }),
        services.models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        })
      ]);
      token = await services.models.AccessTokens.create(user.id);
    });

    it("return 401 if no authorization header", async () => {
      const resp = await agent("/users/me").expect(401);

      const body = await resp.json();
      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("UserNotAuthorized");
    });

    it("return 401 if invalid authorization header", async () => {
      const resp = await agent("/users/me", {
        headers: { authorization: "boo" }
      }).expect(401);

      const body = await resp.json();
      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("UserNotAuthorized");
    });

    it("return 401 if invalid token", async () => {
      const resp = await agent("/users/me", {
        headers: { authorization: "Bearer foo" }
      }).expect(401);

      const body = await resp.json();
      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("InvalidCredentials");
    });

    it("return the user if token is valid", async () => {
      const resp = await agent("/users/me", {
        headers: { authorization: `Bearer ${token.token}` }
      }).expect(200);

      const body = await resp.json();
      expect(body).to.be.an("object");
      expect(body).to.deep.equal(user);
    });
  });

  describe("the POST /users/me/signout", () => {
    let user: User;
    let token: AccessToken;
    before(async () => {
      [, user] = await Promise.all([
        services.models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        }),
        services.models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        }),
        services.models.Users.create({
          username: TestUtils.genUuid(),
          password: TestUtils.genUuid()
        })
      ]);
      token = await services.models.AccessTokens.create(user.id);
    });

    it("return 401 if no authorization header", async () => {
      await agent("/users/me/signout", { method: "POST" }).expect(401);
    });

    it("signouts the user if token is valid", async () => {
      const resp = await agent("/users/me/signout", {
        method: "POST",
        headers: { authorization: `Bearer ${token.token}` }
      }).expect(204);
      const text = await resp.text();
      expect(text).to.equal("");

      // token no longer valid
      await agent("/users/me", {
        headers: { authorization: `Bearer ${token.token}` }
      }).expect(401);
    });
  });
});
