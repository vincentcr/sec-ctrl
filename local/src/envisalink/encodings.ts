import * as VError from "verror";

export const CODE_LEN = 3;

// EncodeIntCode encodes an integer as a tpi code
export function encodeIntCode<TCode>(code: TCode, dst: Buffer): number {
  const encoded = code.toString().padStart(CODE_LEN, "0");
  dst.write(encoded);
  return encoded.length;
}

// DecodeIntCode parses a byte array as an integer
export function decodeIntCode(codeBytes: Buffer): number {
  const codeString = codeBytes.toString("ascii");
  const codeInt = parseInt(codeString, 10);
  if (isNaN(codeInt) || codeInt < 0) {
    throw new VError(
      { name: "MessageInvalidCode", info: { code: codeString } },
      "code must be a non-negative number"
    );
  }
  return codeInt;
}

export function decodeHexByte(data: Buffer): number {
  return parseInt(data.toString("ascii"), 16);
}
