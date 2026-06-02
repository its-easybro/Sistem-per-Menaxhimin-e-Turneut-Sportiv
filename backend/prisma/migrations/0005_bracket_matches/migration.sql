-- Stores generated knockout bracket nodes separately from the real scheduled matches.
CREATE TABLE "bracketmatches" (
  "id" SERIAL NOT NULL,
  "turneu_id" INTEGER NOT NULL,
  "round_number" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "ekipi_shtepiak_id" INTEGER,
  "ekipi_mysafir_id" INTEGER,
  "fitues_id" INTEGER,
  "ndeshja_id" INTEGER,
  "next_bracket_match_id" INTEGER,
  "next_slot" TEXT,
  "data_ndeshjes" DATE,
  "ora_fillimit" TIME(6),
  "fusha_id" INTEGER,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bracketmatches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bracketmatches_next_slot_check" CHECK (
    "next_slot" IS NULL OR "next_slot" IN ('home', 'away')
  )
);

-- Keeps one bracket node per tournament round/position so generation cannot duplicate a slot.
CREATE UNIQUE INDEX "bracketmatches_turneu_id_round_number_position_key"
ON "bracketmatches"("turneu_id", "round_number", "position");

-- Links a bracket node to at most one real match used by live scoring and results.
CREATE UNIQUE INDEX "bracketmatches_ndeshja_id_key"
ON "bracketmatches"("ndeshja_id");

CREATE INDEX "bracketmatches_turneu_id_idx"
ON "bracketmatches"("turneu_id");

CREATE INDEX "bracketmatches_ekipi_shtepiak_id_idx"
ON "bracketmatches"("ekipi_shtepiak_id");

CREATE INDEX "bracketmatches_ekipi_mysafir_id_idx"
ON "bracketmatches"("ekipi_mysafir_id");

CREATE INDEX "bracketmatches_fitues_id_idx"
ON "bracketmatches"("fitues_id");

CREATE INDEX "bracketmatches_next_bracket_match_id_idx"
ON "bracketmatches"("next_bracket_match_id");

ALTER TABLE "bracketmatches"
ADD CONSTRAINT "bracketmatches_turneu_id_fkey"
FOREIGN KEY ("turneu_id") REFERENCES "tournaments"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "bracketmatches"
ADD CONSTRAINT "bracketmatches_ekipi_shtepiak_id_fkey"
FOREIGN KEY ("ekipi_shtepiak_id") REFERENCES "teams"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "bracketmatches"
ADD CONSTRAINT "bracketmatches_ekipi_mysafir_id_fkey"
FOREIGN KEY ("ekipi_mysafir_id") REFERENCES "teams"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "bracketmatches"
ADD CONSTRAINT "bracketmatches_fitues_id_fkey"
FOREIGN KEY ("fitues_id") REFERENCES "teams"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "bracketmatches"
ADD CONSTRAINT "bracketmatches_ndeshja_id_fkey"
FOREIGN KEY ("ndeshja_id") REFERENCES "matches"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "bracketmatches"
ADD CONSTRAINT "bracketmatches_next_bracket_match_id_fkey"
FOREIGN KEY ("next_bracket_match_id") REFERENCES "bracketmatches"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "bracketmatches"
ADD CONSTRAINT "bracketmatches_fusha_id_fkey"
FOREIGN KEY ("fusha_id") REFERENCES "venues"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
