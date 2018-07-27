import { VError } from "verror";

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
  constructor(reason = "The ID does not exist") {
    super({ name: "IDNotFound", info: { httpStatusCode: 404 } }, reason);
  }
}

export class UsernameNotFoundError extends VError {
  constructor(reason = "The user with specified name was not found") {
    super({ name: "UsernameNotFound", info: { httpStatusCode: 422 } }, reason);
  }
}

export class InvalidCredentialsError extends VError {
  constructor(reason = "The password did not match") {
    super(
      { name: "InvalidCredentials", info: { httpStatusCode: 401 } },
      reason
    );
  }
}

export class SiteAlreadyClaimedError extends VError {
  constructor(reason = "The site was already claimed") {
    super(
      { name: "SiteAlreadyClaimed", info: { httpStatusCode: 409 } },
      reason
    );
  }
}

export class SiteDoesNotExistError extends VError {
  constructor(reason = "The site does not exist") {
    super({ name: "SiteDoesNotExist", info: { httpStatusCode: 404 } }, reason);
  }
}

export class UserAlreadyExistsError extends VError {
  constructor(reason = "A user with the same username already exists") {
    super({ name: "UserAlreadyExists", info: { httpStatusCode: 409 } }, reason);
  }
}

export class UserNotAuthorizedError extends VError {
  constructor(reason = "The user is not authorized here") {
    super({ name: "UserNotAuthorized", info: { httpStatusCode: 401 } }, reason);
  }
}
