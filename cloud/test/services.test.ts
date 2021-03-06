import * as dateFns from "date-fns";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

import TestUtils, { MockIotPublisher } from "./_testUtils";
chai.use(chaiAsPromised);
const { expect } = chai;

import { PartitionStatus } from "../../common/partition";
import {
  EventType,
  PartitionChangeType,
  SiteEvent
} from "../../common/siteEvent";
import {
  UserCommand,
  UserCommandCode,
  userCommandfromJSON
} from "../../common/userCommand";
import { ZoneStatus } from "../../common/zone";
import { Services, ServicesImpl } from "../src/services";

let services: Services;
let mockIotPublisher: MockIotPublisher;

describe("the Services class", () => {
  before(async () => {
    mockIotPublisher = TestUtils.mkMockIotPublisher();
    services = await TestUtils.createServices(mockIotPublisher.publish);
  });

  afterEach(() => {
    mockIotPublisher.clear();
  });

  describe("the saveEvent method", () => {
    it("records the event", async () => {
      const siteId = TestUtils.genUuid();
      const event: SiteEvent = {
        type: EventType.Info,
        code: "foo",
        data: "bar",
        recordedAt: new Date()
      };
      const receivedAt = new Date();

      await services.saveEvent({ siteId, event, receivedAt });

      const eventsInDB = await TestUtils.getConnection()
        .select()
        .from("site_events")
        .where({ siteId });

      expect(eventsInDB.length).to.equal(1);
      expect(eventsInDB[0].event).to.be.an("object");
      expect(eventsInDB[0].event).to.have.property("code", "foo");
    });

    it("upserts a site record", async () => {
      const siteId = TestUtils.genUuid();
      const event: SiteEvent = {
        type: EventType.Info,
        code: "foo",
        data: "bar",
        recordedAt: new Date()
      };
      const receivedAt = new Date();

      await services.saveEvent({ siteId, event, receivedAt });

      const siteInDB = await TestUtils.getConnection()
        .select()
        .from("sites")
        .where({ id: siteId });

      expect(siteInDB.length).to.equal(1);
    });

    it("upserts a zone record on a ZoneChange event", async () => {
      const siteId = TestUtils.genUuid();
      const zoneId = 1;
      const event: SiteEvent = {
        type: EventType.ZoneChange,
        zoneId,
        partitionId: 2,
        recordedAt: new Date(),
        status: ZoneStatus.Open
      };
      const receivedAt = new Date();

      await services.saveEvent({ siteId, event, receivedAt });

      const zoneInDB = await TestUtils.getConnection()
        .select()
        .from("site_zones")
        .where({ id: zoneId, siteId });

      expect(zoneInDB.length).to.equal(1);
      expect(zoneInDB[0]).to.have.property("status", ZoneStatus.Open);
    });

    it("upserts a partition record on a PartitionChange event", async () => {
      const siteId = TestUtils.genUuid();
      const partitionId = 2;
      const status = PartitionStatus.Armed;
      const event: SiteEvent = {
        type: EventType.PartitionChange,
        changeType: PartitionChangeType.Status,
        partitionId,
        recordedAt: new Date(),
        status
      };
      const receivedAt = new Date();

      await services.saveEvent({ siteId, event, receivedAt });

      const partitionInDB = await TestUtils.getConnection()
        .select()
        .from("site_partitions")
        .where({ id: partitionId, siteId });

      expect(partitionInDB.length).to.equal(1);
      expect(partitionInDB[0]).to.have.property("status", status);
    });
  });

  describe("sendCommand", () => {
    it("send the supplied command to the appropriate topic", async () => {
      const siteId = TestUtils.genUuid();
      const cmd: UserCommand = {
        code: UserCommandCode.ArmAway,
        partitionId: 1
      };

      const dateBefore = new Date();

      await services.sendCommandToSite({ siteId, cmd });

      expect(mockIotPublisher.requests.length).to.equal(1);

      const [{ topic, qos, payload }] = mockIotPublisher.requests;

      expect(topic).to.be.a("string");
      expect(topic).to.contain(siteId);
      expect(qos).to.be.a("number");
      expect(payload).to.be.a("string");

      const { expiresAt, ...actualCmd } = userCommandfromJSON(
        payload as string
      );

      expect(expiresAt).to.be.a("date");
      expect(expiresAt).to.be.gte(dateFns.addSeconds(dateBefore, 30));
      expect(expiresAt).to.be.lte(dateFns.addSeconds(dateBefore, 32));

      expect(actualCmd).to.deep.equal(cmd);
    });

    it("override expiresAt default when ttlSeconds is supplied", async () => {
      const siteId = TestUtils.genUuid();
      const cmd: UserCommand = {
        code: UserCommandCode.ArmAway,
        partitionId: 1
      };

      const dateBefore = new Date();

      await services.sendCommandToSite({ siteId, cmd, ttlSeconds: 1000 });

      const [{ payload }] = mockIotPublisher.requests;

      expect(payload).to.be.a("string");
      const { expiresAt } = userCommandfromJSON(payload as string);

      expect(expiresAt).to.be.a("date");
      expect(expiresAt).to.be.gte(dateFns.addSeconds(dateBefore, 1000));
      expect(expiresAt).to.be.lte(dateFns.addSeconds(dateBefore, 1000 + 2));
    });
  });
});
