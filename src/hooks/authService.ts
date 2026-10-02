import { loginWithPin, loginWithEmail } from "@/api/auth";
import type { User } from "@/pages/POS/components/types";

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER: "user",
  POS_APP_SLUG: "posAppSlug",
} as const;

function getStoredAuth(): { user: User; token: string } | null {
  const stored = localStorage.getItem(STORAGE_KEYS.USER);
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (stored && token) return { user: JSON.parse(stored), token };
  return null;
}

function setStoredAuth(user: User, accessToken: string, refreshToken: string): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

function setPosAppSlug(slug: string): void {
  localStorage.setItem(STORAGE_KEYS.POS_APP_SLUG, slug);
}

function getPosAppSlug(): string | null {
  return localStorage.getItem(STORAGE_KEYS.POS_APP_SLUG);
}

function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export interface AuthService {
  getStoredUser: () => User | null;
  getAccessToken: () => string | null;
  setPosAppSlug: (slug: string) => void;
  getPosAppSlug: () => string | null;
  loginPin: (_pin: string, _schoolId: string) => Promise<User>;
  loginEmail: (_email: string, _password: string) => Promise<User>;
  logout: () => void;
}

export function createAuthService(): AuthService {
  return {
    getStoredUser: () => getStoredAuth()?.user ?? null,
    getAccessToken: () => getStoredAuth()?.token ?? null,
    setPosAppSlug,
    getPosAppSlug,
    loginPin: async (pin: string, schoolId: string) => {
      const res = await loginWithPin(pin, schoolId);
      setStoredAuth(res.user, res.accessToken, res.refreshToken);
      return res.user;
    },
    loginEmail: async (email: string, password: string) => {
      const res = await loginWithEmail(email, password);
      setStoredAuth(res.user, res.accessToken, res.refreshToken);
      return res.user;
    },
    logout: clearStoredAuth,
  };
}

export const authService = createAuthService();