-- AlterEnum
ALTER TYPE "KpiFrequency" ADD VALUE 'SEMIANNUAL';

-- CreateTable
CREATE TABLE "NpsRole" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpsRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpsContact" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "roleId" TEXT,
    "unitId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpsContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NpsRole_engagementId_idx" ON "NpsRole"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "NpsRole_engagementId_code_key" ON "NpsRole"("engagementId", "code");

-- CreateIndex
CREATE INDEX "NpsContact_engagementId_idx" ON "NpsContact"("engagementId");

-- CreateIndex
CREATE INDEX "NpsContact_unitId_idx" ON "NpsContact"("unitId");

-- CreateIndex
CREATE INDEX "NpsContact_roleId_idx" ON "NpsContact"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "NpsContact_engagementId_email_key" ON "NpsContact"("engagementId", "email");

-- AddForeignKey
ALTER TABLE "NpsRole" ADD CONSTRAINT "NpsRole_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpsContact" ADD CONSTRAINT "NpsContact_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpsContact" ADD CONSTRAINT "NpsContact_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "NpsRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpsContact" ADD CONSTRAINT "NpsContact_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "AccountPlanRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
