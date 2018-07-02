export const enum ZoneStatus {
  Alarm = "Alarm",
  AlarmRestore = "Alarm Restore",
  Temper = "Temper",
  TemperRestore = "Temper Restore",
  Fault = "Fault",
  FaultRestore = "Fault Restore",
  Open = "Open",
  Restore = "Restore"
}

export interface Zone {
  id: string;
  partitionID: number;
  status: ZoneStatus;
}
