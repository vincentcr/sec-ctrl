import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

chai.use(chaiAsPromised);
const { expect } = chai;

import {
  decodeHexByte,
  decodeIntCode,
  encodeIntCode
} from "../../src/envisalink/encodings";

const codeTestCases = [
  {
    bytes: Buffer.from("012"),
    code: 12
  },
  {
    bytes: Buffer.from("001"),
    code: 1
  },
  {
    bytes: Buffer.from("009"),
    code: 9
  },
  {
    bytes: Buffer.from("010"),
    code: 10
  },
  {
    bytes: Buffer.from("990"),
    code: 990
  },
  {
    bytes: Buffer.from("999"),
    code: 999
  },
  {
    bytes: Buffer.from("000"),
    code: 0
  }
];

describe("the encoding helpers", () => {
  describe("the encodeIntCode function", () => {
    for (const testCase of codeTestCases) {
      it("properly encodes " + testCase.code, () => {
        const buf = Buffer.alloc(3);
        const len = encodeIntCode(testCase.code, buf);
        expect(len).to.equal(3);
        expect(buf).to.deep.equal(testCase.bytes);
      });
    }
  });

  describe("the decodeIntCode function", () => {
    for (const testCase of codeTestCases) {
      it("properly decodes " + testCase.code, () => {
        const actual = decodeIntCode(testCase.bytes);
        expect(actual).to.equal(testCase.code);
      });
    }
  });

  describe("the decodeHexByte function", () => {
    const testCases = [
      { bytes: Buffer.from("A"), value: 0xa },
      { bytes: Buffer.from("a"), value: 0xa },
      { bytes: Buffer.from("F"), value: 0xf },
      { bytes: Buffer.from("f"), value: 0xf },
      { bytes: Buffer.from("0"), value: 0 },
      { bytes: Buffer.from("3"), value: 3 },
      { bytes: Buffer.from("9"), value: 9 }
    ];

    for (const testCase of testCases) {
      it("should decode " + testCase.bytes.toString(), () => {
        const actual = decodeHexByte(testCase.bytes);
        expect(actual).to.equal(testCase.value);
      });
    }
  });
});
