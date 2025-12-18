-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "BscPerspective" AS ENUM ('FINANCIAL', 'CUSTOMER', 'INTERNAL_PROCESS', 'LEARNING_GROWTH');

-- CreateEnum
CREATE TYPE "KpiFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ADHOC');

-- CreateEnum
CREATE TYPE "KpiDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');

-- CreateEnum
CREATE TYPE "KpiDataSource" AS ENUM ('MANUAL', 'API');

-- CreateEnum
CREATE TYPE "QuestionSetKind" AS ENUM ('SURVEY', 'INTERVIEW', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'SINGLE_SELECT', 'MULTI_SELECT', 'SCALE_1_5');

-- CreateEnum
CREATE TYPE "ReportLocale" AS ENUM ('ES', 'EN');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('KPI_REPORT_ALL', 'KPI_REPORT_RED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WEBPAY', 'TRANSFER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "preferredLocale" TEXT NOT NULL DEFAULT 'es',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "industry" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EngagementStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "localeDefault" TEXT NOT NULL DEFAULT 'es',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementRecipient" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "type" "RecipientType" NOT NULL,
    "label" TEXT,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WizardProgress" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "WizardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSet" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "kind" "QuestionSetKind" NOT NULL,
    "order" INTEGER NOT NULL,
    "titleEs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionEs" TEXT,
    "descriptionEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionSetId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "promptEs" TEXT NOT NULL,
    "promptEn" TEXT NOT NULL,
    "helpEs" TEXT,
    "helpEn" TEXT,
    "type" "QuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "optionsJson" JSONB,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "respondentUserId" TEXT,
    "valueJson" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answerId" TEXT,
    "decisionId" TEXT,
    "kpiValueId" TEXT,
    "initiativeId" TEXT,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiCanonical" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "defaultPerspective" "BscPerspective" NOT NULL,
    "defaultFrequency" "KpiFrequency" NOT NULL,
    "defaultDirection" "KpiDirection" NOT NULL,
    "unit" TEXT,
    "formula" TEXT,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionEs" TEXT,
    "descriptionEn" TEXT,
    "tagsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiCanonical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "canonicalId" TEXT,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionEs" TEXT,
    "descriptionEn" TEXT,
    "perspective" "BscPerspective" NOT NULL,
    "frequency" "KpiFrequency" NOT NULL,
    "direction" "KpiDirection" NOT NULL,
    "dataSource" "KpiDataSource" NOT NULL DEFAULT 'MANUAL',
    "unit" TEXT,
    "formula" TEXT,
    "targetValue" DECIMAL(65,30),
    "targetText" TEXT,
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiValue" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(65,30),
    "note" TEXT,
    "isGreen" BOOLEAN NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "perspective" "BscPerspective" NOT NULL,
    "problem" TEXT,
    "impact" INTEGER,
    "effort" INTEGER,
    "risk" INTEGER,
    "costEst" TEXT,
    "kpiId" TEXT,
    "owner" TEXT,
    "sponsor" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT,
    "definitionDone" TEXT,
    "dependencies" TEXT,
    "notes" TEXT,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaciRow" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "initiativeName" TEXT NOT NULL,
    "responsible" TEXT,
    "approver" TEXT,
    "consulted" TEXT,
    "informed" TEXT,

    CONSTRAINT "RaciRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "externalId" TEXT,
    "risk" TEXT NOT NULL,
    "probability" INTEGER,
    "impact" INTEGER,
    "mitigation" TEXT,
    "owner" TEXT,
    "status" TEXT,
    "reviewDate" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "decision" TEXT NOT NULL,
    "options" TEXT,
    "recommendation" TEXT,
    "responsible" TEXT,
    "status" TEXT,
    "notes" TEXT,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapWeek" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "objective" TEXT,
    "keyActivities" TEXT,
    "deliverables" TEXT,
    "kpiFocus" TEXT,
    "ritual" TEXT,

    CONSTRAINT "RoadmapWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "owner" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT,
    "blocker" TEXT,
    "comments" TEXT,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitEconomicsRow" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "clientSite" TEXT,
    "modality" TEXT,
    "m2Month" DECIMAL(65,30),
    "priceUsdM2" DECIMAL(65,30),
    "revenueUsdMonth" DECIMAL(65,30),
    "directCosts" TEXT,
    "margin" TEXT,
    "marginPct" TEXT,
    "risks" TEXT,
    "evidence" TEXT,

    CONSTRAINT "UnitEconomicsRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountPlanRow" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "account" TEXT,
    "goal12m" TEXT,
    "decisionMakers" TEXT,
    "competitors" TEXT,
    "mainPain" TEXT,
    "valueProp" TEXT,
    "agenda8w" TEXT,
    "nextStep" TEXT,
    "status" TEXT,

    CONSTRAINT "AccountPlanRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportVersion" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "locale" "ReportLocale" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "snapshotJson" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "pdfSha" TEXT,
    "notes" TEXT,

    CONSTRAINT "ReportVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'TRANSFER',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationKey" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issuedTo" TEXT,
    "expiresAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Membership_orgId_idx" ON "Membership"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_orgId_key" ON "Membership"("userId", "orgId");

-- CreateIndex
CREATE INDEX "Company_orgId_idx" ON "Company"("orgId");

-- CreateIndex
CREATE INDEX "Engagement_orgId_idx" ON "Engagement"("orgId");

-- CreateIndex
CREATE INDEX "Engagement_companyId_idx" ON "Engagement"("companyId");

-- CreateIndex
CREATE INDEX "EngagementRecipient_engagementId_idx" ON "EngagementRecipient"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementRecipient_engagementId_type_value_key" ON "EngagementRecipient"("engagementId", "type", "value");

-- CreateIndex
CREATE INDEX "WizardProgress_engagementId_idx" ON "WizardProgress"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "WizardProgress_engagementId_stepKey_key" ON "WizardProgress"("engagementId", "stepKey");

-- CreateIndex
CREATE INDEX "QuestionSet_engagementId_idx" ON "QuestionSet"("engagementId");

-- CreateIndex
CREATE INDEX "Question_questionSetId_idx" ON "Question"("questionSetId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_questionSetId_key_key" ON "Question"("questionSetId", "key");

-- CreateIndex
CREATE INDEX "Answer_engagementId_idx" ON "Answer"("engagementId");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE INDEX "Evidence_answerId_idx" ON "Evidence"("answerId");

-- CreateIndex
CREATE INDEX "Evidence_decisionId_idx" ON "Evidence"("decisionId");

-- CreateIndex
CREATE INDEX "Evidence_kpiValueId_idx" ON "Evidence"("kpiValueId");

-- CreateIndex
CREATE INDEX "Evidence_initiativeId_idx" ON "Evidence"("initiativeId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiCanonical_key_key" ON "KpiCanonical"("key");

-- CreateIndex
CREATE INDEX "Kpi_engagementId_idx" ON "Kpi"("engagementId");

-- CreateIndex
CREATE INDEX "Kpi_canonicalId_idx" ON "Kpi"("canonicalId");

-- CreateIndex
CREATE INDEX "KpiValue_kpiId_idx" ON "KpiValue"("kpiId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiValue_kpiId_periodKey_key" ON "KpiValue"("kpiId", "periodKey");

-- CreateIndex
CREATE INDEX "Initiative_engagementId_idx" ON "Initiative"("engagementId");

-- CreateIndex
CREATE INDEX "Initiative_kpiId_idx" ON "Initiative"("kpiId");

-- CreateIndex
CREATE INDEX "RaciRow_engagementId_idx" ON "RaciRow"("engagementId");

-- CreateIndex
CREATE INDEX "Risk_engagementId_idx" ON "Risk"("engagementId");

-- CreateIndex
CREATE INDEX "Decision_engagementId_idx" ON "Decision"("engagementId");

-- CreateIndex
CREATE INDEX "RoadmapWeek_engagementId_idx" ON "RoadmapWeek"("engagementId");

-- CreateIndex
CREATE INDEX "ActionItem_engagementId_idx" ON "ActionItem"("engagementId");

-- CreateIndex
CREATE INDEX "UnitEconomicsRow_engagementId_idx" ON "UnitEconomicsRow"("engagementId");

-- CreateIndex
CREATE INDEX "AccountPlanRow_engagementId_idx" ON "AccountPlanRow"("engagementId");

-- CreateIndex
CREATE INDEX "ReportVersion_engagementId_idx" ON "ReportVersion"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportVersion_engagementId_version_locale_key" ON "ReportVersion"("engagementId", "version", "locale");

-- CreateIndex
CREATE INDEX "NotificationEvent_engagementId_scheduledFor_idx" ON "NotificationEvent"("engagementId", "scheduledFor");

-- CreateIndex
CREATE INDEX "NotificationEvent_status_scheduledFor_idx" ON "NotificationEvent"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "ApiKey_orgId_idx" ON "ApiKey"("orgId");

-- CreateIndex
CREATE INDEX "Subscription_orgId_idx" ON "Subscription"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationKey_code_key" ON "ActivationKey"("code");

-- CreateIndex
CREATE INDEX "ActivationKey_engagementId_idx" ON "ActivationKey"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementRecipient" ADD CONSTRAINT "EngagementRecipient_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WizardProgress" ADD CONSTRAINT "WizardProgress_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSet" ADD CONSTRAINT "QuestionSet_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_respondentUserId_fkey" FOREIGN KEY ("respondentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_kpiValueId_fkey" FOREIGN KEY ("kpiValueId") REFERENCES "KpiValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_canonicalId_fkey" FOREIGN KEY ("canonicalId") REFERENCES "KpiCanonical"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaciRow" ADD CONSTRAINT "RaciRow_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapWeek" ADD CONSTRAINT "RoadmapWeek_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitEconomicsRow" ADD CONSTRAINT "UnitEconomicsRow_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountPlanRow" ADD CONSTRAINT "AccountPlanRow_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportVersion" ADD CONSTRAINT "ReportVersion_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationKey" ADD CONSTRAINT "ActivationKey_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
