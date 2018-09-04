import { PartitionStatus } from "./partition";
import { ZoneStatus } from "./zone";

export const enum EventType {
  Info = "Info",
  SystemError = "SystemError",
  Trouble = "Trouble",
  SystemTroubleStatus = "SystemTroubleStatus",
  Alarm = "Alarm",
  ZoneChange = "ZoneChange",
  PartitionChange = "PartitionChange",
  Partition = "Partition"
}

export interface BaseEvent {
  readonly recordedAt: Date;
}

export interface InfoEvent extends BaseEvent {
  readonly type: EventType.Info;
  readonly code: string;
  readonly data: string;
}
export interface SystemErrorEvent extends BaseEvent {
  readonly type: EventType.SystemError;
  readonly code: string;
}

export interface TroubleEvent extends BaseEvent {
  readonly type: EventType.Trouble;
  readonly code: string;
}

export interface SystemTroubleStatusEvent extends BaseEvent {
  readonly type: EventType.SystemTroubleStatus;
  readonly status: string[];
}

export interface AlarmEvent extends BaseEvent {
  readonly type: EventType.Alarm;
  readonly code: string;
}

export const enum PartitionChangeType {
  Status = "Status",
  KeypadLed = "KeypadLed",
  TroubleLed = "TroubleLed"
}

export interface PartitionChangeBaseEvent extends BaseEvent {
  readonly type: EventType.PartitionChange;
  readonly partitionId: number;
}

export interface PartitionStatusChangeEvent extends PartitionChangeBaseEvent {
  readonly changeType: PartitionChangeType.Status;
  readonly status: PartitionStatus;
}

export interface PartitionKeypadLedStateChangeEvent
  extends PartitionChangeBaseEvent {
  readonly changeType: PartitionChangeType.KeypadLed;
  readonly keypadState: string[];
  readonly flash: boolean;
}

export interface PartitionTroubleLedStateChangeEvent
  extends PartitionChangeBaseEvent {
  readonly changeType: PartitionChangeType.TroubleLed;
  readonly on: boolean;
}

export type PartitionChangeEvent =
  | PartitionStatusChangeEvent
  | PartitionKeypadLedStateChangeEvent
  | PartitionTroubleLedStateChangeEvent;

export interface ZoneChangeEvent extends BaseEvent {
  readonly type: EventType.ZoneChange;
  readonly zoneId: number;
  readonly status: ZoneStatus;
  readonly partitionId: number;
}

export interface PartitionEvent extends BaseEvent {
  readonly type: EventType.Partition;
  readonly partitionId: number;
  readonly code: string;
  readonly userId?: string;
}

export type SiteEvent =
  | InfoEvent
  | SystemErrorEvent
  | TroubleEvent
  | SystemTroubleStatusEvent
  | AlarmEvent
  | PartitionChangeEvent
  | ZoneChangeEvent
  | PartitionEvent;
