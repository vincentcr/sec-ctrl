import * as AWS from "aws-sdk";
import * as dateFns from "date-fns";

import * as AWSMocks from "aws-sdk-mock";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

import TestUtils from "./_testUtils";
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
import Services from "../src/services";

let services: Services;
const iotDataMock = [] as any[];

describe("the Services class", () => {
  before(async () => {
    AWSMocks.setSDKInstance(AWS);
    AWSMocks.mock("IotData", "publish", (data: any, callback: any) => {
      iotDataMock.push(data);
      callback();
    });

    AWSMocks.mock("Iot", "describeEndpoint", (callback: any) => {
      callback(null, { endpointAddress: "localhost:0" });
    });
    services = await Services.create();
  });

  after(async () => {
    AWSMocks.restore("IotData", "publish");
    AWSMocks.restore("Iot", "describeEndpoint");
    services.destroy();
  });

  afterEach(() => {
    iotDataMock.splice(0, iotDataMock.length);
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

      await services.sendCommand({ siteId, cmd });

      expect(iotDataMock.length).to.equal(1);

      const [{ topic, qos, payload }] = iotDataMock;

      expect(topic).to.be.a("string");
      expect(topic).to.contain(siteId);
      expect(qos).to.be.a("number");
      expect(payload).to.be.a("string");

      const { expiresAt, ...actualCmd } = userCommandfromJSON(payload);

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

      await services.sendCommand({ siteId, cmd, ttlSeconds: 1000 });

      const [{ payload }] = iotDataMock;

      expect(payload).to.be.a("string");
      const { expiresAt } = userCommandfromJSON(payload);

      expect(expiresAt).to.be.a("date");
      expect(expiresAt).to.be.gte(dateFns.addSeconds(dateBefore, 1000));
      expect(expiresAt).to.be.lte(dateFns.addSeconds(dateBefore, 1000 + 2));
    });
  });
});
