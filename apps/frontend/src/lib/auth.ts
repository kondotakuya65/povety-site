export const TOKEN_KEY = "prosperax_token";
export const AUTH_EVENT = "prosperax-auth";

export type AuthUser = {
  id: string;
  phone: string;
  email: string | null;
  role: string;
};

function notifyAuthChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  notifyAuthChange();
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  notifyAuthChange();
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}
