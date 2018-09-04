import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

import { SitePartitionRecord } from "../../src/models/SitePartitionModel";

chai.use(chaiAsPromised);
const { expect } = chai;
import {
  EventType,
  PartitionChangeEvent,
  PartitionChangeType,
  PartitionKeypadLedStateChangeEvent
} from "../../../common/siteEvent";

import { PartitionStatus } from "../../../common/partition";
import { Models } from "../../src/models";
import TestUtils from "../_testUtils";

let models: Models;

describe("the SitePartition model", () => {
  before(async () => {
    models = await TestUtils.createModels();
  });

  describe("upsertFromEvent", () => {
    it("inserts a new site partition record the first time", async () => {
      const siteId = TestUtils.genUuid();
      const event = mockEvent();

      await TestUtils.getConnection().transaction(async transaction => {
        await models.Sites.upsertFromEvent({
          id: siteId,
          event,
          transaction
        });

        await models.SitePartitions.upsertFromEvent({
          siteId,
          event,
          transaction
        });

        await transaction.commit();
      });

      const partitions: SitePartitionRecord[] = await TestUtils.getConnection()
        .select()
        .from("site_partitions")
        .where({ siteId });

      expect(partitions).to.be.an("array");
      expect(partitions).to.have.property("length", 1);
      expect(partitions[0]).to.be.an("object");
      expect(partitions[0].siteId).to.equal(siteId);
      expect(partitions[0].id).to.equal(event.partitionId);
      expect(partitions[0].status).to.equal(PartitionStatus.Armed);
    });

    it("can set the keypad led state", async () => {
      const siteId = TestUtils.genUuid();
      const keypadLedState = ["blue"];
      const event: PartitionKeypadLedStateChangeEvent = {
        type: EventType.PartitionChange,
        partitionId: 1,
        changeType: PartitionChangeType.KeypadLed,
        keypadState: keypadLedState,
        flash: false,
        recordedAt: new Date()
      };

      await TestUtils.getConnection().transaction(async transaction => {
        await models.Sites.upsertFromEvent({
          id: siteId,
          event,
          transaction
        });

        await models.SitePartitions.upsertFromEvent({
          siteId,
          event,
          transaction
        });

        await transaction.commit();
      });

      const partitions: SitePartitionRecord[] = await TestUtils.getConnection()
        .select()
        .from("site_partitions")
        .where({ siteId });

      expect(partitions).to.be.an("array");
      expect(partitions.length).to.equal(1);
      expect(partitions[0]).to.be.an("object");
      expect(partitions[0].keypadLedState).to.deep.equal(keypadLedState);
    });

    it("can set the keypad led flash state", async () => {
      const siteId = TestUtils.genUuid();
      const keypadLedState = ["blue"];
      const event: PartitionKeypadLedStateChangeEvent = {
        type: EventType.PartitionChange,
        partitionId: 1,
        changeType: PartitionChangeType.KeypadLed,
        keypadState: keypadLedState,
        flash: true,
        recordedAt: new Date()
      };

      await TestUtils.getConnection().transaction(async transaction => {
        await models.Sites.upsertFromEvent({
          id: siteId,
          event,
          transaction
        });

        await models.SitePartitions.upsertFromEvent({
          siteId,
          event,
          transaction
        });

        await transaction.commit();
      });

      const partitions: SitePartitionRecord[] = await TestUtils.getConnection()
        .select()
        .from("site_partitions")
        .where({ siteId });

      expect(partitions).to.be.an("array");
      expect(partitions.length).to.equal(1);
      expect(partitions[0]).to.be.an("object");
      expect(partitions[0].keypadLedFlashState).to.deep.equal(keypadLedState);
    });

    it("can set the trouble state led flag", async () => {
      const siteId = TestUtils.genUuid();
      const event: PartitionChangeEvent = {
        type: EventType.PartitionChange,
        partitionId: 1,
        changeType: PartitionChangeType.TroubleLed,
        on: true,
        recordedAt: new Date()
      };

      await TestUtils.getConnection().transaction(async transaction => {
        await models.Sites.upsertFromEvent({
          id: siteId,
          event,
          transaction
        });

        await models.SitePartitions.upsertFromEvent({
          siteId,
          event,
          transaction
        });

        await transaction.commit();
      });

      const partitions: SitePartitionRecord[] = await TestUtils.getConnection()
        .select()
        .from("site_partitions")
        .where({ siteId });

      expect(partitions).to.be.an("array");
      expect(partitions.length).to.equal(1);
      expect(partitions[0]).to.be.an("object");
      expect(partitions[0].troubleStateLed).to.deep.equal(true);
    });

    it("updates the site partition record if called multiple times", async () => {
      const siteId = TestUtils.genUuid();

      await TestUtils.getConnection().transaction(async transaction => {
        for (const event of [mockEvent(), mockEvent(PartitionStatus.InAlarm)]) {
          await models.Sites.upsertFromEvent({
            id: siteId,
            event,
            transaction
          });

          await models.SitePartitions.upsertFromEvent({
            siteId,
            event,
            transaction
          });
        }
        await transaction.commit();
      });

      const partitions = await TestUtils.getConnection()
        .select()
        .from("site_partitions")
        .where({ siteId });

      expect(partitions).to.be.an("array");
      expect(partitions).to.have.property("length", 1);
      expect(partitions[0]).to.be.an("object");
      expect(partitions[0]).to.have.property("siteId", siteId);
      expect(partitions[0]).to.have.property("status", PartitionStatus.InAlarm);
    });
  });
});

function mockEvent(status = PartitionStatus.Armed): PartitionChangeEvent {
  return {
    type: EventType.PartitionChange,
    changeType: PartitionChangeType.Status,
    partitionId: 2,
    recordedAt: new Date(),
    status
  };
}
