import * as uuid from "uuid";
import * as bcrypt from "bcrypt";
import { UserRecord, DBError } from "./types";
import { BaseModel } from "./BaseModel";
import { VError } from "verror";

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
    await this.put({
      item: { ...user, hashedPassword },
      condition: "attribute_not_exists(username)"
    });
    return user;
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
      throw new VError(
        { name: DBError.EmailNotFound },
        "user with specified id not found"
      );
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
      throw new VError(
        { name: DBError.EmailNotFound },
        "user with specified username not found"
      );
    }

    const validPassword = await bcrypt.compare(
      password,
      privateUser.hashedPassword
    );
    if (!validPassword) {
      throw new VError(
        { name: DBError.PasswordMismatch },
        "the password did not match"
      );
    }

    return UserModel.toPublicUser(privateUser);
  }
}
