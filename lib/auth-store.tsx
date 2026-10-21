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
  logout: (dest?: string) => Promise<void>;
  /** فاز ۱۰ — حذف حساب توسط خود کاربر (بازگشت از ثبت‌نام با شمارهٔ اشتباه)؛
   *  حساب + کسب‌وکارهای placeholder سمت سرور حذف می‌شوند، سپس کلاینت پاک و
   *  به صفحهٔ اول برمی‌گردد تا همه‌چیز از اول شروع شود. */
  deleteAccount: () => Promise<void>;
  setSession: (session: { accessToken: string; user: UserDto; businesses: BusinessSummaryDto[] }) => void;
  /** refresh ساکت برای api client — توکن جدید را برمی‌گرداند */
  refresh: () => Promise<string | null>;
  /** به‌روزرسانی محلی فیلد passwordSet (بعد از setPassword بدون رفرش کامل) */
  markPasswordSet: () => void;
  /** به‌روزرسانی محلی کاربر (بعد از editProfile بدون رفرش کامل) */
  updateUser: (patch: Partial<UserDto>) => void;
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
    // Single-flight: concurrent callers share ONE boot round-trip —
    // boot calls refreshSession which rotates the refresh cookie,
    // so two parallel boots would invalidate each other mid-flight.
    if (!bootPromise) {
      bootPromise = (async () => {
        try {
          const session = await authApi.refreshSession();
          get().setSession(session);
        } catch {
          set({ status: "guest", accessToken: null, user: null, businesses: [] });
        } finally {
          bootPromise = null;
        }
      })();
    }
    return bootPromise;
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

  deleteAccount: async () => {
    // سرور: کاسکید کامل (کسب‌وکارها/آگهی‌ها/توکن‌ها)؛ سپس پاکسازی کلاینت
    // مثل logout ولی با مقصد پیش‌فرض صفحهٔ اول (شروع دوبارهٔ ثبت‌نام).
    try {
      await authApi.deleteMe();
    } catch (err) {
      // اگر سرور نتوانست حذف کند، خطا به کاربر می‌رسد (کلاینت پاک نمی‌شود تا دوباره تلاش کند)
      throw err;
    }
    await get().logout("/");
  },

  markPasswordSet: () => {
    set((s) => (s.user ? { user: { ...s.user, passwordSet: true } } : s));
  },

  updateUser: (patch) => {
    set((s) => (s.user ? { user: { ...s.user, ...patch } } : s));
  },

  logout: async (dest?: string) => {
    try {
      await authApi.logoutUser();
    } catch {
      // حتی اگر سرور خطا داد، کلاینت را پاک کن — مهم‌تر از خطای سرور
    } finally {
      // ── پاکسازی کامل سمت کلاینت — بدون نیاز به رفرش دستی
      // ۱. state زاستند
      set({ status: "guest", accessToken: null, user: null, businesses: [] });
      // ۲. تمام localStorage (شامل welcome flags, scan prefs, referral codes, و ...)
      if (typeof window !== "undefined") {
        try { window.localStorage.clear(); } catch { /* private mode */ }
        // ۳. تمام sessionStorage
        try { window.sessionStorage.clear(); } catch { /* ignore */ }
        // ۴. کوکی‌های non-httpOnly (httpOnly ها را سرور پاک می‌کند)
        try {
          document.cookie.split(";").forEach((c) => {
            const eq = c.indexOf("=");
            const name = eq > -1 ? c.slice(0, eq).trim() : c.trim();
            if (name) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
            }
          });
        } catch { /* ignore */ }
      }
      // ۵. ریست zustand store (resume بعد از reload)
      // توجه: این set() بالا state را guest می‌کند، ولی بعد از reload هم تمیز می‌آید
      // چون localStorage و کوکی پاک شده‌اند → boot() توکنی پیدا نمی‌کند → guest می‌ماند
      // ۶. هدایت (بدون رفرش دستی — window.location) · پیش‌فرض /start (legacy)؛
      //    فاز ۳: شل v18 پس از خروج به صفحهٔ اول می‌رود (dest="/")
      if (typeof window !== "undefined") {
        window.location.href = dest ?? "/start";
      }
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
let bootPromise: Promise<void> | null = null;

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
