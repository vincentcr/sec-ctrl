const BASE_API_URL = "http://localhost:3000";

type ApiOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "HEAD" | "OPTIONS";
  data?: any;
};

type Headers = { [k: string]: string };

export default async function api(
  path: string,
  options: ApiOptions = { method: "GET" }
) {
  const { data, method } = options;

  const headers: Headers = {
    "content-type": "application/json"
  };
  if (token != null) {
    headers.authorization = "Token " + token;
  }

  const body = data != null ? JSON.stringify(data) : undefined;

  const resp = await window.fetch(BASE_API_URL + path, {
    method,
    headers,
    body
  });
  const json = await resp.json();

  if (resp.status >= 300) {
    throw new Error(
      "unexpected response: " + JSON.stringify({ status: resp.status, json })
    );
  }

  return json;
}

let token: string | undefined;
export function setToken(newToken?: string) {
  token = newToken;
}
