// app/[locale]/layout.tsx
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return [{ locale: "es" }, { locale: "en" }];
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  const safeLocale = locale === "en" ? "en" : "es";
  const messages = await getMessages({ locale: safeLocale });

  return (
    <NextIntlClientProvider locale={safeLocale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
