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
  y = 40
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
  CodeSend = 200
}

export enum ServerCode {
  Ack = 500,
  CmdErr = 501,
  SysErr = 502,
  LoginRes = 505,
  KeypadLedState = 510,
  KeypadLedFlashState = 511,
  SystemTime = 550,
  RingDetect = 560,
  IndoorTemperature = 561,
  OutdoorTemperature = 562,
  ZoneAlarm = 601,
  ZoneAlarmRestore = 602,
  ZoneTemper = 603,
  ZoneTemperRestore = 604,
  ZoneFault = 605,
  ZoneFaultRestore = 606,
  ZoneOpen = 609,
  ZoneRestore = 610,
  ZoneTimerTick = 615,
  DuressAlarm = 620,
  FireAlarm = 621,
  FireAlarmRestore = 622,
  AuxillaryAlarm = 623,
  AuxillaryAlarmRestore = 624,
  PanicAlarm = 625,
  PanicAlarmRestore = 626,
  SmokeOrAuxAlarm = 631,
  SmokeOrAuxAlarmRestore = 632,
  PartitionReady = 650,
  PartitionNotReady = 651,
  PartitionArmed = 652,
  PartitionReadyForceArmingEnabled = 653,
  PartitionInAlarm = 654,
  PartitionDisarmed = 655,
  ExitDelayInProgress = 656,
  EntryDelayInProgress = 657,
  KeypadLockOut = 658,
  PartitionArmingFailed = 659,
  PGMOutputInProgress = 660,
  ChimeEnabled = 663,
  ChimeDisabled = 664,
  InvalidAccessCode = 670,
  FunctionNotAvailable = 671,
  ArmingFailed = 672,
  PartitionBusy = 673,
  SystemArmingInProgress = 674,
  SystemInInstallersMode = 680,
  UserClosing = 700,
  SpecialClosing = 701,
  PartialClosing = 702,
  UserOpening = 750,
  SpecialOpening = 751,
  PanelBatteryTrouble = 800,
  PanelBatteryTroubleRestore = 801,
  PanelACTrouble = 802,
  PanelACRestore = 803,
  SystemBellTrouble = 806,
  SystemBellTroubleRestoral = 807,
  FTCTrouble = 814,
  BufferNearFull = 816,
  GeneralSystemTamper = 829,
  GeneralSystemTamperRestore = 830,
  TroubleLEDOn = 840,
  TroubleLEDOff = 841,
  FireTroubleAlarm = 842,
  FireTroubleAlarmRestore = 843,
  VerboseTroubleStatus = 849,
  CodeRequired = 900,
  CommandOutputPressed = 912,
  MasterCodeRequired = 921,
  InstallersCodeRequired = 922
}