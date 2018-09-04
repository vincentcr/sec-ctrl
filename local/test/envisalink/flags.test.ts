import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

chai.use(chaiAsPromised);
const { expect } = chai;

import Flags from "../../src/envisalink/flags";

const FlagsDef1 = {
  Ready: 1 << 0,
  Armed: 1 << 1,
  Memory: 1 << 2,
  Bypass: 1 << 3,
  Trouble: 1 << 4,
  Program: 1 << 5,
  Fire: 1 << 6,
  Backlight: 1 << 7
};
export const FlagsTest1 = new Flags(FlagsDef1);

const successTestCases = [
  {
    bits: FlagsDef1.Ready,
    flags: [FlagsDef1.Ready],
    strings: ["Ready"]
  },
  {
    bits: FlagsDef1.Backlight,
    flags: [FlagsDef1.Backlight],
    strings: ["Backlight"]
  },
  {
    bits: FlagsDef1.Ready | FlagsDef1.Memory,
    flags: [FlagsDef1.Ready, FlagsDef1.Memory],
    strings: ["Ready", "Memory"]
  },
  {
    bits:
      FlagsDef1.Ready | FlagsDef1.Memory | FlagsDef1.Trouble | FlagsDef1.Fire,
    flags: [
      FlagsDef1.Ready,
      FlagsDef1.Memory,
      FlagsDef1.Trouble,
      FlagsDef1.Fire
    ],
    strings: ["Ready", "Memory", "Trouble", "Fire"]
  },
  {
    bits: FlagsDef1.Memory | FlagsDef1.Trouble | FlagsDef1.Fire,
    flags: [FlagsDef1.Memory, FlagsDef1.Trouble, FlagsDef1.Fire],
    strings: ["Memory", "Trouble", "Fire"]
  }
];

const failureTestCases = [
  {
    bits: FlagsDef1.Memory | FlagsDef1.Trouble | (1 << 9)
  },
  {
    bits: 1 << 9
  }
];

describe("the Flags class", () => {
  describe("the toStrings method", () => {
    for (const testCase of successTestCases) {
      it("should parse " + testCase.strings, () => {
        const actual = FlagsTest1.toStrings(testCase.bits);
        expect(actual).to.deep.equal(testCase.strings);
      });
    }
    for (const testCase of failureTestCases) {
      it("should fail to parse " + testCase.bits.toString(2), () => {
        expect(() => FlagsTest1.toStrings(testCase.bits)).to.throw(/remainder/);
      });
    }
  });
});
