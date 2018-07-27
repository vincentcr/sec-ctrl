import { Partition } from "./partition";
import { Zone } from "./zone";

export interface Site {
  readonly id: string;
  readonly name?: string;
  readonly ownerId: string;
  readonly partitions: Partition[];
  readonly zones: Zone[];
  readonly systemTroubleStatus: string[];
}
