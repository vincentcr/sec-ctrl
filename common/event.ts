import { ServerCode } from "./codes";
import { decodeHexByte, decodeIntCode, encodeIntCode } from "./encodings";
import { errorCodeDescriptions } from "./errorCode";
import generateID from "./eventID";
import { ServerMessage } from "./message";
import { KeypadLedState, PartitionStatus } from "./partition";
import { SystemTroubleStatus } from "./systemTroubleStatus";
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

export interface SystemTroubleStatusEvent extends BaseEvent {
  readonly type: EventType.SystemTroubleStatus;
  readonly status: string[];
}

export interface AlarmEvent extends BaseEvent {
  readonly type: EventType.Alarm;
  readonly code: string;
}

export const enum PartitionChangeEventType {
  Status = "Status",
  KeypadLed = "KeypadLed",
  TroubleLed = "TroubleLed"
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
  readonly keypadState: string[];
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

export type SiteEvent =
  | InfoEvent
  | SystemErrorEvent
  | TroubleEvent
  | SystemTroubleStatusEvent
  | AlarmEvent
  | PartitionChangeEvent
  | ZoneChangeEvent
  | PartitionEvent;

export function fromJson(raw: any): SiteEvent {
  // const raw = JSON.build(json);
  return { ...raw, date: new Date(raw.date) };
}

export function fromServerMessage(msg: ServerMessage): SiteEvent {
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
    id: generateID(),
    type: EventType.SystemError,
    code: errDesc
  };
}

function buildInfoEvent(msg: ServerMessage): InfoEvent {
  return {
    date: new Date(),
    id: generateID(),
    type: EventType.Info,
    code: ServerCode[msg.code],
    data: msg.data.toString()
  };
}

function buildTroubleEvent(msg: ServerMessage): TroubleEvent {
  return {
    date: new Date(),
    id: generateID(),
    type: EventType.Trouble,
    code: ServerCode[msg.code]
  };
}

function buildAlarmEvent(msg: ServerMessage): AlarmEvent {
  return {
    date: new Date(),
    id: generateID(),
    type: EventType.Alarm,
    code: ServerCode[msg.code]
  };
}

function buildTroubleStatusEvent(msg: ServerMessage): SystemTroubleStatusEvent {
  const flags = decodeHexByte(msg.data);
  const status = SystemTroubleStatus.toStrings(flags);

  return {
    date: new Date(),
    id: generateID(),
    type: EventType.SystemTroubleStatus,
    status
  };
}

function buildPartitionStatusChangeEvent(
  msg: ServerMessage,
  status: PartitionStatus
): PartitionStatusChangeEvent {
  const partitionID = msg.data.toString();

  return {
    date: new Date(),
    id: generateID(),
    type: EventType.PartitionChange,
    changeType: PartitionChangeEventType.Status,
    partitionID,
    status
  };
}

function buildPartitionKeypadLedStateChangeEvent(
  msg: ServerMessage,
  flash: boolean
): PartitionKeypadLedStateChangeEvent {
  const partitionID = "1";
  const flags = decodeHexByte(msg.data);
  const keypadState = KeypadLedState.toStrings(flags);

  return {
    date: new Date(),
    id: generateID(),
    type: EventType.PartitionChange,
    changeType: PartitionChangeEventType.KeypadLed,
    partitionID,
    keypadState,
    flash
  };
}

function buildPartitionTroubleLedChangeEvent(
  msg: ServerMessage,
  on: boolean
): PartitionTroubleLedStateChangeEvent {
  const partitionID = msg.data.toString();

  return {
    date: new Date(),
    id: generateID(),
    type: EventType.PartitionChange,
    changeType: PartitionChangeEventType.TroubleLed,
    partitionID,
    on
  };
}

function buildZoneStatusChangeEvent(
  msg: ServerMessage,
  status: ZoneStatus
): ZoneChangeEvent {
  let zoneID: string;
  let partitionID: string | undefined;

  if (
    [
      ZoneStatus.Fault,
      ZoneStatus.FaultRestore,
      ZoneStatus.Open,
      ZoneStatus.Restore
    ].includes(status)
  ) {
    zoneID = msg.data.toString();
  } else {
    partitionID = msg.data.slice(0, 1).toString();
    zoneID = msg.data.slice(1).toString();
  }

  return {
    date: new Date(),
    id: generateID(),
    type: EventType.ZoneChange,
    zoneID,
    partitionID,
    status
  };
}

function buildPartitionEvent(msg: ServerMessage): PartitionEvent {
  const partitionID = msg.data.toString();

  return {
    date: new Date(),
    id: generateID(),
    type: EventType.Partition,
    partitionID,
    code: ServerCode[msg.code]
  };
}

function buildUserPartitionEvent(msg: ServerMessage): PartitionEvent {
  const partitionID = msg.data.slice(0, 1).toString();
  const userID = msg.data.slice(1).toString();

  return {
    date: new Date(),
    id: generateID(),
    type: EventType.Partition,
    partitionID,
    userID,
    code: ServerCode[msg.code]
  };
}
