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
  ttlSeconds?: number;
}

export interface UserCommandStatusReport extends UserCommandBase {
  code: UserCommandCode.StatusReport;
}

export interface UserCommandArm extends UserCommandBase {
  code:
    | UserCommandCode.ArmAway
    | UserCommandCode.ArmStay
    | UserCommandCode.ArmWithZeroEntryDelay;
  partitionId: number;
}

export interface UserCommandithPin extends UserCommandBase {
  code: UserCommandCode.ArmWithPIN | UserCommandCode.Disarm;
  partitionId: number;
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

export type UserCommandWithExpiration = UserCommand & {
  expiresAt: Date;
};

export function userCommandfromJSON(data: string): UserCommandWithExpiration {
  const { expiresAt, ...raw } = JSON.parse(data) as UserCommand & {
    expiresAt: string;
  };
  const cmd = { ...raw, expiresAt: new Date(expiresAt) };
  return cmd;
}
