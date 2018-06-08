export function getLoginRes(numString: string): LoginRes {
  return parseInt(numString, 10);
}

export enum LoginRes {
  Failure,
  Success,
  Timeout,
  LoginRequest
}
