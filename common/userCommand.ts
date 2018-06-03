import { ClientCode } from "./codes";
import { ClientMessage } from "./message";

export const enum UserCommandCode {
  StatusReport = "StatusReport",
  ArmAway = "ArmAway",
  ArmStay = "ArmStay",
  ArmWithPIN = "ArmWithPIN",
  ArmWithZeroEntryDelay = "ArmWithZeroEntryDelay",
  Disarm = "Disarm",
  Panic = "Panic",
}

export const enum PanicTarget {
  TargetFire = "1",
  TargetAmbulance = "2",
  TargetPolice = "3",
}

export type UserCommandBase = {
  validUntil: Date;
};

export interface UserCommandStatusReport extends UserCommandBase {
  code: UserCommandCode.StatusReport;
}

export interface UserCommandArm extends UserCommandBase {
  code:
    | UserCommandCode.ArmAway
    | UserCommandCode.ArmStay
    | UserCommandCode.ArmWithZeroEntryDelay;
  partitionID: string;
}

export interface UserCommandithPin extends UserCommandBase {
  code: UserCommandCode.ArmWithPIN | UserCommandCode.Disarm;
  partitionID: string;
  pin: string;
}

export interface UserCommandPanic extends UserCommandBase {
  code: UserCommandCode.Panic;
  target: PanicTarget;
}

export type UserCommand =
  | UserCommandStatusReport
  | UserCommandArm
  | UserCommandithPin
  | UserCommandPanic;

export function fromJSON(data: string): UserCommand {
  const raw = JSON.parse(data);
  return { ...raw, validUntil: new Date(raw.validUntil) };
}

export function toClientMessage(cmd: UserCommand) {
  validate(cmd);

  switch (cmd.code) {
    case UserCommandCode.StatusReport:
      return new ClientMessage(ClientCode.StatusReport);
    case UserCommandCode.ArmAway:
      return new ClientMessage(
        ClientCode.PartitionArmControlAway,
        Buffer.from(cmd.partitionID),
      );
    case UserCommandCode.ArmStay:
      return new ClientMessage(
        ClientCode.PartitionArmControlStayArm,
        Buffer.from(cmd.partitionID),
      );
    case UserCommandCode.ArmWithZeroEntryDelay:
      return new ClientMessage(
        ClientCode.PartitionArmControlZeroEntryDelay,
        Buffer.from(cmd.partitionID),
      );
    case UserCommandCode.ArmWithPIN:
      return new ClientMessage(
        ClientCode.PartitionArmControlWithCode,
        Buffer.concat([Buffer.from(cmd.partitionID), Buffer.from(cmd.pin)]),
      );
    case UserCommandCode.Disarm:
      return new ClientMessage(
        ClientCode.PartitionDisarmControl,
        Buffer.concat([Buffer.from(cmd.partitionID), Buffer.from(cmd.pin)]),
      );
    case UserCommandCode.Panic:
      return new ClientMessage(
        ClientCode.TriggerPanicAlarm,
        Buffer.from(cmd.target),
      );
    default:
      throw new Error("Unhandled user command:" + JSON.stringify(cmd));
  }
}

function validate(cmd: UserCommand) {
  switch (cmd.code) {
    case UserCommandCode.StatusReport:
      break;
    case UserCommandCode.ArmAway:
    case UserCommandCode.ArmStay:
    case UserCommandCode.ArmWithZeroEntryDelay:
      if (cmd.partitionID == null) {
        throw new Error("partitionID required");
      }
      break;
    case UserCommandCode.ArmWithPIN:
    case UserCommandCode.Disarm:
      if (cmd.partitionID == null) {
        throw new Error("partitionID required");
      }
      if (cmd.pin == null) {
        throw new Error("user pin required");
      }
      break;
    case UserCommandCode.Panic:
      if (cmd.target == null) {
        throw new Error("panic target required");
      }
      break;
    default:
      throw new Error("Unknown user command: " + JSON.stringify(cmd));
  }
}