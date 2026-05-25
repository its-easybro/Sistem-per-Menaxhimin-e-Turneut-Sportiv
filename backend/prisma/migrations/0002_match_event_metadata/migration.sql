DO $$
BEGIN
  IF to_regclass('public.matchevents') IS NULL THEN
    CREATE TABLE "matchevents" (
      "id" SERIAL NOT NULL,
      "ndeshja_id" INTEGER NOT NULL,
      "lojtari_id" INTEGER,
      "ekipi_id" INTEGER,
      "lloji" TEXT NOT NULL,
      "minuta" INTEGER,
      "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
      "player_name" TEXT,
      "description" TEXT,
      "created_by_user_id" INTEGER,
      CONSTRAINT "matchevents_pkey" PRIMARY KEY ("id")
    );
  ELSE
    ALTER TABLE "matchevents"
      ADD COLUMN IF NOT EXISTS "player_name" TEXT,
      ADD COLUMN IF NOT EXISTS "description" TEXT,
      ADD COLUMN IF NOT EXISTS "created_by_user_id" INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matchevents_ndeshja_id_fkey'
  ) THEN
    ALTER TABLE "matchevents"
      ADD CONSTRAINT "matchevents_ndeshja_id_fkey"
      FOREIGN KEY ("ndeshja_id")
      REFERENCES "matches"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matchevents_ekipi_id_fkey'
  ) THEN
    ALTER TABLE "matchevents"
      ADD CONSTRAINT "matchevents_ekipi_id_fkey"
      FOREIGN KEY ("ekipi_id")
      REFERENCES "teams"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matchevents_lojtari_id_fkey'
  ) THEN
    ALTER TABLE "matchevents"
      ADD CONSTRAINT "matchevents_lojtari_id_fkey"
      FOREIGN KEY ("lojtari_id")
      REFERENCES "players"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matchevents_created_by_user_id_fkey'
  ) THEN
    ALTER TABLE "matchevents"
      ADD CONSTRAINT "matchevents_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;
END $$;
