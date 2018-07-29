import * as crypto from "crypto";
import * as _ from "lodash";
import * as os from "os";

// This is copied from Mongo's ObjectID implementation.
// It gives us an id that is time-sorted, with additional
// machine-specific bits to ensure uniquess accross mulitple machines.

export default function generateID() {
  const machineID = state.machineID;
  const time = ~~(Date.now() / 1000);
  const pid = state.pid;
  const inc = state.counter++;

  // Buffer used
  const buffer = new Buffer(12);
  // Encode time
  buffer[3] = time & 0xff;
  buffer[2] = (time >> 8) & 0xff;
  buffer[1] = (time >> 16) & 0xff;
  buffer[0] = (time >> 24) & 0xff;
  // Encode machine
  buffer[6] = machineID & 0xff;
  buffer[5] = (machineID >> 8) & 0xff;
  buffer[4] = (machineID >> 16) & 0xff;
  // Encode pid
  buffer[8] = pid & 0xff;
  buffer[7] = (pid >> 8) & 0xff;
  // Encode index
  buffer[11] = inc & 0xff;
  buffer[10] = (inc >> 8) & 0xff;
  buffer[9] = (inc >> 16) & 0xff;
  // Return the buffer
  return buffer.toString("hex");
}

function initMachineID() {
  const nics = os.networkInterfaces();

  const macs = _(Object.values(nics))
    .flatten()
    .map(nic => nic.mac)
    .filter(mac => mac !== "00:00:00:00:00:00")
    .value()
    .join("-");

  const hash24Bits = crypto
    .createHash("md5")
    .update(macs)
    .digest()
    .slice(0, 3)
    .toString("hex");

  return parseInt(hash24Bits, 16);
}

const state = {
  pid: process.pid & 0xffff,
  counter: ~~(Math.random() * 0xffffff),
  machineID: initMachineID()
};
