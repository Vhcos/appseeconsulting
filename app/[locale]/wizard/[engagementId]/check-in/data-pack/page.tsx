// app/[locale]/wizard/[engagementId]/check-in/data-pack/page.tsx
import { redirect } from "next/navigation";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{ period?: string; accountId?: string }>;

export default async function DataPackIndex({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = await searchParams;

  const qs = new URLSearchParams();
  if (sp.period) qs.set("period", sp.period);
  if (sp.accountId) qs.set("accountId", sp.accountId);

  const q = qs.toString();
  redirect(`/${locale}/wizard/${engagementId}/check-in/data-pack/ops${q ? `?${q}` : ""}`);
}
