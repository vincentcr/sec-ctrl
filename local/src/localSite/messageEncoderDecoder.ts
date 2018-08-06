import { ClientMessage, ServerMessage } from "../envisalink/message";

const SEP = new Buffer("\r\n");

export class MessageEncoderDecoder {
  private decodeBuffer = Buffer.alloc(0);

  encode(msg: ClientMessage) {
    const buf = msg.encode();
    return Buffer.concat([buf, SEP]);
  }

  decode(data: Buffer): ServerMessage[] {
    this.decodeBuffer = Buffer.concat([this.decodeBuffer, data]);

    const { completeMessages, remainder } = splitBuffer(this.decodeBuffer, SEP);

    this.decodeBuffer = remainder || Buffer.alloc(0);

    return completeMessages.map(buf => ServerMessage.decode(buf));
  }
}

function splitBuffer(
  buf: Buffer,
  sep: Buffer
): { completeMessages: Buffer[]; remainder?: Buffer } {
  let idx = 0;

  const results = {
    completeMessages: [] as Buffer[],
    remainder: undefined as Buffer | undefined
  };

  while (idx < buf.length) {
    const nextIdx = buf.indexOf(sep, idx);
    if (nextIdx < 0) {
      results.remainder = buf.slice(idx);
      idx = buf.length;
    } else {
      const msgBuf = buf.slice(idx, nextIdx);
      results.completeMessages.push(msgBuf);
      idx = nextIdx + SEP.length;
    }
  }
  return results;
}
