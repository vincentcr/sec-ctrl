import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as request from "supertest";

import { Server } from "http";

import TestUtils from "../_testUtils";
chai.use(chaiAsPromised);
const { expect } = chai;

import { User } from "../../../common/user";
import createApp from "../../src/api/app";
import config from "../../src/config";
import { AccessToken } from "../../src/models/AccessTokenModel";
import Services from "../../src/services";

const expectNoUserAdded = TestUtils.expectNoRecordAdded.bind(
  TestUtils,
  "users"
);

describe("the /users API", () => {
  let agent: request.SuperTest<request.Test>;
  let server: Server;
  let services: Services;

  before(async () => {
    services = await Services.create(TestUtils.mkMockIotPublisher().publish);
    const app = await createApp(services);
    server = app.listen(config.get("http").port);
    agent = request(server);
  });

  after(done => {
    services
      .destroy()
      .then(() => server.close(done))
      .catch(done);
  });

  describe("the POST /users/signup endpoint", () => {
    it("rejects missing username", async () => {
      await expectNoUserAdded(
        agent
          .post("/users/signup")
          .send({ password: "bar123" })
          .expect(400)
      );
    });

    it("rejects an empty username", async () => {
      await expectNoUserAdded(
        agent
          .post("/users/signup")
          .send({ username: "", password: "bar123" })
          .expect(400)
      );
    });

    it("rejects a username too small", async () => {
      await expectNoUserAdded(
        agent
          .post("/users/signup")
          .send({ username: "1", password: "bar123" })
          .expect(400)
      );
    });

    it("rejects missing password", async () => {
      await expectNoUserAdded(
        agent
          .post("/users/signup")
          .send({ username: TestUtils.genUuid() })
          .expect(400)
      );
    });

    it("rejects a password too small", async () => {
      await expectNoUserAdded(
        agent
          .post("/users/signup")
          .send({ username: "abcdef", password: "bar12" })
          .expect(400)
      );
    });

    it("creates a new user if the input is valid, and returns the user along with an access token", async () => {
      const username = TestUtils.genUuid();
      const { body } = await agent
        .post("/users/signup")
        .send({ username, password: "bar123" })
        .expect(200);

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
      const { body } = await agent
        .post("/users/signin")
        .send({ username: TestUtils.genUuid(), password: "bar123" })
        .expect(422);
      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("UsernameNotFound");
    });

    it("rejects invalid password", async () => {
      const { body } = await agent
        .post("/users/signin")
        .send({ username: user.username, password: "bar123" })
        .expect(401);
      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("InvalidCredentials");
    });

    it("returns a valid token if username and password match", async () => {
      const { body } = await agent
        .post("/users/signin")
        .send({ username: user.username, password })
        .expect(200);
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
      const { body } = await agent.get("/users/me").expect(401);
      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("UserNotAuthorized");
    });

    it("return 401 if invalid authorization header", async () => {
      const { body } = await agent
        .get("/users/me")
        .set("authorization", "boo")
        .expect(401);
      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("UserNotAuthorized");
    });

    it("return 401 if invalid token", async () => {
      const { body } = await agent
        .get("/users/me")
        .set("authorization", "Bearer foo")
        .expect(401);
      expect(body).to.be.an("object");
      expect(body).to.have.all.keys("message", "name");
      expect(body.message).to.be.a("string");
      expect(body.message.length).to.be.gt(0);
      expect(body.name).to.equal("InvalidCredentials");
    });

    it("return the user if token is valid", async () => {
      const { body } = await agent
        .get("/users/me")
        .set("authorization", `Bearer ${token.token}`)
        .expect(200);
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
      await agent.post("/users/me/signout").expect(401);
    });

    it("signouts the user if token is valid", async () => {
      const { text } = await agent
        .post("/users/me/signout")
        .set("authorization", `Bearer ${token.token}`)
        .expect(204);
      expect(text).to.equal("");

      // token no longer valid
      await agent
        .get("/users/me")
        .set("authorization", `Bearer ${token.token}`)
        .expect(401);
    });
  });
});
