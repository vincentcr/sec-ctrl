export const CODE_LEN = 3;

// EncodeIntCode encodes an integer as a tpi code
export function encodeIntCode<TCode>(code: TCode): string {
  return code.toString().padStart(CODE_LEN, "0");
}

// DecodeIntCode parses a byte array as an integer
export function decodeIntCode(codeBytes: Buffer): number {
  const codeString = codeBytes.toString("ascii");
  const codeInt = parseInt(codeString, 10);
  if (isNaN(codeInt) || codeInt < 0) {
    throw new Error(`code must be a non-negative number; got: ${codeString}`);
  }
  return codeInt;
}

export function decodeHexByte(data: Buffer): number {
  return parseInt(data.toString("ascii"), 16);
}
