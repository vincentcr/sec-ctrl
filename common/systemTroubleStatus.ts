import { Flags } from "./flags";

export const SystemTroubleStatus = new Flags({
  "Service Required": 1 << 1,
  "AC Power Lost": 1 << 2,
  "Telephone Line Fault": 1 << 3,
  "Failure To Communicate": 1 << 4,
  "Sensor Or Zone Fault": 1 << 5,
  "Sensor Or Zone Temper": 1 << 6,
  "Sensor Or Zone Low Battery": 1 << 7,
  "Loss Of Time": 1 << 8,
});
