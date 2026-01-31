-- NPS Survey v2 (encuesta completa + invites por token)
-- Nota: este SQL asume PostgreSQL.

-- 1) Agregar nuevo valor al enum QuestionType
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'QuestionType' AND e.enumlabel = 'SCALE_0_10'
  ) THEN
    ALTER TYPE "QuestionType" ADD VALUE 'SCALE_0_10';
  END IF;
END $$;

-- 2) Tabla NpsInvite
CREATE TABLE IF NOT EXISTS "NpsInvite" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "engagementId" TEXT NOT NULL,
  "questionSetId" TEXT NOT NULL,
  "semester" TEXT NOT NULL,
  "faenaId" TEXT,
  "accountPlanRowId" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "sentAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NpsInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NpsInvite_token_key" ON "NpsInvite"("token");
CREATE INDEX IF NOT EXISTS "NpsInvite_engagementId_idx" ON "NpsInvite"("engagementId");
CREATE INDEX IF NOT EXISTS "NpsInvite_semester_idx" ON "NpsInvite"("semester");
CREATE INDEX IF NOT EXISTS "NpsInvite_faenaId_idx" ON "NpsInvite"("faenaId");
CREATE INDEX IF NOT EXISTS "NpsInvite_accountPlanRowId_idx" ON "NpsInvite"("accountPlanRowId");

ALTER TABLE "NpsInvite"
  ADD CONSTRAINT "NpsInvite_engagementId_fkey"
  FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NpsInvite"
  ADD CONSTRAINT "NpsInvite_questionSetId_fkey"
  FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NpsInvite"
  ADD CONSTRAINT "NpsInvite_faenaId_fkey"
  FOREIGN KEY ("faenaId") REFERENCES "Faena"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NpsInvite"
  ADD CONSTRAINT "NpsInvite_accountPlanRowId_fkey"
  FOREIGN KEY ("accountPlanRowId") REFERENCES "AccountPlanRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) En Answer: columna npsInviteId + FK + índices
ALTER TABLE "Answer" ADD COLUMN IF NOT EXISTS "npsInviteId" TEXT;

CREATE INDEX IF NOT EXISTS "Answer_npsInviteId_idx" ON "Answer"("npsInviteId");

-- Único por (invite, pregunta) para evitar dobles respuestas en el mismo envío.
-- En PostgreSQL, múltiples NULL no chocan, así que no afecta respuestas no-NPS.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Answer_npsInviteId_questionId_key'
  ) THEN
    CREATE UNIQUE INDEX "Answer_npsInviteId_questionId_key" ON "Answer"("npsInviteId","questionId");
  END IF;
END $$;

ALTER TABLE "Answer"
  ADD CONSTRAINT "Answer_npsInviteId_fkey"
  FOREIGN KEY ("npsInviteId") REFERENCES "NpsInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
