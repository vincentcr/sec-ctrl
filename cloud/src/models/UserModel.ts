import * as bcrypt from "bcrypt";
import * as Knex from "knex";
import * as uuid from "uuid";

import { User } from "../../../common/user";
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  UsernameNotFoundError
} from "../errors";
import { BaseModel, ModelInitParams } from "./BaseModel";

export type UserRecord = User & {
  readonly hashedPassword: string;
  readonly isActive: boolean;
};

export class UserModel extends BaseModel<UserRecord> {
  private readonly bcryptRounds: number;

  constructor(params: ModelInitParams) {
    super(params, "users");
    this.bcryptRounds = this.config.get("security").bcryptRounds;
  }

  async create(params: { username: string; password: string }): Promise<User> {
    const { username, password } = params;
    const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

    const userRecord: UserRecord = {
      id: uuid.v4(),
      username,
      hashedPassword,
      isActive: true
    };

    try {
      await this.queryBuilder().insert(userRecord);
    } catch (err) {
      if (err.code === "23505") {
        throw new UserAlreadyExistsError();
      }
      throw err;
    }

    return UserModel.toUser(userRecord);
  }

  async getByID(id: string, onlyActive = false): Promise<User | undefined> {
    const q = this.queryBuilder()
      .select()
      .where({ id });

    if (onlyActive) {
      q.andWhere({ isActive: true });
    }

    const res = await q;

    if (res.length === 0) {
      return undefined;
    }

    const [userRecord] = res;

    return UserModel.toUser(userRecord);
  }

  private static toUser(
    userRecord: UserRecord
  ): { username: string; id: string } {
    const { hashedPassword, isActive, ...user } = userRecord;
    return user;
  }

  async authenticateByPassword(params: {
    username: string;
    password: string;
  }): Promise<User> {
    const { username, password } = params;

    const [userRecord]: UserRecord[] = await this.queryBuilder()
      .select()
      .where({ username });

    if (userRecord == null) {
      throw new UsernameNotFoundError();
    }

    const validPassword = await bcrypt.compare(
      password,
      userRecord.hashedPassword
    );
    if (!validPassword) {
      throw new InvalidCredentialsError();
    }

    return UserModel.toUser(userRecord);
  }

  async authenticateByToken(token: string): Promise<User> {
    const recs = await this.queryBuilder()
      .select("users.*")
      .joinRaw(
        "JOIN access_tokens ON validate_auth_token(access_tokens, users.id, ?)",
        token
      );

    if (recs.length === 0) {
      throw new InvalidCredentialsError("Invalid token");
    }
    return UserModel.toUser(recs[0]);
  }
}
