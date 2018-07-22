import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as Knex from "knex";
import * as _ from "lodash";
import "mocha";

import { EventType, SiteEvent } from "../../../common/siteEvent";
import { SiteModel, SiteRecord } from "../../src/models/SiteModel";
import { UserModel } from "../../src/models/UserModel";

import { PartitionStatus } from "../../../common/partition";
import { ZoneStatus } from "../../../common/zone";
import {
  SitePartitionModel,
  SitePartitionRecord
} from "../../src/models/SitePartitionModel";
import { SiteZoneModel, SiteZoneRecord } from "../../src/models/SiteZoneModel";
import TestUtils from "../_testUtils";

chai.use(chaiAsPromised);
const { expect } = chai;

let models: {
  Sites: SiteModel;
  Users: UserModel;
  SitePartitions: SitePartitionModel;
  SiteZones: SiteZoneModel;
};

describe("the Site model", () => {
  before(async () => {
    const knex = TestUtils.getConnection();
    models = {
      Sites: new SiteModel(knex),
      Users: new UserModel(knex),
      SitePartitions: new SitePartitionModel(knex),
      SiteZones: new SiteZoneModel(knex)
    };
  });

  describe("claim", () => {
    it("assigns an owner id if the site has not been claimed yet", async () => {
      const siteId = TestUtils.genUuid();
      await TestUtils.getConnection()
        .insert({ id: siteId })
        .into("sites");

      const user = await models.Users.create({
        username: TestUtils.genUuid(),
        password: "bar"
      });

      await models.Sites.claim({ id: siteId, ownerId: user.id, name: "site1" });

      const [site]: SiteRecord[] = await TestUtils.getConnection()
        .select()
        .from("sites")
        .where({ id: siteId });

      expect(site).to.be.an("object");
      expect(site.ownerId).to.equal(user.id);
    });

    it("fails if site is already owned", async () => {
      const siteId = TestUtils.genUuid();

      const [, user1, user2] = await Promise.all([
        TestUtils.getConnection()
          .insert({ id: siteId })
          .into("sites"),
        models.Users.create({
          username: TestUtils.genUuid(),
          password: "bar"
        }),
        models.Users.create({
          username: TestUtils.genUuid(),
          password: "bar"
        })
      ]);

      await models.Sites.claim({
        id: siteId,
        ownerId: user1.id,
        name: "site1"
      });

      expect(
        models.Sites.claim({
          id: siteId,
          ownerId: user2.id,
          name: "site2"
        })
      ).to.eventually.be.rejectedWith(Error);

      const [site] = await TestUtils.getConnection()
        .select()
        .from("sites")
        .where({ id: siteId });

      expect(site.ownerId).to.equal(user1.id);
    });
  });

  describe("upsertFromEvent", () => {
    it("inserts a new site record the first time", async () => {
      const siteId = TestUtils.genUuid();
      const event = mockEvent();

      await TestUtils.getConnection().transaction(async transaction => {
        await models.Sites.upsertFromEvent({
          id: siteId,
          event,
          transaction
        });
        await transaction.commit();
      });

      const sites = await TestUtils.getConnection()
        .select()
        .from("sites")
        .where({ id: siteId });

      expect(sites).to.be.an("array");
      expect(sites).to.have.property("length", 1);
      expect(sites[0]).to.be.an("object");
      expect(sites[0]).to.have.property("id", siteId);
    });

    it("updates the site record if called multiple times", async () => {
      const siteId = TestUtils.genUuid();
      const event = mockEvent();

      await TestUtils.getConnection().transaction(async transaction => {
        await models.Sites.upsertFromEvent({
          id: siteId,
          event,
          transaction
        });

        await models.Sites.upsertFromEvent({
          id: siteId,
          event,
          transaction
        });

        await transaction.commit();
      });

      const sites = await TestUtils.getConnection()
        .select()
        .from("sites")
        .where({ id: siteId });

      expect(sites).to.be.an("array");
      expect(sites).to.have.property("length", 1);
      expect(sites[0]).to.be.an("object");
      expect(sites[0]).to.have.property("id", siteId);
    });

    it("updates the site's trouble status if the event's type is SystemTroubleStatus", async () => {
      const siteId = TestUtils.genUuid();
      const event = mockEvent(EventType.SystemTroubleStatus);

      const knex = TestUtils.getConnection();

      await knex.transaction(async transaction => {
        await models.Sites.upsertFromEvent({
          id: siteId,
          event,
          transaction
        });

        await transaction.commit();
      });

      const sites = await knex
        .select()
        .from("sites")
        .where({ id: siteId });

      expect(sites).to.be.an("array");
      expect(sites.length).to.equal(1);
      expect(sites[0]).to.be.an("object");
      expect(sites[0].systemTroubleStatus).to.deep.equal(["alarm"]);
    });
  });

  describe("getSite", () => {
    let site: SiteRecord;
    let partitions: SitePartitionRecord[];
    let zones: SiteZoneRecord[];
    before(async () => {
      site = await models.Sites.upsert({ id: TestUtils.genUuid() });
      partitions = await Promise.all([
        models.SitePartitions.upsert({
          siteId: site.id,
          id: 1,
          status: PartitionStatus.Armed
        }),
        models.SitePartitions.upsert({
          siteId: site.id,
          id: 2,
          status: PartitionStatus.InAlarm
        })
      ]);
      zones = await Promise.all([
        models.SiteZones.upsert({
          siteId: site.id,
          id: 1,
          partitionId: 1,
          status: ZoneStatus.Open
        }),
        models.SiteZones.upsert({
          siteId: site.id,
          id: 2,
          partitionId: 1,
          status: ZoneStatus.Open
        }),
        models.SiteZones.upsert({
          siteId: site.id,
          id: 8,
          partitionId: 2,
          status: ZoneStatus.Alarm
        })
      ]);
    });

    it("returns a site with embedded zones and partitions", async () => {
      const expected = {
        ...site,
        partitions,
        zones
      };

      const actual = await models.Sites.getSite(site.id);

      expect(actual).to.deep.equal(expected);
    });
  });
});

function mockEvent(type = EventType.Info): SiteEvent {
  switch (type) {
    case EventType.Info:
      return {
        type,
        code: "foo",
        data: "bar",
        recordedAt: new Date()
      };
    case EventType.SystemTroubleStatus:
      return {
        type,
        status: ["alarm"],
        recordedAt: new Date()
      };
    default:
      throw new Error("not implemented: " + type);
  }
}
