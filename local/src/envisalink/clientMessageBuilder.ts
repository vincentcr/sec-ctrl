import {
  PanicTarget,
  UserCommand,
  UserCommandCode
} from "../../../common/userCommand";
import { ClientCode } from "./codes";
import { ClientMessage } from "./message";

const PanicTargetCodes: { [k in PanicTarget]: string } = {
  Fire: "1",
  Ambulance: "2",
  Police: "3"
};

export function fromUserCommand(cmd: UserCommand) {
  switch (cmd.code) {
    case UserCommandCode.StatusReport:
      return new ClientMessage(ClientCode.StatusReport);
    case UserCommandCode.ArmAway:
      return new ClientMessage(
        ClientCode.PartitionArmControlAway,
        Buffer.from(cmd.partitionID)
      );
    case UserCommandCode.ArmStay:
      return new ClientMessage(
        ClientCode.PartitionArmControlStayArm,
        Buffer.from(cmd.partitionID)
      );
    case UserCommandCode.ArmWithZeroEntryDelay:
      return new ClientMessage(
        ClientCode.PartitionArmControlZeroEntryDelay,
        Buffer.from(cmd.partitionID)
      );
    case UserCommandCode.ArmWithPIN:
      return new ClientMessage(
        ClientCode.PartitionArmControlWithCode,
        Buffer.concat([Buffer.from(cmd.partitionID), Buffer.from(cmd.pin)])
      );
    case UserCommandCode.Disarm:
      return new ClientMessage(
        ClientCode.PartitionDisarmControl,
        Buffer.concat([Buffer.from(cmd.partitionID), Buffer.from(cmd.pin)])
      );
    case UserCommandCode.Panic:
      return new ClientMessage(
        ClientCode.TriggerPanicAlarm,
        Buffer.from(PanicTargetCodes[cmd.target].toString())
      );
    default:
      throw new Error("Unhandled user command:" + JSON.stringify(cmd));
  }
}
