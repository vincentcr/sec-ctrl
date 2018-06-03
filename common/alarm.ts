// AlarmType represents the different types of alarms
export const enum AlarmType {
  //AlarmTypePartition represents an alarm on a partition
  Partition = "Partition",
  //Duress represents a duress alarm
  Duress = "Duress",
  //Fire represents a "key" fire alarm
  Fire = "Fire",
  //Aux represents a "key" aux alarm
  Aux = "Aux",
  //Panic represents a panic alarm
  Panic = "Panic",
  //SmokeOrAux represents a smoke alarm
  SmokeOrAux = "Smoke/Aux",
}

import { event } from "./index";

const x = event.fromJson;
