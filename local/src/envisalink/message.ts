import * as VError from "verror";

import { ClientCode, ServerCode } from "./codes";
import { decodeIntCode, encodeIntCode } from "./encodings";

const CODE_LEN = 3;
const CHECKSUM_LEN = 2;

function mkMessageClass<TCode extends number>(
  codeDesc: (code: TCode) => string
) {
  return class Message {
    readonly code: TCode;
    readonly data: Buffer;

    constructor(code: TCode, data?: Buffer) {
      this.code = code;
      this.data = data || Buffer.alloc(0);
    }

    encode() {
      // code + data + checksum
      const len = CODE_LEN + this.data.length + CHECKSUM_LEN;
      const bytes = Buffer.allocUnsafe(len);

      const codeOffset = encodeIntCode(this.code, bytes);
      if (this.data != null) {
        this.data.copy(bytes, codeOffset);
      }

      const dataEndIdx = this.data.length + codeOffset;
      const checksum = computeChecksum(bytes.slice(0, dataEndIdx));

      bytes.write(checksum, dataEndIdx);

      return bytes;
    }

    toString() {
      return (
        `${this.constructor.name} ` +
        `{ code: ${codeDesc(this.code)}; data: ${this.data} }`
      );
    }

    static decode(bytes: Buffer) {
      if (bytes.length < 5) {
        throw new VError(
          { name: "MessageTooSmall", info: { bytes } },
          "Message too small, need at least 5 bytes"
        );
      }

      // CODE-DATA-CHECKSUM
      // code: 3 bytes
      // data: 0-n bytes
      // checksum: 2 bytes

      const dataStart = CODE_LEN;
      const dataEnd = bytes.length - CHECKSUM_LEN;
      const codeBytes = bytes.slice(0, dataStart);
      const data = bytes.slice(dataStart, dataEnd);
      const expectedChecksum = bytes.slice(dataEnd).toString("ascii");

      // verify checksum
      const actualChecksum = computeChecksum(bytes.slice(0, dataEnd));

      if (expectedChecksum.toLowerCase() !== actualChecksum.toLowerCase()) {
        throw new VError(
          {
            name: "MessageChecksumMismatch",
            info: {
              bytes,
              expectedChecksum,
              actualChecksum
            }
          },
          "Failed to decode message: checksum mismatch"
        );
      }

      const code = decodeIntCode(codeBytes) as TCode;

      const msg = new this(code, data);

      return msg;
    }
  };
}

function computeChecksum(bytes: Buffer): string {
  let sum: number = 0;
  for (const b of bytes) {
    sum += b;
  }

  sum = sum & 0xff;
  const checksum = sum.toString(16);
  return checksum;
}

export class ServerMessage extends mkMessageClass<ServerCode>(
  (c: ServerCode) => ServerCode[c]
) {}

export class ClientMessage extends mkMessageClass<ClientCode>(
  c => ClientCode[c]
) {}
