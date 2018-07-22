import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as Knex from "knex";
import * as _ from "lodash";
import "mocha";

import { SiteModel } from "../../src/models/SiteModel";
import { SiteZoneModel } from "../../src/models/SiteZoneModel";

chai.use(chaiAsPromised);
const { expect } = chai;
import { EventType, ZoneChangeEvent } from "../../../common/siteEvent";

import { ZoneStatus } from "../../../common/zone";
import TestUtils from "../_testUtils";

let models: { Sites: SiteModel; SiteZones: SiteZoneModel };

describe("the SiteZone model", () => {
  before(async () => {
    const knex = TestUtils.getConnection();
    models = {
      Sites: new SiteModel(knex),
      SiteZones: new SiteZoneModel(knex)
    };
  });

  describe("upsertFromEvent", () => {
    it("inserts a new site zone record the first time", async () => {
      const siteId = TestUtils.genUuid();
      const event = mockEvent();

      await TestUtils.getConnection().transaction(async transaction => {
        await models.Sites.upsertFromEvent({
          id: siteId,
          event,
          transaction
        });

        await models.SiteZones.upsertFromEvent({ siteId, event, transaction });

        await transaction.commit();
      });

      const zones = await TestUtils.getConnection()
        .select()
        .from("site_zones")
        .where({ siteId });

      expect(zones).to.be.an("array");
      expect(zones).to.have.property("length", 1);
      expect(zones[0]).to.be.an("object");
      expect(zones[0]).to.have.property("siteId", siteId);
      expect(zones[0]).to.have.property("id", event.zoneId);
      expect(zones[0]).to.have.property("partitionId", event.partitionId);
      expect(zones[0]).to.have.property("status", event.status);
    });

    it("updates the site zone record if called multiple times", async () => {
      const siteId = TestUtils.genUuid();

      await TestUtils.getConnection().transaction(async transaction => {
        for (const event of [mockEvent(), mockEvent(ZoneStatus.Fault)]) {
          await models.Sites.upsertFromEvent({
            id: siteId,
            event,
            transaction
          });

          await models.SiteZones.upsertFromEvent({
            siteId,
            event,
            transaction
          });
        }
        await transaction.commit();
      });

      const zones = await TestUtils.getConnection()
        .select()
        .from("site_zones")
        .where({ siteId });

      expect(zones).to.be.an("array");
      expect(zones).to.have.property("length", 1);
      expect(zones[0]).to.be.an("object");
      expect(zones[0]).to.have.property("siteId", siteId);
      expect(zones[0]).to.have.property("status", ZoneStatus.Fault);
    });
  });
});

function mockEvent(status = ZoneStatus.Open): ZoneChangeEvent {
  return {
    type: EventType.ZoneChange,
    zoneId: 1,
    partitionId: 2,
    recordedAt: new Date(),
    status
  };
}
