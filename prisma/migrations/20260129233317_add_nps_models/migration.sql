-- CreateEnum
CREATE TYPE "NpsInviteStatus" AS ENUM ('DRAFT', 'SENT', 'DELIVERED', 'BOUNCED', 'OPENED', 'RESPONDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "NpsReason" AS ENUM ('CONTROL_OPERATIVO', 'PERFORMANCE_CAMINOS', 'DATA_REPORTABILIDAD', 'SEGURIDAD_HSEC', 'RESPUESTA_EQUIPO', 'OTRO');

-- CreateEnum
CREATE TYPE "NpsFocus" AS ENUM ('MAYOR_PRESENCIA_EN_TERRENO', 'MEJOR_TECNOLOGIA_INNOVACION', 'MAS_DATOS_INSIGHTS', 'GESTION_ADMINISTRATIVA', 'MANTENER_ESTANDAR');

-- CreateTable
CREATE TABLE "NpsInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "companyId" TEXT,
    "engagementId" TEXT,
    "semesterKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "token" TEXT NOT NULL,
    "inviteUrl" TEXT,
    "status" "NpsInviteStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpsInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpsResponse" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" "NpsReason",
    "focus" "NpsFocus",
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "NpsResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NpsInvite_token_key" ON "NpsInvite"("token");

-- CreateIndex
CREATE INDEX "NpsInvite_semesterKey_idx" ON "NpsInvite"("semesterKey");

-- CreateIndex
CREATE INDEX "NpsInvite_email_idx" ON "NpsInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NpsResponse_inviteId_key" ON "NpsResponse"("inviteId");

-- CreateIndex
CREATE INDEX "NpsResponse_submittedAt_idx" ON "NpsResponse"("submittedAt");

-- AddForeignKey
ALTER TABLE "NpsResponse" ADD CONSTRAINT "NpsResponse_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "NpsInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
