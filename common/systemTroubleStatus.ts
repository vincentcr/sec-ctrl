import { Flags } from "./flags";

export const SystemTroubleStatus = new Flags({
  "Service Required": 1 << 0,
  "AC Power Lost": 1 << 1,
  "Telephone Line Fault": 1 << 2,
  "Failure To Communicate": 1 << 3,
  "Sensor Or Zone Fault": 1 << 4,
  "Sensor Or Zone Temper": 1 << 5,
  "Sensor Or Zone Low Battery": 1 << 6,
  "Loss Of Time": 1 << 7
});
