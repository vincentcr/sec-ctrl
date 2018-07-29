import * as VError from "verror";

export interface Flag {
  value: number;
  desc: string;
}
export interface FlagsDefinition {
  [desc: string]: number;
}

export default class Flags {
  readonly definitions: FlagsDefinition;
  constructor(definitions: FlagsDefinition) {
    this.definitions = definitions;
  }

  toStrings(flagBits: number) {
    const flags = this.decompose(flagBits);
    return flags.map(({ desc }) => desc);
  }

  private decompose(flagBits: number): Flag[] {
    let remainder = flagBits;
    const flags = [];

    for (const [desc, mask] of Object.entries(this.definitions)) {
      if ((flagBits & mask) !== 0) {
        remainder = remainder & ~mask;
        flags.push({ value: mask, desc });
      }
    }

    if (remainder !== 0) {
      throw new VError(
        {
          name: "InvalidFlagNonZeroRemainder",
          info: {
            bits: flagBits.toString(2),
            remainder: remainder.toString(2),
            parsedFlags: flags
          }
        },
        "invalid flag bits: non-zero remainder"
      );
    }

    return flags;
  }
}
