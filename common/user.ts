export interface User {
  readonly id: string;
  readonly username: string;
  readonly sites: Array<{ thingID: string; name: string }>;
}
