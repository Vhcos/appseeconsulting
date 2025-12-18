// i18n/request.ts
import { getRequestConfig } from "next-intl/server";

const SUPPORTED = ["es", "en"] as const;
type SupportedLocale = (typeof SUPPORTED)[number];

function normalizeLocale(locale: string | undefined): SupportedLocale {
  if (locale === "en") return "en";
  return "es";
}

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = normalizeLocale(locale);

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  };
});
