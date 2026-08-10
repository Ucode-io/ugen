import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru", "uz"],
  defaultLocale: "en",
  localePrefix: "never",
  // next-intl's default NEXT_LOCALE cookie has no max-age, so the language
  // choice dies with the browser session. Pin it for a year.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});
