/**
 * Persian dictionary — the reference shape for all message files.
 * Add namespaces here first; ar/en must implement the same type.
 */
export const fa = {
  common: {
    languageAria: "انتخاب زبان",
    languageLabel: "زبان",
  },
  auth: {
    tabs: { login: "ورود", register: "ثبت‌نام" },
    titleLogin: "ورود به iMach",
    titleRegister: "ساخت حساب کاربری",
    subtitle: "با شماره موبایل وارد شوید تا بازوهایتان به حساب شما متصل بمانند.",
    fields: {
      fullName: "نام و نام خانوادگی",
      mobile: "موبایل",
      password: "رمز عبور",
      passwordRegister: "رمز عبور (حداقل ۸ کاراکتر)",
    },
    placeholders: {
      fullName: "مثلا علی رضایی",
      mobile: "09121234567",
      password: "",
    },
    demoHint: "demo: 09120000001 / ImachDemo1234",
    submitLogin: "ورود و ادامه",
    submitRegister: "ساخت حساب و ادامه",
    toasts: {
      invalidPhone: "شماره موبایل معتبر نیست",
      invalidPhoneDesc: "مثلا 09121234567",
      passwordShort: "رمز عبور حداقل ۸ کاراکتر باشد",
      nameRequired: "نام خود را بنویسید",
      authFailed: "احراز هویت ناموفق بود",
      tryAgain: "دوباره تلاش کنید",
      welcome: "خوش آمدید!",
    },
  },
};

export type Messages = typeof fa;
