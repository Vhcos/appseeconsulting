import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import Link from "next/link";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: "es" | "en" };
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-dvh bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href={`/${params.locale}`} className="font-semibold">
              <span className="rounded-md bg-brand-500 px-2 py-1 text-white">SEE</span>{" "}
              <span className="text-sm text-muted-foreground">consulting</span>
            </Link>

            <nav className="flex items-center gap-4 text-sm">
              <Link className="hover:underline" href={`/${params.locale}`}>Home</Link>
              <Link className="hover:underline" href={`/${params.locale}/wizard`}>Wizard</Link>
              <Link className="hover:underline" href={`/${params.locale}/report`}>Report</Link>
              <Link className="hover:underline" href={`/${params.locale}/tracking/kpis`}>KPI</Link>

              <div className="ml-2 flex gap-2">
                <Link className="rounded-md border px-2 py-1 text-xs" href={`/es`}>ES</Link>
                <Link className="rounded-md border px-2 py-1 text-xs" href={`/en`}>EN</Link>
              </div>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
