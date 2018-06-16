import { Partition } from "./partition";
import { Zone } from "./zone";

export interface Site {
  readonly thingID: string;
  readonly claimedByID: string;
  readonly partitions: { [id: string]: Partition };
  readonly zones: { [id: string]: Zone };
  readonly systemTroubleStatus: string[];
}
