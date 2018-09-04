export function parseLoginResponse(buf: Buffer): LoginResponse {
  return parseInt(buf.toString(), 10);
}

export enum LoginResponse {
  Failure,
  Success,
  Timeout,
  LoginRequest
}
