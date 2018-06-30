import { VError, Options } from "verror";

export class ValidationError extends VError {
  constructor(params: { dataPath: string; type: string }, message?: string) {
    super(
      {
        name: "ValidationError",
        info: { httpStatusCode: 400, ...params }
      },
      message || "Validation error"
    );
  }
}

export class IDNotFoundError extends VError {
  constructor() {
    super(
      { name: "IDNotFound", info: { httpStatusCode: 404 } },
      "The ID does not exist"
    );
  }
}

export class UsernameNotFoundError extends VError {
  constructor() {
    super(
      { name: "UsernameNotFound", info: { httpStatusCode: 422 } },
      "The username was not found"
    );
  }
}

export class PasswordMismatchError extends VError {
  constructor() {
    super(
      { name: "PasswordMismatch", info: { httpStatusCode: 401 } },
      "The password did not match"
    );
  }
}

export class SiteAlreadyClaimedError extends VError {
  constructor() {
    super(
      { name: "SiteAlreadyClaimed", info: { httpStatusCode: 409 } },
      "The site was already claimed"
    );
  }
}

export class UserAlreadyExistsError extends VError {
  constructor() {
    super(
      { name: "UserAlreadyExists", info: { httpStatusCode: 409 } },
      "A user with the same username already exists"
    );
  }
}
