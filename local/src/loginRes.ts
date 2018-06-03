export function getLoginRes(numString: string): LoginRes {
  console.log("getLoginRes", numString);
  return parseInt(numString, 10);
}

// 	// LoginResLoginRequest represents the LoginRequest code
// 	LoginResLoginRequest LoginRes = "3"
// 	// LoginResTimeout represents the Timeout code
// 	LoginResTimeout LoginRes = "2"
// 	// LoginResSuccess represents the Success code
// 	LoginResSuccess LoginRes = "1"
// 	// LoginResFailure represents the Failure code
// 	LoginResFailure LoginRes = "0"
// )

export enum LoginRes {
  Failure,
  Success,
  Timeout,
  LoginRequest,
}
