import { UserModel } from "./UserModel";
import { SiteModel } from "./SiteModel";
import { SiteEventModel } from "./SiteEventModel";
import { AccessTokenModel } from "./AccessTokenModel";

export { AccessToken } from "./AccessTokenModel";
export { User } from "./UserModel";
export { SiteEventRecord } from "./SiteEventModel";

export interface Models {
  readonly Users: UserModel;
  readonly AccessTokens: AccessTokenModel;
  readonly Sites: SiteModel;
  readonly SiteEvents: SiteEventModel;
}

export function initModels(
  dynamodbClient: AWS.DynamoDB.DocumentClient
): Models {
  return {
    Users: new UserModel(dynamodbClient),
    AccessTokens: new AccessTokenModel(dynamodbClient),
    Sites: new SiteModel(dynamodbClient),
    SiteEvents: new SiteEventModel(dynamodbClient)
  };
}
