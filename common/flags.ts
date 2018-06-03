export type Flag<TFlagType extends number> = { value: TFlagType; desc: string };
export type FlagsDefinition<TFlagType extends number> = {
  [desc: string]: TFlagType;
};

export class Flags<TFlagType extends number> {
  readonly definitions: FlagsDefinition<TFlagType>;
  constructor(definitions: FlagsDefinition<TFlagType>) {
    this.definitions = definitions;
  }

  toString(flagBits: TFlagType) {
    const flags = this.decompose(flagBits);
    return flags.map(({ desc }) => desc).join(", ");
  }

  private decompose(flagBits: TFlagType): Flag<TFlagType>[] {
    let remainder = flagBits;
    const flags = [];

    for (const [desc, mask] of Object.entries(this.definitions)) {
      if ((flagBits & mask) != 0) {
        remainder = (remainder & ~mask) as TFlagType;
        flags.push({ value: mask, desc });
      }
    }

    if (remainder !== 0) {
      throw new Error(
        "invalid flag bits: " +
          flagBits.toString(2) +
          "non-zero remainder: " +
          remainder.toString(2),
      );
    }

    return flags;
  }
}
