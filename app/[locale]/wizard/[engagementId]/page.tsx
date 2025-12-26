import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

export default async function EngagementHome({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;
  redirect(`/${locale}/wizard/${engagementId}/dashboard`);
}
