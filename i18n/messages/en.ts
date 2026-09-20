import type { Messages } from "./fa";

/** English — LTR. */
export const en: Messages = {
  common: {
    languageAria: "Select language",
    languageLabel: "Language",
  },
  auth: {
    tabs: { login: "Sign in", register: "Sign up" },
    titleLogin: "Sign in to iMach",
    titleRegister: "Create your account",
    subtitle: "Sign in with your mobile number to keep your buy & sell arms attached to your account.",
    fields: {
      fullName: "Full name",
      mobile: "Mobile",
      password: "Password",
      passwordRegister: "Password (at least 8 characters)",
    },
    placeholders: {
      fullName: "e.g. Ali Rezaei",
      mobile: "09121234567",
      password: "••••••••",
    },
    demoHint: "demo: 09120000001 / ImachDemo1234",
    submitLogin: "Sign in & continue",
    submitRegister: "Create account & continue",
    toasts: {
      invalidPhone: "The mobile number is not valid",
      invalidPhoneDesc: "e.g. 09121234567",
      passwordShort: "Password must be at least 8 characters",
      nameRequired: "Please write your name",
      authFailed: "Authentication failed",
      tryAgain: "Please try again",
      welcome: "Welcome!",
    },
  },
};
