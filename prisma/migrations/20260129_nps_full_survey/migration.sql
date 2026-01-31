-- 1) Enum QuestionType: agregar SCALE_0_10
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

-- 2) NpsInvite: columnas nuevas
ALTER TABLE "NpsInvite" ADD COLUMN IF NOT EXISTS "questionSetId" TEXT;
ALTER TABLE "NpsInvite" ADD COLUMN IF NOT EXISTS "faenaId" TEXT;
ALTER TABLE "NpsInvite" ADD COLUMN IF NOT EXISTS "unitId" TEXT;

CREATE INDEX IF NOT EXISTS "NpsInvite_questionSetId_idx" ON "NpsInvite"("questionSetId");
CREATE INDEX IF NOT EXISTS "NpsInvite_faenaId_idx" ON "NpsInvite"("faenaId");
CREATE INDEX IF NOT EXISTS "NpsInvite_unitId_idx" ON "NpsInvite"("unitId");
CREATE INDEX IF NOT EXISTS "NpsInvite_engagementId_idx" ON "NpsInvite"("engagementId");

ALTER TABLE "NpsInvite"
  ADD CONSTRAINT "NpsInvite_questionSetId_fkey"
  FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NpsInvite"
  ADD CONSTRAINT "NpsInvite_faenaId_fkey"
  FOREIGN KEY ("faenaId") REFERENCES "Faena"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NpsInvite"
  ADD CONSTRAINT "NpsInvite_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "AccountPlanRow"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NpsInvite"
  ADD CONSTRAINT "NpsInvite_engagementId_fkey"
  FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Answer: columna npsInviteId para amarrar respuestas al token
ALTER TABLE "Answer" ADD COLUMN IF NOT EXISTS "npsInviteId" TEXT;

CREATE INDEX IF NOT EXISTS "Answer_npsInviteId_idx" ON "Answer"("npsInviteId");

-- Evitar doble respuesta por misma pregunta dentro del mismo invite.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Answer_npsInviteId_questionId_key'
  ) THEN
    CREATE UNIQUE INDEX "Answer_npsInviteId_questionId_key" ON "Answer"("npsInviteId","questionId");
  END IF;
END $$;

ALTER TABLE "Answer"
  ADD CONSTRAINT "Answer_npsInviteId_fkey"
  FOREIGN KEY ("npsInviteId") REFERENCES "NpsInvite"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
