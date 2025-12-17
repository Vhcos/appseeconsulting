import "./globals.css";
import { cookies } from "next/headers";

export const metadata = {
  title: "seeconsulting.cl",
  description: "Strategic consulting wizard + report + KPI tracking"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = cookies().get("NEXT_LOCALE")?.value ?? "es";
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

