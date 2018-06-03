import * as uuid from "uuid";

import { ServerMessage } from "./message";
import { ServerCode } from "./codes";
import { errorCodeDescriptions } from "./errorCode";
import { SystemTroubleStatus } from "./systemTroubleStatus";
import { KeypadLedState, PartitionStatus } from "./partition";
import { ZoneStatus } from "./zone";
import { decodeIntCode, encodeIntCode, decodeHexByte } from "./encodings";

export const enum EventType {
  Info = "Info",
  SystemError = "SystemError",
  Trouble = "Trouble",
  TroubleStatus = "TroubleStatus",
  Alarm = "Alarm",
  ZoneChange = "ZoneChange",
  PartitionChange = "PartitionChange",
  Partition = "Partition",
}

export interface BaseEvent {
  readonly date: Date;
  readonly id: string;
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

export interface TroubleStatusEvent extends BaseEvent {
  readonly type: EventType.TroubleStatus;
  readonly status: SystemTroubleStatus;
}

export interface AlarmEvent extends BaseEvent {
  readonly type: EventType.Alarm;
  readonly code: string;
}

export const enum PartitionChangeEventType {
  Status = "Status",
  KeypadLed = "KeypadLed",
  TroubleLed = "TroubleLed",
}

export interface PartitionChangeBaseEvent extends BaseEvent {
  readonly type: EventType.PartitionChange;
  readonly partitionID: string;
}

export interface PartitionStatusChangeEvent extends PartitionChangeBaseEvent {
  readonly changeType: PartitionChangeEventType.Status;
  readonly status: PartitionStatus;
}

export interface PartitionKeypadLedStateChangeEvent
  extends PartitionChangeBaseEvent {
  readonly changeType: PartitionChangeEventType.KeypadLed;
  readonly keypadState: KeypadLedState;
  readonly flash: boolean;
}

export interface PartitionTroubleLedStateChangeEvent
  extends PartitionChangeBaseEvent {
  readonly changeType: PartitionChangeEventType.TroubleLed;
  readonly on: boolean;
}

export type PartitionChangeEvent =
  | PartitionStatusChangeEvent
  | PartitionKeypadLedStateChangeEvent
  | PartitionTroubleLedStateChangeEvent;

export interface ZoneChangeEvent extends BaseEvent {
  readonly type: EventType.ZoneChange;
  readonly zoneID: string;
  readonly status: ZoneStatus;
  readonly partitionID?: string;
}

export interface PartitionEvent extends BaseEvent {
  readonly type: EventType.Partition;
  readonly partitionID: string;
  readonly code: string;
  readonly userID?: string;
}

export type Event =
  | InfoEvent
  | SystemErrorEvent
  | TroubleEvent
  | TroubleStatusEvent
  | AlarmEvent
  | PartitionChangeEvent
  | ZoneChangeEvent
  | PartitionEvent;

export function fromJson(raw: any): Event {
  // const raw = JSON.build(json);
  return { ...raw, date: new Date(raw.date) };
}

export function fromServerMessage(msg: ServerMessage): Event {
  switch (msg.code) {
    case ServerCode.SysErr:
      return buildSystemErrorEvent(msg);

    case ServerCode.KeypadLedState:
      return buildPartitionKeypadLedStateChangeEvent(msg, false);
    case ServerCode.KeypadLedFlashState:
      return buildPartitionKeypadLedStateChangeEvent(msg, true);

    case ServerCode.PartitionReady:
      return buildPartitionStatusChangeEvent(msg, PartitionStatus.Ready);
    case ServerCode.PartitionNotReady:
      return buildPartitionStatusChangeEvent(msg, PartitionStatus.NotReady);
    case ServerCode.PartitionArmed:
      return buildPartitionStatusChangeEvent(msg, PartitionStatus.Armed);
    case ServerCode.PartitionInAlarm:
      return buildPartitionStatusChangeEvent(msg, PartitionStatus.InAlarm);
    case ServerCode.PartitionDisarmed:
      return buildPartitionStatusChangeEvent(msg, PartitionStatus.Disarmed);
    case ServerCode.PartitionBusy:
      return buildPartitionStatusChangeEvent(msg, PartitionStatus.Busy);

    case ServerCode.ZoneAlarm:
      return buildZoneStatusChangeEvent(msg, ZoneStatus.Alarm);
    case ServerCode.ZoneAlarmRestore:
      return buildZoneStatusChangeEvent(msg, ZoneStatus.AlarmRestore);
    case ServerCode.ZoneTemper:
      return buildZoneStatusChangeEvent(msg, ZoneStatus.Temper);
    case ServerCode.ZoneTemperRestore:
      return buildZoneStatusChangeEvent(msg, ZoneStatus.TemperRestore);
    case ServerCode.ZoneFault:
      return buildZoneStatusChangeEvent(msg, ZoneStatus.Fault);
    case ServerCode.ZoneFaultRestore:
      return buildZoneStatusChangeEvent(msg, ZoneStatus.FaultRestore);
    case ServerCode.ZoneOpen:
      return buildZoneStatusChangeEvent(msg, ZoneStatus.Open);
    case ServerCode.ZoneRestore:
      return buildZoneStatusChangeEvent(msg, ZoneStatus.Restore);

    case ServerCode.TroubleLEDOff:
      return buildPartitionTroubleLedChangeEvent(msg, false);
    case ServerCode.TroubleLEDOn:
      return buildPartitionTroubleLedChangeEvent(msg, true);

    case ServerCode.ExitDelayInProgress:
    case ServerCode.EntryDelayInProgress:
    case ServerCode.KeypadLockOut:
    case ServerCode.PartitionArmingFailed:
    case ServerCode.PGMOutputInProgress:
    case ServerCode.ChimeEnabled:
    case ServerCode.ChimeDisabled:
    case ServerCode.SystemArmingInProgress:
    case ServerCode.PartialClosing:
    case ServerCode.SpecialClosing:
    case ServerCode.SpecialOpening:
    case ServerCode.InvalidAccessCode:
      return buildPartitionEvent(msg);

    case ServerCode.UserClosing:
    case ServerCode.UserOpening:
      return buildUserPartitionEvent(msg);

    case ServerCode.VerboseTroubleStatus:
      return buildTroubleStatusEvent(msg);

    case ServerCode.PanelBatteryTrouble:
    case ServerCode.PanelACTrouble:
    case ServerCode.SystemBellTrouble:
    case ServerCode.FTCTrouble:
    case ServerCode.BufferNearFull:
    case ServerCode.GeneralSystemTamper:
      return buildTroubleEvent(msg);

    case ServerCode.DuressAlarm:
    case ServerCode.FireAlarm:
    case ServerCode.AuxillaryAlarm:
    case ServerCode.SmokeOrAuxAlarm:
    case ServerCode.FireTroubleAlarm:
    case ServerCode.PanicAlarm:
      return buildAlarmEvent(msg);

    default:
      return buildInfoEvent(msg);
  }
}

function buildSystemErrorEvent(msg: ServerMessage): SystemErrorEvent {
  const errCode = decodeIntCode(msg.data);
  const errDesc = errorCodeDescriptions[errCode];
  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.SystemError,
    code: errDesc,
  };
}

function buildInfoEvent(msg: ServerMessage): InfoEvent {
  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.Info,
    code: ServerCode[msg.code],
    data: msg.data.toString(),
  };
}

function buildTroubleEvent(msg: ServerMessage): TroubleEvent {
  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.Trouble,
    code: ServerCode[msg.code],
  };
}

function buildAlarmEvent(msg: ServerMessage): AlarmEvent {
  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.Alarm,
    code: ServerCode[msg.code],
  };
}

function buildTroubleStatusEvent(msg: ServerMessage): TroubleStatusEvent {
  const status = <SystemTroubleStatus>decodeHexByte(msg.data);
  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.TroubleStatus,
    status,
  };
}

function buildPartitionStatusChangeEvent(
  msg: ServerMessage,
  status: PartitionStatus,
): PartitionStatusChangeEvent {
  const partitionID = msg.data.toString();

  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.PartitionChange,
    changeType: PartitionChangeEventType.Status,
    partitionID,
    status,
  };
}

function buildPartitionKeypadLedStateChangeEvent(
  msg: ServerMessage,
  flash: boolean,
): PartitionKeypadLedStateChangeEvent {
  const partitionID = "1";
  const keypadState = <KeypadLedState>decodeHexByte(msg.data);

  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.PartitionChange,
    changeType: PartitionChangeEventType.KeypadLed,
    partitionID,
    keypadState,
    flash,
  };
}

function buildPartitionTroubleLedChangeEvent(
  msg: ServerMessage,
  on: boolean,
): PartitionTroubleLedStateChangeEvent {
  const partitionID = msg.data.toString();

  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.PartitionChange,
    changeType: PartitionChangeEventType.TroubleLed,
    partitionID,
    on,
  };
}

function buildZoneStatusChangeEvent(
  msg: ServerMessage,
  status: ZoneStatus,
): ZoneChangeEvent {
  let zoneID: string;
  let partitionID: string | undefined;

  if (
    [
      ZoneStatus.Fault,
      ZoneStatus.FaultRestore,
      ZoneStatus.Open,
      ZoneStatus.Restore,
    ].includes(status)
  ) {
    zoneID = msg.data.toString();
  } else {
    partitionID = msg.data.slice(0, 1).toString();
    zoneID = msg.data.slice(1).toString();
  }

  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.ZoneChange,
    zoneID,
    partitionID,
    status,
  };
}

function buildPartitionEvent(msg: ServerMessage): PartitionEvent {
  const partitionID = msg.data.toString();

  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.Partition,
    partitionID,
    code: ServerCode[msg.code],
  };
}

function buildUserPartitionEvent(msg: ServerMessage): PartitionEvent {
  const partitionID = msg.data.slice(0, 1).toString();
  const userID = msg.data.slice(1).toString();

  return {
    date: new Date(),
    id: uuid.v1(),
    type: EventType.Partition,
    partitionID,
    userID,
    code: ServerCode[msg.code],
  };
}
