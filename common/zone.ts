export interface Zone {
  id: string;
  status: ZoneStatus;
}

export const enum ZoneStatus {
  Alarm = "Alarm",
  AlarmRestore = "Alarm Restore",
  Temper = "Temper",
  TemperRestore = "Temper Restore",
  Fault = "Fault",
  FaultRestore = "Fault Restore",
  Open = "Open",
  Restore = "Restore",
}
