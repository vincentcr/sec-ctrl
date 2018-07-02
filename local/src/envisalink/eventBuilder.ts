import { PartitionStatus } from "../../../common/partition";
import {
  AlarmEvent,
  EventType,
  InfoEvent,
  PartitionChangeEventType,
  PartitionEvent,
  PartitionKeypadLedStateChangeEvent,
  PartitionStatusChangeEvent,
  PartitionTroubleLedStateChangeEvent,
  SiteEvent,
  SystemErrorEvent,
  SystemTroubleStatusEvent,
  TroubleEvent,
  ZoneChangeEvent
} from "../../../common/siteEvent";
import { ZoneStatus } from "../../../common/zone";
import { ServerCode } from "./codes";
import { decodeHexByte, decodeIntCode } from "./encodings";
import { errorCodeDescriptions } from "./errorCode";
import generateID from "./eventID";
import { KeypadLedState } from "./keypadLedState";
import { ServerMessage } from "./message";
import { SystemTroubleStatus } from "./systemTroubleStatus";

const MAX_ZONES_PER_PARTITION = 8;

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
  const partitionID = decodeIntCode(msg.data);

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
  const partitionID = 1;
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
  const partitionID = decodeIntCode(msg.data);

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
  let zoneID: number;
  let partitionID: number | undefined;

  if (
    [
      ZoneStatus.Fault,
      ZoneStatus.FaultRestore,
      ZoneStatus.Open,
      ZoneStatus.Restore
    ].includes(status)
  ) {
    zoneID = decodeIntCode(msg.data);
    partitionID = Math.ceil(zoneID / MAX_ZONES_PER_PARTITION);
  } else {
    partitionID = decodeIntCode(msg.data.slice(0, 1));
    zoneID = decodeIntCode(msg.data.slice(1));
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
  const partitionID = decodeIntCode(msg.data);

  return {
    date: new Date(),
    id: generateID(),
    type: EventType.Partition,
    partitionID,
    code: ServerCode[msg.code]
  };
}

function buildUserPartitionEvent(msg: ServerMessage): PartitionEvent {
  const partitionID = decodeIntCode(msg.data.slice(0, 1));
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
