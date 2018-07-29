import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

chai.use(chaiAsPromised);
const { expect } = chai;

import { makeMessageClass } from "../../src/envisalink/message";

type MessageTestCase = {
  readonly bytes: Buffer;
  readonly code: number;
  readonly data?: Buffer;
};

const testCases: MessageTestCase[] = [
  {
    bytes: Buffer.from("012helloa7"),
    code: 12,
    data: Buffer.from("hello")
  },
  {
    bytes: Buffer.from("123hello Worldd2"),
    code: 123,
    data: Buffer.from("hello World")
  },
  { bytes: Buffer.from("000hf8"), code: 0, data: Buffer.from("h") },
  { bytes: Buffer.from("00191"), code: 1, data: Buffer.from("") },
  { bytes: Buffer.from("00191"), code: 1 },
  { bytes: Buffer.from("999ab"), code: 999 }
];

class DummyMessage extends makeMessageClass(x => "X" + x.toString()) {}

describe("the message class", () => {
  describe("the encode method", () => {
    for (const testCase of testCases) {
      it("should encode message to " + testCase.bytes.toString(), () => {
        const msg = new DummyMessage(testCase.code, testCase.data);
        const bytes = msg.encode();
        expect(bytes).to.deep.equal(testCase.bytes);
      });
    }
  });

  describe("the decode method", () => {
    for (const testCase of testCases) {
      it("should decode message from " + testCase.bytes.toString(), () => {
        const actual = DummyMessage.decode(testCase.bytes);
        const expected = new DummyMessage(testCase.code, testCase.data);
        expect(actual).to.deep.equal(expected);
        expect(actual).to.be.an.instanceof(DummyMessage);
      });
    }
  });
});
