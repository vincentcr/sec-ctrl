export const enum PartitionStatus {
  Ready = "Ready",
  NotReady = "Not Ready",
  Armed = "Armed",
  InAlarm = "In Alarm",
  Disarmed = "Disarmed",
  Busy = "Busy"
}

export interface Partition {
  id: string;
  status: PartitionStatus;
  troubleStateLed: boolean;
  keypadLedFlashState: string[];
  keypadLedState: string[];
}
