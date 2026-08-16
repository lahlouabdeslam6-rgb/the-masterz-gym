import type { components } from "@masterz/api-client";

export type SessionUser = components["schemas"]["UserRead"];

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "auth_user";
export const AUTH_CHANGED_EVENT = "masterz-auth-changed";

const roleSlugs: Record<SessionUser["role"], string> = {
  admin: "admin",
  receptionist: "reception",
  coach: "coach",
  member: "membre",
  recovery_client: "recovery",
  cafe_employee: "cafe",
};

export function dashboardPath(role: SessionUser["role"]) {
  return `/espace/${roleSlugs[role]}`;
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!accessToken || !refreshToken || !rawUser) return null;

  try {
    return {
      accessToken,
      refreshToken,
      user: JSON.parse(rawUser) as SessionUser,
    };
  } catch {
    clearSession();
    return null;
  }
}

export function updateSessionUser(user: SessionUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function authorizationHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}
