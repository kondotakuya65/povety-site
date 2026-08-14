export const TOKEN_KEY = "prosperax_token";

export type AuthUser = {
  id: string;
  phone: string;
  email: string | null;
  role: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}
