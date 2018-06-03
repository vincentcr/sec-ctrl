import { Flags } from "./flags";

export const enum PartitionStatus {
  Ready = "Ready",
  NotReady = "Not Ready",
  Armed = "Armed",
  InAlarm = "In Alarm",
  Disarmed = "Disarmed",
  Busy = "Busy",
}

export type KeypadLedState = number;

export const KeypadLedStateFlags = new Flags<KeypadLedState>({
  Ready: 1 << 1,
  Armed: 1 << 2,
  Memory: 1 << 3,
  Bypass: 1 << 4,
  Trouble: 1 << 5,
  Program: 1 << 6,
  Fire: 1 << 7,
  Backlight: 1 << 8,
});

export interface Partition {
  id: string;
  status: PartitionStatus;
  troubleStateLed: boolean;
  keypadLedFlashState: KeypadLedState;
  keypadLedState: KeypadLedState;
}
