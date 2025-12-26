import WizardStepsNav from "@/components/see/WizardStepsNav";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

export default async function TablesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-0">
      <WizardStepsNav locale={locale} engagementId={engagementId} currentStep="tables" />
      {children}
    </div>
  );
}
