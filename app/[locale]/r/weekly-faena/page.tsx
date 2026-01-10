import WeeklyFaenaReportForm from "@/components/see/WeeklyFaenaReportForm";

type ParamsPromise = Promise<{ locale: string }>;

export default async function WeeklyFaenaPublicPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const tokenRaw = sp.token;
  const token =
    typeof tokenRaw === "string"
      ? tokenRaw
      : Array.isArray(tokenRaw)
      ? tokenRaw[0]
      : "";

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <WeeklyFaenaReportForm locale={locale} token={token || ""} />
    </div>
  );
}
