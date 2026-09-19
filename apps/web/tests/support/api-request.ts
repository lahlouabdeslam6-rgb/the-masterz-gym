export function apiRequestUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  url.pathname = url.pathname.replace(/^\/backend(?=\/)/, "");
  return url;
}

export function apiRequestPath(requestUrl: string) {
  return apiRequestUrl(requestUrl).pathname;
}
