import * as _ from "lodash";

class Code {
  readonly name: string;
  readonly value: number;
  constructor(name: string, value: number) {
    this.name = name;
    this.value = value;
  }
}

const clientCodes = [new Code("Poll", 0), new Code("StatusReport", 1)];

const clientCodesByName = _.keyBy(clientCodes, "name");
const clientCodesByValue = _.keyBy(clientCodes, "value");

enum Foo {
  x = 1,
  y = 40,
}

// Foo.constructor;

export enum ClientCode {
  Poll = 0,
  StatusReport = 1,
  DumpZoneTimers = 8,
  NetworkLogin = 5,
  SetTimeAndDate = 10,
  CommandOutputControl = 20,
  PartitionArmControlAway = 30,
  PartitionArmControlStayArm = 31,
  PartitionArmControlZeroEntryDelay = 32,
  PartitionArmControlWithCode = 33,
  PartitionDisarmControl = 40,
  TimeStampControl = 55,
  TimeBroadcastControl = 56,
  TemperatureBroadcastControl = 57,
  TriggerPanicAlarm = 60,
  SendKeystrokeString = 71,
  EnterUserCodeProgramming = 72,
  EnterUserProgramming = 73,
  KeepAlive = 74,
  CodeSend = 200,
}

export enum ServerCode {
  // Ack is the server code for Ack
  Ack = 500,
  // CmdErr is the server code for CmdErr
  CmdErr = 501,
  // SysErr is the server code for SysErr
  SysErr = 502,
  // LoginRes is the server code for LoginRes
  LoginRes = 505,
  // KeypadLedState is the server code for KeypadLedState
  KeypadLedState = 510,
  // KeypadLedFlashState is the server code for KeypadLedFlashState
  KeypadLedFlashState = 511,
  // SystemTime is the server code for SystemTime
  SystemTime = 550,
  // RingDetect is the server code for RingDetect
  RingDetect = 560,
  // IndoorTemperature is the server code for IndoorTemperature
  IndoorTemperature = 561,
  // OutdoorTemperature is the server code for OutdoorTemperature
  OutdoorTemperature = 562,
  // ZoneAlarm is the server code for ZoneAlarm
  ZoneAlarm = 601,
  // ZoneAlarmRestore is the server code for ZoneAlarmRestore
  ZoneAlarmRestore = 602,
  // ZoneTemper is the server code for ZoneTemper
  ZoneTemper = 603,
  // ZoneTemperRestore is the server code for ZoneTemperRestore
  ZoneTemperRestore = 604,
  // ZoneFault is the server code for ZoneFault
  ZoneFault = 605,
  // ZoneFaultRestore is the server code for ZoneFaultRestore
  ZoneFaultRestore = 606,
  // ZoneOpen is the server code for ZoneOpen
  ZoneOpen = 609,
  // ZoneRestore is the server code for ZoneRestore
  ZoneRestore = 610,
  // ZoneTimerTick is the server code for ZoneTimerTick
  ZoneTimerTick = 615,
  // DuressAlarm is the server code for DuressAlarm
  DuressAlarm = 620,
  // FireAlarm is the server code for FireAlarm
  FireAlarm = 621,
  // FireAlarmRestore is the server code for FireAlarmRestore
  FireAlarmRestore = 622,
  // AuxillaryAlarm is the server code for AuxillaryAlarm
  AuxillaryAlarm = 623,
  // AuxillaryAlarmRestore is the server code for AuxillaryAlarmRestore
  AuxillaryAlarmRestore = 624,
  // PanicAlarm is the server code for PanicAlarm
  PanicAlarm = 625,
  // PanicAlarmRestore is the server code for PanicAlarmRestore
  PanicAlarmRestore = 626,
  // SmokeOrAuxAlarm is the server code for SmokeOrAuxAlarm
  SmokeOrAuxAlarm = 631,
  // SmokeOrAuxAlarmRestore is the server code for SmokeOrAuxAlarmRestore
  SmokeOrAuxAlarmRestore = 632,
  // PartitionReady is the server code for PartitionReady
  PartitionReady = 650,
  // PartitionNotReady is the server code for PartitionNotReady
  PartitionNotReady = 651,
  // PartitionArmed is the server code for PartitionArmed
  PartitionArmed = 652,
  // PartitionReadyForceArmingEnabled is the server code for PartitionReadyForceArmingEnabled
  PartitionReadyForceArmingEnabled = 653,
  // PartitionInAlarm is the server code for PartitionInAlarm
  PartitionInAlarm = 654,
  // PartitionDisarmed is the server code for PartitionDisarmed
  PartitionDisarmed = 655,
  // ExitDelayInProgress is the server code for ExitDelayInProgress
  ExitDelayInProgress = 656,
  // EntryDelayInProgress is the server code for EntryDelayInProgress
  EntryDelayInProgress = 657,
  // KeypadLockOut is the server code for KeypadLockOut
  KeypadLockOut = 658,
  // PartitionArmingFailed is the server code for PartitionArmingFailed
  PartitionArmingFailed = 659,
  // PGMOutputInProgress is the server code for PGMOutputInProgress
  PGMOutputInProgress = 660,
  // ChimeEnabled is the server code for ChimeEnabled
  ChimeEnabled = 663,
  // ChimeDisabled is the server code for ChimeDisabled
  ChimeDisabled = 664,
  // InvalidAccessCode is the server code for InvalidAccessCode
  InvalidAccessCode = 670,
  // FunctionNotAvailable is the server code for FunctionNotAvailable
  FunctionNotAvailable = 671,
  // ArmingFailed is the server code for ArmingFailed
  ArmingFailed = 672,
  // PartitionBusy is the server code for PartitionBusy
  PartitionBusy = 673,
  // SystemArmingInProgress is the server code for SystemArmingInProgress
  SystemArmingInProgress = 674,
  // SystemInInstallersMode is the server code for SystemInInstallersMode
  SystemInInstallersMode = 680,
  // UserClosing is the server code for UserClosing
  UserClosing = 700,
  // SpecialClosing is the server code for SpecialClosing
  SpecialClosing = 701,
  // PartialClosing is the server code for PartialClosing
  PartialClosing = 702,
  // UserOpening is the server code for UserOpening
  UserOpening = 750,
  // SpecialOpening is the server code for SpecialOpening
  SpecialOpening = 751,
  // PanelBatteryTrouble is the server code for PanelBatteryTrouble
  PanelBatteryTrouble = 800,
  // PanelBatteryTroubleRestore is the server code for PanelBatteryTroubleRestore
  PanelBatteryTroubleRestore = 801,
  // PanelACTrouble is the server code for PanelACTrouble
  PanelACTrouble = 802,
  // PanelACRestore is the server code for PanelACRestore
  PanelACRestore = 803,
  // SystemBellTrouble is the server code for SystemBellTrouble
  SystemBellTrouble = 806,
  // SystemBellTroubleRestoral is the server code for SystemBellTroubleRestoral
  SystemBellTroubleRestoral = 807,
  // FTCTrouble is the server code for FTCTrouble
  FTCTrouble = 814,
  // BufferNearFull is the server code for BufferNearFull
  BufferNearFull = 816,
  // GeneralSystemTamper is the server code for GeneralSystemTamper
  GeneralSystemTamper = 829,
  // GeneralSystemTamperRestore is the server code for GeneralSystemTamperRestore
  GeneralSystemTamperRestore = 830,
  // TroubleLEDOn is the server code for TroubleLEDOn
  TroubleLEDOn = 840,
  // TroubleLEDOff is the server code for TroubleLEDOff
  TroubleLEDOff = 841,
  // FireTroubleAlarm is the server code for FireTroubleAlarm
  FireTroubleAlarm = 842,
  // FireTroubleAlarmRestore is the server code for FireTroubleAlarmRestore
  FireTroubleAlarmRestore = 843,
  // VerboseTroubleStatus is the server code for VerboseTroubleStatus
  VerboseTroubleStatus = 849,
  // CodeRequired is the server code for CodeRequired
  CodeRequired = 900,
  // CommandOutputPressed is the server code for CommandOutputPressed
  CommandOutputPressed = 912,
  // MasterCodeRequired is the server code for MasterCodeRequired
  MasterCodeRequired = 921,
  // InstallersCodeRequired is the server code for InstallersCodeRequired
  InstallersCodeRequired = 922,
}
