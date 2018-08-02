import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

chai.use(chaiAsPromised);
const { expect } = chai;

import { makeMessageClass, ServerMessage } from "../src/envisalink/message";
import {
  LocalSiteStateManager,
  MessageParser
} from "../src/localSiteStateManager";

class DummyMessage extends makeMessageClass(x => "X" + x.toString()) {}

const messageParserTestCases = [
  {
    desc: "an empty buffer",
    buffers: [Buffer.alloc(0)],
    messages: [[]]
  },
  {
    desc: "a single message buffer",
    buffers: [Buffer.from("012helloa7\r\n")],
    messages: [[new DummyMessage(12, Buffer.from("hello"))]]
  },
  {
    desc: "a message split into multiple buffers",
    buffers: [Buffer.from("012helloa"), Buffer.from("7\r\n")],
    messages: [[], [new DummyMessage(12, Buffer.from("hello"))]]
  },
  {
    desc: "multiple message in one buffer",
    buffers: [Buffer.from("012helloa7\r\n012helloa7\r\n012helloa7\r\n")],
    messages: [
      [
        new DummyMessage(12, Buffer.from("hello")),
        new DummyMessage(12, Buffer.from("hello")),
        new DummyMessage(12, Buffer.from("hello"))
      ]
    ]
  },
  {
    desc:
      "a full message and an incomplete one in the first buffer, and the remainder in the next one",
    buffers: [
      Buffer.from("012helloa7\r\n012he"),
      Buffer.from("lloa7\r\n012helloa7\r\n")
    ],
    messages: [
      [new DummyMessage(12, Buffer.from("hello"))],
      [
        new DummyMessage(12, Buffer.from("hello")),
        new DummyMessage(12, Buffer.from("hello"))
      ]
    ]
  },
  {
    desc: "messages split accross the \\r\\n",
    buffers: [
      Buffer.from("012helloa7\r"),
      Buffer.from("\n"),
      Buffer.from("012"),
      Buffer.from("helloa7\r\n012helloa7\r\n")
    ],
    messages: [
      [],
      [new DummyMessage(12, Buffer.from("hello"))],
      [],
      [
        new DummyMessage(12, Buffer.from("hello")),
        new DummyMessage(12, Buffer.from("hello"))
      ]
    ]
  }
];

describe("The MessageParser class", () => {
  describe("The consume method", () => {
    for (const { buffers, messages, desc } of messageParserTestCases) {
      it(`"returns complete messages for ${desc}`, () => {
        const parser = new MessageParser();
        for (const [i, buf] of buffers.entries()) {
          const actual = parser.consume(buf);
          const expected = messages[i];
          expect(actual).to.deep.equal(expected);
        }
      });
    }
  });
});

function describeBuffers(buffers: Buffer[]) {
  return buffers
    .map(
      b =>
        "'" +
        b
          .toString()
          .replace(/\r/g, "\\r")
          .replace(/\n/g, "\\n") +
        "'"
    )
    .join(" + ");
}
