-- =============================================================
--  Sports Tournament Management System — PostgreSQL Schema
--  Project #68 | Run with: psql -U <user> -d <dbname> -f schema.sql
-- =============================================================

-- Drop tables in reverse dependency order (safe re-run)
DROP TABLE IF EXISTS Standings           CASCADE;
DROP TABLE IF EXISTS MatchReferees       CASCADE;
DROP TABLE IF EXISTS MatchResults        CASCADE;
DROP TABLE IF EXISTS Matches             CASCADE;
DROP TABLE IF EXISTS TournamentRegistrations CASCADE;
DROP TABLE IF EXISTS Tournaments         CASCADE;
DROP TABLE IF EXISTS Players             CASCADE;
DROP TABLE IF EXISTS Referees            CASCADE;
DROP TABLE IF EXISTS Venues              CASCADE;
DROP TABLE IF EXISTS Teams               CASCADE;
DROP TABLE IF EXISTS Users               CASCADE;
DROP TABLE IF EXISTS Sports              CASCADE;

-- =============================================================
--  1. Sports  (no dependencies)
-- =============================================================
CREATE TABLE Sports (
    id               SERIAL PRIMARY KEY,
    emertimi         TEXT        NOT NULL,
    pershkrimi       TEXT,
    numri_lojtareve  INTEGER     NOT NULL CHECK (numri_lojtareve > 0),
    lloji            TEXT        NOT NULL CHECK (lloji IN ('Ekipor', 'Individual', 'I dyfishtë')),
    created_at       TIMESTAMP   DEFAULT NOW()
);

-- =============================================================
--  2. Users  (no dependencies)
-- =============================================================
CREATE TABLE Users (
    id          SERIAL PRIMARY KEY,
    emri        TEXT        NOT NULL,
    mbiemri     TEXT        NOT NULL,
    email       TEXT        NOT NULL UNIQUE,
    password    TEXT        NOT NULL,
    roli        TEXT        NOT NULL DEFAULT 'user' CHECK (roli IN ('admin', 'organizator', 'gjyqtar', 'user')),
    statusi     TEXT        NOT NULL DEFAULT 'Aktiv' CHECK (statusi IN ('Aktiv', 'Pezulluar', 'Joaktiv')),
    created_at  TIMESTAMP   DEFAULT NOW()
);

-- =============================================================
--  3. Teams  (no dependencies)
-- =============================================================
CREATE TABLE Teams (
    id               SERIAL PRIMARY KEY,
    emertimi         TEXT    NOT NULL,
    logoja           TEXT,
    trajneri         TEXT,
    kontakti         TEXT,
    email            TEXT    UNIQUE,
    qyteti           TEXT,
    data_themelimit  DATE,
    created_at       TIMESTAMP DEFAULT NOW()
);

-- =============================================================
--  4. Venues  (no dependencies)
-- =============================================================
CREATE TABLE Venues (
    id                SERIAL PRIMARY KEY,
    emertimi          TEXT        NOT NULL,
    adresa            TEXT,
    qyteti            TEXT        NOT NULL,
    kapaciteti        INTEGER     CHECK (kapaciteti >= 0),
    lloji_siperfaqes  TEXT        CHECK (lloji_siperfaqes IN (
                          'Bari Natyror', 'Bari Artificial', 'Parket',
                          'Beton', 'PVC', 'Tartan'
                      )),
    ndricimi          BOOLEAN     DEFAULT FALSE,
    statusi           TEXT        NOT NULL DEFAULT 'Aktiv' CHECK (statusi IN ('Aktiv', 'Nën Rinovim', 'Joaktiv')),
    created_at        TIMESTAMP   DEFAULT NOW()
);

-- =============================================================
--  5. Referees  (no dependencies)
-- =============================================================
CREATE TABLE Referees (
    id              SERIAL PRIMARY KEY,
    emri            TEXT    NOT NULL,
    mbiemri         TEXT    NOT NULL,
    email           TEXT    UNIQUE,
    telefoni        TEXT,
    nr_licences     TEXT    UNIQUE,
    kategoria       TEXT    CHECK (kategoria IN ('FIFA', 'UEFA', 'Kombëtar', 'Rajonal')),
    pervoja_vitesh  INTEGER CHECK (pervoja_vitesh >= 0),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================
--  6. Players  (depends on: Teams)
-- =============================================================
CREATE TABLE Players (
    id            SERIAL PRIMARY KEY,
    emri          TEXT        NOT NULL,
    mbiemri       TEXT        NOT NULL,
    data_lindjes  DATE,
    ekipi_id      INTEGER     REFERENCES Teams(id) ON DELETE SET NULL,
    pozicioni     TEXT,
    numri         INTEGER     CHECK (numri BETWEEN 1 AND 99),
    gjatesia      NUMERIC(5,2),   -- cm
    pesha         NUMERIC(5,2),   -- kg
    kombesia      TEXT,
    created_at    TIMESTAMP   DEFAULT NOW()
);

-- =============================================================
--  7. Tournaments  (depends on: Sports, Users)
-- =============================================================
CREATE TABLE Tournaments (
    id                  SERIAL PRIMARY KEY,
    emertimi            TEXT        NOT NULL,
    sporti_id           INTEGER     NOT NULL REFERENCES Sports(id) ON DELETE RESTRICT,
    lloji               TEXT        NOT NULL CHECK (lloji IN (
                            'Grup + Eliminim', 'Vetëm Grup', 'Vetëm Eliminim', 'Liga'
                        )),
    data_fillimit       DATE        NOT NULL,
    data_perfundimit    DATE        NOT NULL,
    lokacioni           TEXT,
    organizatori_id     INTEGER     REFERENCES Users(id) ON DELETE SET NULL,
    cmimi_regjistrimit  NUMERIC(10,2) DEFAULT 0.00,
    statusi             TEXT        NOT NULL DEFAULT 'Regjistrimi' CHECK (statusi IN (
                            'Regjistrimi', 'Aktiv', 'Përfunduar', 'Anuluar'
                        )),
    pershkrimi          TEXT,
    created_at          TIMESTAMP   DEFAULT NOW(),

    CHECK (data_perfundimit > data_fillimit)
);

-- =============================================================
--  8. TournamentRegistrations  (depends on: Tournaments, Teams)
-- =============================================================
CREATE TABLE TournamentRegistrations (
    id                SERIAL PRIMARY KEY,
    turneu_id         INTEGER     NOT NULL REFERENCES Tournaments(id) ON DELETE CASCADE,
    ekipi_id          INTEGER     NOT NULL REFERENCES Teams(id)       ON DELETE CASCADE,
    data_regjistrimit TIMESTAMP   DEFAULT NOW(),
    statusi           TEXT        NOT NULL DEFAULT 'Në Pritje' CHECK (statusi IN (
                          'Në Pritje', 'Aprovuar', 'Refuzuar', 'Anuluar'
                      )),
    tarifa_paguar     NUMERIC(10,2) DEFAULT 0.00,
    created_at        TIMESTAMP   DEFAULT NOW(),

    UNIQUE (turneu_id, ekipi_id)   -- one registration per team per tournament
);

-- =============================================================
--  9. Matches  (depends on: Tournaments, Teams, Venues)
-- =============================================================
CREATE TABLE Matches (
    id                  SERIAL PRIMARY KEY,
    turneu_id           INTEGER     NOT NULL REFERENCES Tournaments(id) ON DELETE CASCADE,
    ekipi_shtepiak_id   INTEGER     NOT NULL REFERENCES Teams(id)       ON DELETE RESTRICT,
    ekipi_mysafir_id    INTEGER     NOT NULL REFERENCES Teams(id)       ON DELETE RESTRICT,
    data_ndeshjes       DATE        NOT NULL,
    ora_fillimit        TIME,
    fusha_id            INTEGER     REFERENCES Venues(id)               ON DELETE SET NULL,
    statusi             TEXT        NOT NULL DEFAULT 'Planifikuar' CHECK (statusi IN (
                            'Planifikuar', 'Live', 'Përfunduar', 'Shtyrë', 'Anuluar'
                        )),
    faza                TEXT,
    created_at          TIMESTAMP   DEFAULT NOW(),

    CHECK (ekipi_shtepiak_id <> ekipi_mysafir_id)
);

-- =============================================================
--  10. MatchResults  (depends on: Matches, Teams, Players)
--      ONE-TO-ONE with Matches via UNIQUE on ndeshja_id
-- =============================================================
CREATE TABLE MatchResults (
    id               SERIAL PRIMARY KEY,
    ndeshja_id       INTEGER     NOT NULL UNIQUE REFERENCES Matches(id) ON DELETE CASCADE,
    golat_shtepiak   INTEGER     NOT NULL DEFAULT 0 CHECK (golat_shtepiak >= 0),
    golat_mysafir    INTEGER     NOT NULL DEFAULT 0 CHECK (golat_mysafir >= 0),
    fitues_id        INTEGER     REFERENCES Teams(id)   ON DELETE SET NULL,  -- NULL = barazim
    shenime          TEXT,
    mvp_id           INTEGER     REFERENCES Players(id) ON DELETE SET NULL,
    created_at       TIMESTAMP   DEFAULT NOW()
);

-- =============================================================
--  11. MatchReferees  (depends on: Matches, Referees)
-- =============================================================
CREATE TABLE MatchReferees (
    id           SERIAL PRIMARY KEY,
    ndeshja_id   INTEGER     NOT NULL REFERENCES Matches(id)   ON DELETE CASCADE,
    gjyqtari_id  INTEGER     NOT NULL REFERENCES Referees(id)  ON DELETE CASCADE,
    roli         TEXT        NOT NULL CHECK (roli IN (
                     'Kryegjyqtar', 'Asistent 1', 'Asistent 2',
                     'Gjyqtar i 4-të', 'VAR'
                 )),
    created_at   TIMESTAMP   DEFAULT NOW(),

    UNIQUE (ndeshja_id, gjyqtari_id)  -- same referee can't be assigned twice to same match
);

-- =============================================================
--  12. Standings  (depends on: Tournaments, Teams)
-- =============================================================
CREATE TABLE Standings (
    id                SERIAL PRIMARY KEY,
    turneu_id         INTEGER     NOT NULL REFERENCES Tournaments(id) ON DELETE CASCADE,
    ekipi_id          INTEGER     NOT NULL REFERENCES Teams(id)       ON DELETE CASCADE,
    ndeshjet_luajtura INTEGER     NOT NULL DEFAULT 0 CHECK (ndeshjet_luajtura >= 0),
    fitoret           INTEGER     NOT NULL DEFAULT 0 CHECK (fitoret >= 0),
    barazimet         INTEGER     NOT NULL DEFAULT 0 CHECK (barazimet >= 0),
    humbjet           INTEGER     NOT NULL DEFAULT 0 CHECK (humbjet >= 0),
    golat_shenuar     INTEGER     NOT NULL DEFAULT 0 CHECK (golat_shenuar >= 0),
    golat_pranuar     INTEGER     NOT NULL DEFAULT 0 CHECK (golat_pranuar >= 0),
    piket             INTEGER     NOT NULL DEFAULT 0 CHECK (piket >= 0),
    created_at        TIMESTAMP   DEFAULT NOW(),

    UNIQUE (turneu_id, ekipi_id)  -- one row per team per tournament
);
