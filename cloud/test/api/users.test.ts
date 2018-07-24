import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as request from "supertest";

import { Server } from "http";

import TestUtils from "../_testUtils";
chai.use(chaiAsPromised);
const { expect } = chai;

import createApp from "../../src/api/app";
import config from "../../src/config";
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

    it("creates a new user if the input is valid", async () => {
      const username = TestUtils.genUuid();
      const res = await agent
        .post("/users/signup")
        .send({ username, password: "bar123" })
        .expect(200);

      expect(res.body).to.be.an("object");

      // assert user
      expect(res.body.user).to.be.an("object");
      expect(res.body.user.id).to.be.a("string");
      expect(res.body.user.username).to.equal(username);

      const userFromId = await services.models.Users.getByID(res.body.user.id);
      expect(userFromId).to.be.an("object");
      if (userFromId != null) {
        expect(userFromId.username).to.equal(username);
      }

      // assert token
      expect(res.body.token).to.be.a("string");
      const userFromToken = await services.models.Users.authenticateByToken(
        res.body.token
      );
      expect(userFromToken.username).to.equal(username);
    });
  });
});
