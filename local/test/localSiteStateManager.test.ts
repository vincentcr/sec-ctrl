import { EventEmitter } from "events";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

chai.use(chaiAsPromised);
const { expect } = chai;

import { makeMessageClass, ServerMessage } from "../src/envisalink/message";
import { LocalSiteConnectionManager } from "../src/localSiteConnectionManager";
import {
  LocalSiteStateManager,
  MessageParser
} from "../src/localSiteStateManager";

describe("The LocalSiteStateManager class", () => {});

function createMockLocalSiteConnectionManager(state: {
  incoming: Buffer[];
  outgoing: Buffer[];
}): LocalSiteConnectionManager {
  const { incoming, outgoing } = state;
  const emitter = new EventEmitter();

  return {
    // tslint:disable-next-line:no-empty
    start() {},
    onData(handler: (data: Buffer) => void) {
      emitter.on("data", handler);
    },
    sendData(data: Buffer) {
      outgoing.push(data);
    }
  };
}
