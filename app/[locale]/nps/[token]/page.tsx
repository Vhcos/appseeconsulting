// app/[locale]/nps/[token]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SurveyClient from "./survey-client";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; token: string }>;

export default async function NpsSurveyPage({ params }: { params: ParamsPromise }) {
  const { locale, token } = await params;

  if (!token) return notFound();

  const invite = await prisma.npsInvite.findUnique({
    where: { token },
    include: { responses: true },
  });

  if (!invite) return notFound();

  const alreadyResponded = (invite.responses?.length ?? 0) > 0;

  return (
    <SurveyClient
      locale={locale}
      token={token}
      invite={{
        id: invite.id,
        semesterKey: invite.semesterKey,
        email: invite.email,
        fullName: invite.fullName ?? null,
        status: invite.status,
      }}
      alreadyResponded={alreadyResponded}
    />
  );
}
