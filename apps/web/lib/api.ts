import { createMasterzClient, type components } from "@masterz/api-client";
import {
  authorizationHeaders,
  clearSession,
  getSession,
  saveSession,
  type AuthSession,
} from "./auth";

const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const apiBaseUrl = configuredApiBaseUrl.startsWith("/")
  ? typeof window === "undefined"
    ? "http://api:8000"
    : `${window.location.origin}${configuredApiBaseUrl}`
  : configuredApiBaseUrl;

export function resolveApiMediaUrl(mediaUrl: string | null | undefined) {
  if (!mediaUrl) return null;
  if (/^(https?:|data:|blob:)/i.test(mediaUrl)) return mediaUrl;
  return `${apiBaseUrl.replace(/\/$/, "")}/${mediaUrl.replace(/^\//, "")}`;
}
type TokenPair = components["schemas"]["TokenPair"];

let refreshInFlight: Promise<AuthSession | null> | null = null;

async function requestFreshSession(): Promise<AuthSession | null> {
  const current = getSession();
  if (!current) return null;

  const response = await globalThis.fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: current.refreshToken }),
  });
  if (!response.ok) {
    clearSession();
    return null;
  }

  const pair = (await response.json()) as TokenPair;
  const refreshed: AuthSession = {
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token,
    user: pair.user,
  };
  saveSession(refreshed);
  return refreshed;
}

async function refreshSessionOnce(): Promise<AuthSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = requestFreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function sessionAwareFetch(request: Request): Promise<Response> {
  const retrySource = request.clone();
  const response = await globalThis.fetch(request);
  const authorization = request.headers.get("Authorization");
  const isAuthRequest = new URL(request.url).pathname.startsWith(
    "/api/v1/auth/",
  );

  if (response.status !== 401 || !authorization || isAuthRequest) {
    return response;
  }

  let session = getSession();
  if (!session) return response;

  if (
    authorization === authorizationHeaders(session.accessToken).Authorization
  ) {
    session = await refreshSessionOnce();
  }
  if (!session) return response;

  const headers = new Headers(retrySource.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  return globalThis.fetch(new Request(retrySource, { headers }));
}

export const api = createMasterzClient(apiBaseUrl, {
  fetch: sessionAwareFetch,
});

export async function authenticatedFetch(path: string, init?: RequestInit) {
  return sessionAwareFetch(
    new Request(`${apiBaseUrl.replace(/\/$/, "")}${path}`, init),
  );
}
