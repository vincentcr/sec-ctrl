import { ServerCode, ClientCode } from "./codes";
import { decodeIntCode, encodeIntCode } from "./encodings";

const CODE_LEN = 3;
const CHECKSUM_LEN = 2;

function mkMessageClass<TCode extends number>(
  codeDesc: (code: TCode) => string,
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

      const encodedCode = encodeIntCode(this.code);
      bytes.write(encodedCode);
      if (this.data != null) {
        this.data.copy(bytes, encodedCode.length);
      }

      const dataEndIdx = this.data.length + encodedCode.length;
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

    static decode(bytes: Buffer): Message {
      if (bytes.length < 5) {
        throw new Error(`Got ${bytes.length} bytes, need at least 5`);
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

      if (expectedChecksum.toLowerCase() != actualChecksum.toLowerCase()) {
        throw new Error(
          `failed to decode message ${bytes}: ` +
            `data ${data}, expected checksum ${expectedChecksum}, actual ${actualChecksum}`,
        );
      }

      const code = <TCode>decodeIntCode(codeBytes);

      const msg = new Message(code, data);

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
  (c: ServerCode) => ServerCode[c],
) {}

export class ClientMessage extends mkMessageClass<ClientCode>(
  c => ClientCode[c],
) {}
