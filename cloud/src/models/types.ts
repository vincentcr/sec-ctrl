import { Partition } from "../../../common/partition";
import { Zone } from "../../../common/zone";
import { Event } from "../../../common/event";

export interface QueryResultPage<T> {
  readonly items: T[];
  readonly cursor?: object;
}

export interface UserRecord {
  readonly id: string;
  readonly username: string;
}

export interface AccessTokenRecord {
  readonly userID: string;
  readonly token: string;
}

export interface SiteRecord {
  readonly thingID: string;
  readonly claimedByID: string;
  readonly partitions: { [id: string]: Partition };
  readonly zones: { [id: string]: Zone };
  readonly systemTroubleStatus: string[];
}

export interface SiteEventRecord {
  readonly data: {
    readonly event: Event;
    readonly receivedAt: string;
  };
  readonly thingID: string;
  readonly eventID: string;
}
