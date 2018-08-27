import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as Knex from "knex";
import * as _ from "lodash";
import "mocha";

import { SiteEventRecord } from "../../src/models/SiteEventModel";

chai.use(chaiAsPromised);
const { expect } = chai;
import { EventType, SiteEvent } from "../../../common/siteEvent";
import { ZoneStatus } from "../../../common/zone";

import { Models } from "../../src/models";
import TestUtils from "../_testUtils";

let models: Models;

describe("the SiteEvent model", () => {
  before(async () => {
    models = await TestUtils.createModels();
  });

  it("the create method inserts new events in the database", async () => {
    const { siteId, events, receivedAt } = mockEvents();

    await models.SiteEvents.create({ siteId, events, receivedAt });

    const eventsInDB: SiteEventRecord[] = await TestUtils.getConnection()
      .select()
      .from("site_events")
      .orderBy("id");

    assertEventsInDB(eventsInDB, events, siteId, receivedAt);
  });

  describe("the getBySiteId", () => {
    it("returns the latest events", async () => {
      const { siteId, events, receivedAt } = mockEvents();

      await models.SiteEvents.create({ siteId, events, receivedAt });

      const eventsInDB = await models.SiteEvents.getBySiteId({ siteId });

      assertEventsInDB(
        eventsInDB,
        events.concat([]).reverse(),
        siteId,
        receivedAt
      );
    });
  });
});

function assertEventsInDB(
  eventsInDB: SiteEventRecord[],
  events: SiteEvent[],
  siteId: string,
  receivedAt: Date
) {
  expect(eventsInDB.map(e => _.omit(e, "id"))).to.deep.equal(
    events.map(event => ({
      event: { ...event, recordedAt: event.recordedAt.toISOString() },
      receivedAt,
      siteId
    }))
  );
}

function mockEvents() {
  const events: SiteEvent[] = [
    {
      type: EventType.Info,
      code: "foo",
      data: "bar",
      recordedAt: new Date()
    },
    {
      type: EventType.Info,
      code: "foo1",
      data: "bar1",
      recordedAt: new Date()
    },
    {
      type: EventType.ZoneChange,
      zoneId: 1,
      partitionId: 1,
      status: ZoneStatus.Alarm,
      recordedAt: new Date()
    },
    {
      type: EventType.Info,
      code: "foo2",
      data: "bar2",
      recordedAt: new Date()
    }
  ];
  const siteId = TestUtils.genUuid();
  const receivedAt = new Date();
  return { events, siteId, receivedAt };
}
