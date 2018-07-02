export const enum UserCommandCode {
  StatusReport = "StatusReport",
  ArmAway = "ArmAway",
  ArmStay = "ArmStay",
  ArmWithPIN = "ArmWithPIN",
  ArmWithZeroEntryDelay = "ArmWithZeroEntryDelay",
  Disarm = "Disarm",
  Panic = "Panic"
}

export type PanicTarget = "Fire" | "Ambulance" | "Police";

export interface UserCommandBase {
  validUntil: Date;
}

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
