"use client";

import { create } from "zustand";
import {
  authApi,
  ApiError,
  bindAuthHooks,
  type BusinessSummaryDto,
  type UserDto,
} from "./api";

/**
 * Auth state — access token lives in MEMORY only (XSS-safe default).
 * The refresh token is an httpOnly cookie handled by the API; `boot()`
 * performs the silent refresh on first mount.
 */

export type AuthStatus = "booting" | "guest" | "authed";

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: UserDto | null;
  businesses: BusinessSummaryDto[];

  boot: () => Promise<void>;
  login: (phone: string, password: string, country?: string) => Promise<void>;
  register: (
    firstName: string,
    lastName: string,
    phone: string,
    password: string,
    country?: string,
    language?: string,
    ref?: string
  ) => Promise<void>;
  /** ثبت‌نام سریع — فقط موبایل. Business خودکار با نام «کاتالوگ شما» ساخته می‌شود. */
  quickRegister: (phone: string, country?: string, ref?: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: { accessToken: string; user: UserDto; businesses: BusinessSummaryDto[] }) => void;
  /** refresh ساکت برای api client — توکن جدید را برمی‌گرداند */
  refresh: () => Promise<string | null>;
  /** به‌روزرسانی محلی فیلد passwordSet (بعد از setPassword بدون رفرش کامل) */
  markPasswordSet: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "booting",
  accessToken: null,
  user: null,
  businesses: [],

  setSession: (session) =>
    set({
      status: "authed",
      accessToken: session.accessToken,
      user: session.user,
      businesses: session.businesses,
    }),

  boot: async () => {
    try {
      const session = await authApi.refreshSession();
      get().setSession(session);
    } catch {
      set({ status: "guest", accessToken: null, user: null, businesses: [] });
    }
  },

  login: async (phone, password, country) => {
    const session = await authApi.loginUser({ phone, password, country });
    get().setSession(session);
  },

  register: async (firstName, lastName, phone, password, country, language, ref) => {
    const session = await authApi.registerUser({ firstName, lastName, phone, password, country, language, ref });
    get().setSession(session);
  },

  quickRegister: async (phone, country, ref) => {
    const session = await authApi.quickRegister({ phone, country, ref });
    get().setSession(session);
  },

  markPasswordSet: () => {
    set((s) => (s.user ? { user: { ...s.user, passwordSet: true } } : s));
  },

  logout: async () => {
    try {
      await authApi.logoutUser();
    } finally {
      set({ status: "guest", accessToken: null, user: null, businesses: [] });
    }
  },

  refresh: () => {
    // Single-flight: concurrent callers share ONE rotating refresh round-trip.
    // (Two rotations in parallel would invalidate the cookie mid-flight.)
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const session = await authApi.refreshSession();
          get().setSession(session);
          return session.accessToken;
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            set({ status: "guest", accessToken: null, user: null, businesses: [] });
          }
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }
    return refreshPromise;
  },
}));

let refreshPromise: Promise<string | null> | null = null;

// اتصال store به کلاینت API (یک‌بار در ماژول لود)
let bound = false;
export function bindApiClient(): void {
  if (bound) return;
  bound = true;
  bindAuthHooks({
    getToken: () => useAuthStore.getState().accessToken,
    refresh: () => useAuthStore.getState().refresh(),
  });
}
bindApiClient();
