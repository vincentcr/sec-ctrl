import * as uuid from "uuid";
import * as bcrypt from "bcrypt";
import { UserRecord } from "./types";
import { BaseModel } from "./BaseModel";
import { VError } from "verror";
import {
  UserAlreadyExistsError,
  IDNotFoundError,
  UsernameNotFoundError,
  InvalidCredentialsError
} from "../errors";
import logger from "../logger";

interface UserRecordPrivate extends UserRecord {
  readonly hashedPassword: string;
}

export class UserModel extends BaseModel<UserRecordPrivate> {
  constructor(dynamodbClient: AWS.DynamoDB.DocumentClient) {
    super(dynamodbClient, "users");
  }

  async create(params: {
    username: string;
    password: string;
  }): Promise<UserRecord> {
    const { username, password } = params;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: uuid.v4(),
      username: params.username
    };
    try {
      await this.put({
        item: { ...user, hashedPassword },
        condition: "attribute_not_exists(username)"
      });
      return user;
    } catch (err) {
      if (err.code === "ConditionalCheckFailedException") {
        throw new UserAlreadyExistsError();
      } else {
        throw new VError({ cause: err }, "unexpected db error");
      }
    }
  }

  async getByID(id: string): Promise<UserRecord | undefined> {
    const res = await this.query({
      indexName: "id-index",
      keyConditionExpression: "id=:id",
      expressionAttributeValues: {
        ":id": id
      }
    });

    if (res.items.length === 0) {
      throw new IDNotFoundError();
    }

    const [privateUser] = res.items;

    return UserModel.toPublicUser(privateUser);
  }

  private static toPublicUser(privateUser: UserRecordPrivate): UserRecord {
    const { hashedPassword, ...user } = privateUser;
    return user;
  }

  async authenticate(params: {
    username: string;
    password: string;
  }): Promise<UserRecord> {
    const { username, password } = params;

    const privateUser = await this.get({ username });
    if (privateUser == null) {
      throw new UsernameNotFoundError();
    }

    const validPassword = await bcrypt.compare(
      password,
      privateUser.hashedPassword
    );
    if (!validPassword) {
      throw new InvalidCredentialsError();
    }

    return UserModel.toPublicUser(privateUser);
  }
}
