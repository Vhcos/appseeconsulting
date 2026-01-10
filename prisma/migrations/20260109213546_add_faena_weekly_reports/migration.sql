/*
  Warnings:

  - A unique constraint covering the columns `[kpiId,periodKey,scopeKey]` on the table `KpiValue` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SwotRiskTag" AS ENUM ('OPPORTUNITY', 'THREAT');

-- CreateEnum
CREATE TYPE "KpiBasis" AS ENUM ('A', 'L');

-- CreateEnum
CREATE TYPE "FaenaTurn" AS ENUM ('DAY', 'NIGHT', 'MIXED', 'NA');

-- CreateEnum
CREATE TYPE "WeeklyReportStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "WeeklySemaforo" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "DesvioCause" AS ENUM ('WEATHER', 'CLIENT_RESTRICTION', 'EQUIPMENT', 'INPUTS', 'HSEC', 'COORDINATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DetentionCause" AS ENUM ('EQUIPMENT', 'INPUTS', 'CLIENT', 'SAFETY', 'WEATHER', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportClienteEstado" AS ENUM ('ON_TIME', 'LATE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ReportClienteAtrasoCausa" AS ENUM ('MISSING_DATA', 'INTERNAL_APPROVAL', 'CLIENT', 'SYSTEM_TECH', 'OTHER');

-- CreateEnum
CREATE TYPE "DataPackEstado" AS ENUM ('UP_TO_DATE', 'LATE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "AccionCorrectivaEstado" AS ENUM ('YES', 'NO', 'NA');

-- CreateEnum
CREATE TYPE "ApoyoTipo" AS ENUM ('PURCHASING', 'MAINTENANCE', 'HSEC', 'DATA_TECH', 'COMMERCIAL_CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'OFF_TRACK', 'IN_PROGRESS', 'ON_TRACK');

-- CreateEnum
CREATE TYPE "DataRoomArea" AS ENUM ('GOVERNANCE', 'COMMERCIAL', 'OPERATIONS', 'HSEC', 'DATA_TECH', 'FINANCE');

-- DropIndex
DROP INDEX "KpiValue_kpiId_periodKey_key";

-- AlterTable
ALTER TABLE "Engagement" ADD COLUMN     "contextCompanyName" TEXT,
ADD COLUMN     "contextCoreTeam" TEXT,
ADD COLUMN     "contextGoal12m" TEXT,
ADD COLUMN     "contextGoal36m" TEXT,
ADD COLUMN     "contextIndustry" TEXT,
ADD COLUMN     "contextSponsor" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "strategyMission" TEXT,
ADD COLUMN     "strategyObjectives" TEXT,
ADD COLUMN     "strategyVision" TEXT,
ADD COLUMN     "swotOpportunities" TEXT,
ADD COLUMN     "swotStrengths" TEXT,
ADD COLUMN     "swotThreats" TEXT,
ADD COLUMN     "swotWeaknesses" TEXT;

-- AlterTable
ALTER TABLE "Initiative" ADD COLUMN     "accountPlanRowId" TEXT;

-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "basis" "KpiBasis" NOT NULL DEFAULT 'A';

-- AlterTable
ALTER TABLE "KpiValue" ADD COLUMN     "accountPlanRowId" TEXT,
ADD COLUMN     "scopeKey" TEXT NOT NULL DEFAULT 'GLOBAL',
ALTER COLUMN "periodStart" DROP NOT NULL,
ALTER COLUMN "periodEnd" DROP NOT NULL,
ALTER COLUMN "isGreen" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Risk" ADD COLUMN     "swotTag" "SwotRiskTag";

-- AlterTable
ALTER TABLE "RoadmapWeek" ADD COLUMN     "accountPlanRowId" TEXT;

-- AlterTable
ALTER TABLE "UnitEconomicsRow" ADD COLUMN     "accountPlanRowId" TEXT;

-- CreateTable
CREATE TABLE "Faena" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "adminEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyFaenaReportToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "faenaId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyFaenaReportToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyFaenaReport" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "faenaId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "weekKey" TEXT NOT NULL,
    "status" "WeeklyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "adminName" TEXT,
    "adminEmail" TEXT,
    "dotacionPromedio" INTEGER,
    "turn" "FaenaTurn",
    "m2Planificados" DECIMAL(65,30),
    "m2Ejecutados" DECIMAL(65,30),
    "causasDesvio" "DesvioCause"[],
    "causasDesvioOther" TEXT,
    "turnosPlanificados" INTEGER,
    "turnosEntregados" INTEGER,
    "detencionesHubo" BOOLEAN,
    "detencionesEventos" INTEGER,
    "detencionesHoras" DECIMAL(65,30),
    "detencionCausaPrincipal" "DetentionCause",
    "sinRetrabajos" BOOLEAN,
    "sinNoConformidades" BOOLEAN,
    "retrabajosN" INTEGER,
    "noConformidadesN" INTEGER,
    "accionCorrectivaRegistrada" "AccionCorrectivaEstado",
    "horasHombre" DECIMAL(65,30),
    "incidentesCasi" INTEGER,
    "lesionesRegistrables" INTEGER,
    "accionesHsecCerradas" INTEGER,
    "sinEventosHsec" BOOLEAN,
    "referenciaEventoHsec" TEXT,
    "reporteClienteEstado" "ReportClienteEstado",
    "reporteClienteAtrasoCausa" "ReportClienteAtrasoCausa",
    "dataPackMesEstado" "DataPackEstado",
    "contratoAnexosOk" BOOLEAN,
    "planCierreOk" BOOLEAN,
    "evidenciasOk" BOOLEAN,
    "reportesArchivadosOk" BOOLEAN,
    "bitacoraDetencionesOk" BOOLEAN,
    "registroCalidadOk" BOOLEAN,
    "semaforo" "WeeklySemaforo" NOT NULL,
    "requiereApoyo" BOOLEAN,
    "tiposApoyo" "ApoyoTipo"[],
    "tiposApoyoOther" TEXT,
    "comentario" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tokenId" TEXT,

    CONSTRAINT "WeeklyFaenaReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRoomItem" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "area" "DataRoomArea" NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "owner" TEXT,
    "dueDate" TIMESTAMP(3),
    "hasData" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "DataRoomItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRoomFile" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "itemId" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataRoomFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Faena_engagementId_idx" ON "Faena"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyFaenaReportToken_token_key" ON "WeeklyFaenaReportToken"("token");

-- CreateIndex
CREATE INDEX "WeeklyFaenaReportToken_engagementId_idx" ON "WeeklyFaenaReportToken"("engagementId");

-- CreateIndex
CREATE INDEX "WeeklyFaenaReportToken_faenaId_idx" ON "WeeklyFaenaReportToken"("faenaId");

-- CreateIndex
CREATE INDEX "WeeklyFaenaReportToken_expiresAt_idx" ON "WeeklyFaenaReportToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyFaenaReport_tokenId_key" ON "WeeklyFaenaReport"("tokenId");

-- CreateIndex
CREATE INDEX "WeeklyFaenaReport_engagementId_idx" ON "WeeklyFaenaReport"("engagementId");

-- CreateIndex
CREATE INDEX "WeeklyFaenaReport_faenaId_idx" ON "WeeklyFaenaReport"("faenaId");

-- CreateIndex
CREATE INDEX "WeeklyFaenaReport_weekStart_idx" ON "WeeklyFaenaReport"("weekStart");

-- CreateIndex
CREATE INDEX "WeeklyFaenaReport_semaforo_idx" ON "WeeklyFaenaReport"("semaforo");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyFaenaReport_faenaId_weekKey_key" ON "WeeklyFaenaReport"("faenaId", "weekKey");

-- CreateIndex
CREATE INDEX "DataRoomItem_engagementId_idx" ON "DataRoomItem"("engagementId");

-- CreateIndex
CREATE INDEX "DataRoomItem_area_idx" ON "DataRoomItem"("area");

-- CreateIndex
CREATE UNIQUE INDEX "DataRoomItem_engagementId_code_key" ON "DataRoomItem"("engagementId", "code");

-- CreateIndex
CREATE INDEX "DataRoomFile_engagementId_idx" ON "DataRoomFile"("engagementId");

-- CreateIndex
CREATE INDEX "DataRoomFile_itemId_idx" ON "DataRoomFile"("itemId");

-- CreateIndex
CREATE INDEX "Initiative_accountPlanRowId_idx" ON "Initiative"("accountPlanRowId");

-- CreateIndex
CREATE INDEX "KpiValue_accountPlanRowId_idx" ON "KpiValue"("accountPlanRowId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiValue_kpiId_periodKey_scopeKey_key" ON "KpiValue"("kpiId", "periodKey", "scopeKey");

-- CreateIndex
CREATE INDEX "RoadmapWeek_accountPlanRowId_idx" ON "RoadmapWeek"("accountPlanRowId");

-- CreateIndex
CREATE INDEX "UnitEconomicsRow_accountPlanRowId_idx" ON "UnitEconomicsRow"("accountPlanRowId");

-- AddForeignKey
ALTER TABLE "Faena" ADD CONSTRAINT "Faena_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyFaenaReportToken" ADD CONSTRAINT "WeeklyFaenaReportToken_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyFaenaReportToken" ADD CONSTRAINT "WeeklyFaenaReportToken_faenaId_fkey" FOREIGN KEY ("faenaId") REFERENCES "Faena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyFaenaReport" ADD CONSTRAINT "WeeklyFaenaReport_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "WeeklyFaenaReportToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyFaenaReport" ADD CONSTRAINT "WeeklyFaenaReport_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyFaenaReport" ADD CONSTRAINT "WeeklyFaenaReport_faenaId_fkey" FOREIGN KEY ("faenaId") REFERENCES "Faena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_accountPlanRowId_fkey" FOREIGN KEY ("accountPlanRowId") REFERENCES "AccountPlanRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_accountPlanRowId_fkey" FOREIGN KEY ("accountPlanRowId") REFERENCES "AccountPlanRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapWeek" ADD CONSTRAINT "RoadmapWeek_accountPlanRowId_fkey" FOREIGN KEY ("accountPlanRowId") REFERENCES "AccountPlanRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitEconomicsRow" ADD CONSTRAINT "UnitEconomicsRow_accountPlanRowId_fkey" FOREIGN KEY ("accountPlanRowId") REFERENCES "AccountPlanRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRoomItem" ADD CONSTRAINT "DataRoomItem_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRoomFile" ADD CONSTRAINT "DataRoomFile_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRoomFile" ADD CONSTRAINT "DataRoomFile_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "DataRoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
