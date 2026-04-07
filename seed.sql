-- =============================================================
--  Sports Tournament Management System — Seed Data
--  Project #68 | Run AFTER schema.sql:
--  psql -U <user> -d <dbname> -f seed.sql
-- =============================================================

-- =============================================================
--  1. Sports
-- =============================================================
INSERT INTO Sports (emertimi, pershkrimi, numri_lojtareve, lloji) VALUES
('Futboll',    'Sporti më popular në botë, luhet me 11 lojtarë për ekip.', 11, 'Ekipor'),
('Basketboll', 'Lojë ekipore me shportë, 5 lojtarë për ekip.',             5,  'Ekipor'),
('Volejboll',  'Sport ekipor me rrjetë, 6 lojtarë për ekip.',              6,  'Ekipor'),
('Futsal',     'Futboll në sallë me 5 lojtarë për ekip.',                  5,  'Ekipor'),
('Hendboll',   'Sport ekipor me dorë, 7 lojtarë për ekip.',                7,  'Ekipor');

-- =============================================================
--  2. Users  (roles: 'admin' or 'user')
-- =============================================================
INSERT INTO Users (emri, mbiemri, email, password, roli, statusi) VALUES
('Arben',   'Krasniqi',  'arben.krasniqi@sport.ks',  '$2b$10$hashedpassword1', 'admin', 'Aktiv'),
('Drita',   'Morina',    'drita.morina@sport.ks',     '$2b$10$hashedpassword2', 'admin', 'Aktiv'),
('Burim',   'Hajdari',   'burim.hajdari@sport.ks',    '$2b$10$hashedpassword3', 'user',  'Aktiv'),
('Liridon', 'Berisha',   'liridon.berisha@sport.ks',  '$2b$10$hashedpassword4', 'user',  'Aktiv'),
('Valon',   'Gashi',     'valon.gashi@sport.ks',      '$2b$10$hashedpassword5', 'user',  'Aktiv'),
('Mimoza',  'Zeka',      'mimoza.zeka@sport.ks',      '$2b$10$hashedpassword6', 'user',  'Joaktiv');

-- =============================================================
--  3. Teams
-- =============================================================
INSERT INTO Teams (emertimi, logoja, trajneri, kontakti, email, qyteti, data_themelimit) VALUES
('FC Prishtina',    '/logos/prishtina.png',  'Arben Mustafa',   '+383 44 111 000', 'fc.prishtina@sport.ks',  'Prishtinë', '1946-09-15'),
('FC Trepça 89',    '/logos/trepca.png',     'Sami Krasniqi',   '+383 44 222 000', 'fc.trepca89@sport.ks',   'Mitrovicë', '1989-04-20'),
('FC Gjilani',      '/logos/gjilani.png',    'Driton Rama',     '+383 44 333 000', 'fc.gjilani@sport.ks',    'Gjilan',    '1926-03-10'),
('FC Drita',        '/logos/drita.png',      'Ilir Dajaku',     '+383 44 444 000', 'fc.drita@sport.ks',      'Gjilan',    '1947-11-05'),
('FC Dukagjini',    '/logos/dukagjini.png',  'Shpend Ahmeti',   '+383 44 555 000', 'fc.dukagjini@sport.ks',  'Pejë',      '1958-06-01'),
('KB Peja',         '/logos/kbpeja.png',     'Driton Hajdari',  '+383 44 666 000', 'kb.peja@sport.ks',       'Pejë',      '1947-02-14'),
('KB Prishtina',    '/logos/kbpri.png',      'Agron Berisha',   '+383 44 777 000', 'kb.prishtina@sport.ks',  'Prishtinë', '1946-10-10'),
('VK Ferizaj',      '/logos/vkferizaj.png',  'Liridon Berisha', '+383 44 888 000', 'vk.ferizaj@sport.ks',    'Ferizaj',   '2005-08-22');

-- =============================================================
--  4. Venues
-- =============================================================
INSERT INTO Venues (emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi) VALUES
('Stadiumi Fadil Vokrri',    'Rruga Agim Ramadani',    'Prishtinë', 13500, 'Bari Natyror',     TRUE,  'Aktiv'),
('Stadiumi Gjilan',           'Rruga Dëshmorëve',       'Gjilan',     8000, 'Bari Artificial',  TRUE,  'Aktiv'),
('Pallati i Sportit Pejë',    'Rruga UÇK-së',           'Pejë',       4000, 'Parket',            TRUE,  'Aktiv'),
('Salla Multifunksionale',    'Rruga Skënderbeu 12',    'Ferizaj',    2500, 'PVC',               TRUE,  'Aktiv'),
('Stadiumi i Mitrovicës',     'Rruga Mbretëresha Teuta','Mitrovicë',  6000, 'Bari Natyror',     FALSE, 'Nën Rinovim'),
('Fusha Sportive Prizren',    'Rruga Remzi Ademi',      'Prizren',    3000, 'Bari Artificial',  TRUE,  'Aktiv');

-- =============================================================
--  5. Referees
-- =============================================================
INSERT INTO Referees (emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh) VALUES
('Agron',  'Berisha',  'agron.ref@sport.ks',  '+383 44 101 101', 'KOS-2021-001', 'FIFA',      12),
('Burim',  'Krasniqi', 'burim.ref@sport.ks',  '+383 44 202 202', 'KOS-2019-002', 'UEFA',       8),
('Drita',  'Morina',   'drita.ref@sport.ks',  '+383 44 303 303', 'KOS-2022-003', 'Kombëtar',   5),
('Fitim',  'Hoxha',    'fitim.ref@sport.ks',  '+383 44 404 404', 'KOS-2018-004', 'FIFA',      15),
('Genta',  'Rama',     'genta.ref@sport.ks',  '+383 44 505 505', 'KOS-2023-005', 'Rajonal',    3);

-- =============================================================
--  6. Players  (needs Teams)
-- =============================================================
INSERT INTO Players (emri, mbiemri, data_lindjes, ekipi_id, pozicioni, numri, gjatesia, pesha, kombesia) VALUES
-- FC Prishtina (id=1)
('Milot',   'Rashica',   '1996-06-28', 1, 'Sulmues',    11, 180.00, 75.00, 'Kosovë'),
('Besar',   'Halimi',    '1994-03-12', 1, 'Mesfushor',   8, 175.00, 72.00, 'Kosovë'),
('Agon',    'Mehmeti',   '1990-07-05', 1, 'Portier',     1, 190.00, 85.00, 'Kosovë'),
-- FC Trepça 89 (id=2)
('Amir',    'Rrahmani',  '1994-02-24', 2, 'Mbrojtës',    5, 188.00, 83.00, 'Kosovë'),
('Vedat',   'Muriqi',    '1994-04-05', 2, 'Sulmues',     9, 194.00, 89.00, 'Kosovë'),
-- FC Gjilani (id=3)
('Valon',   'Behrami',   '1985-04-19', 3, 'Mesfushor',   8, 183.00, 79.00, 'Kosovë'),
('Florent', 'Hadërgjonaj','1994-07-31',3, 'Mbrojtës',    2, 179.00, 74.00, 'Kosovë'),
-- KB Peja (id=6)
('Driton',  'Camaj',     '1998-09-12', 6, 'Guard',        3, 185.00, 82.00, 'Shqipëri'),
('Arber',   'Lila',      '1995-01-20', 6, 'Forward',      7, 200.00, 95.00, 'Kosovë'),
-- VK Ferizaj (id=8)
('Liridon', 'Haliti',    '2000-03-15', 8, 'Setter',       6, 188.00, 78.00, 'Kosovë');

-- =============================================================
--  7. Tournaments  (needs Sports + Users)
-- =============================================================
INSERT INTO Tournaments (emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, organizatori_id, cmimi_regjistrimit, statusi, pershkrimi) VALUES
(
  'Kampionati Kombëtar i Futbollit',
  1, 'Liga', '2025-03-15', '2025-06-20',
  'Prishtinë', 2, 5000.00, 'Aktiv',
  'Kampionati më i madh i futbollit në vend, ku ekipet elite garojnë për titullin kombëtar.'
),
(
  'Kupa e Basketbollit',
  2, 'Grup + Eliminim', '2025-04-01', '2025-05-15',
  'Gjilan', 4, 2500.00, 'Regjistrimi',
  'Kupa vjetore e basketbollit, e hapur për të gjitha klubet e licencuara.'
),
(
  'Turneu i Volejbollit Ferizaj',
  3, 'Vetëm Eliminim', '2025-02-01', '2025-02-28',
  'Ferizaj', 2, 1500.00, 'Përfunduar',
  'Turne dimëror i volejbollit me 8 ekipe nga e gjithë Kosova.'
),
(
  'Liga e Futsallit',
  4, 'Liga', '2025-03-10', '2025-06-10',
  'Pejë', 4, 3000.00, 'Aktiv',
  'Liga profesionale e futsallit me ndeshje çdo fundjavë.'
),
(
  'Kampionati i Hendbollit Prizren',
  5, 'Grup + Eliminim', '2025-04-05', '2025-05-30',
  'Prizren', 2, 1000.00, 'Regjistrimi',
  'Turne hendbolli për klube nga rajoni i Prizrenit dhe gjetkë.'
);

-- =============================================================
--  8. TournamentRegistrations  (needs Tournaments + Teams)
-- =============================================================
INSERT INTO TournamentRegistrations (turneu_id, ekipi_id, data_regjistrimit, statusi, tarifa_paguar) VALUES
-- Kampionati Kombëtar i Futbollit (id=1)
(1, 1, '2025-02-10 10:00:00', 'Aprovuar', 5000.00),
(1, 2, '2025-02-11 11:00:00', 'Aprovuar', 5000.00),
(1, 3, '2025-02-12 09:30:00', 'Aprovuar', 5000.00),
(1, 4, '2025-02-13 14:00:00', 'Aprovuar', 5000.00),
(1, 5, '2025-02-14 08:00:00', 'Aprovuar', 5000.00),
-- Kupa e Basketbollit (id=2)
(2, 6, '2025-03-01 10:00:00', 'Aprovuar', 2500.00),
(2, 7, '2025-03-02 11:00:00', 'Aprovuar', 2500.00),
-- Turneu i Volejbollit (id=3) — two teams registered
(3, 1, '2025-01-14 10:00:00', 'Aprovuar', 1500.00),
(3, 8, '2025-01-15 09:00:00', 'Aprovuar', 1500.00);

-- =============================================================
--  9. Matches  (needs Tournaments + Teams + Venues)
--     FIXED: Volejboll match now uses two different teams (1 vs 8)
--     so it gets id=7 naturally without any DELETE hack
-- =============================================================
INSERT INTO Matches (turneu_id, ekipi_shtepiak_id, ekipi_mysafir_id, data_ndeshjes, ora_fillimit, fusha_id, statusi, faza) VALUES
-- Kampionati Kombëtar i Futbollit (match ids: 1-5)
(1, 1, 2, '2025-03-22', '18:00', 1, 'Përfunduar', 'Javë 1'),
(1, 3, 4, '2025-03-22', '20:00', 2, 'Përfunduar', 'Javë 1'),
(1, 1, 3, '2025-03-29', '18:00', 1, 'Përfunduar', 'Gjysmëfinale'),
(1, 2, 4, '2025-03-29', '20:00', 2, 'Live',        'Gjysmëfinale'),
(1, 5, 1, '2025-04-05', '17:00', 1, 'Planifikuar', 'Finale'),
-- Kupa e Basketbollit (match id: 6)
(2, 6, 7, '2025-04-05', '19:00', 3, 'Planifikuar', 'Çerekfinale'),
-- Turneu Volejbolli (match id: 7) — FC Prishtina vs VK Ferizaj
(3, 1, 8, '2025-02-10', '16:00', 4, 'Përfunduar', 'Finale');

-- =============================================================
--  10. MatchResults  (needs Matches + Teams + Players)
--      Only for 'Përfunduar' matches (ids: 1, 2, 3, 7)
-- =============================================================
INSERT INTO MatchResults (ndeshja_id, golat_shtepiak, golat_mysafir, fitues_id, shenime, mvp_id) VALUES
(1, 3, 1, 1, 'FC Prishtina fitoi bindshëm. Hat-trick nga sulmuesi kryesor.',         1),
(2, 2, 2, NULL, 'Barazim dramatik. Dy gola për çdo skuadër.',                         NULL),
(3, 2, 1, 1, 'FC Prishtina kualifikohet në finale me gol vendimtar në minutën 87.',  2),
(7, 3, 1, 1, 'Finales ia dha drejtim FC Prishtina pas dy seteve.',                    NULL);

-- =============================================================
--  11. MatchReferees  (needs Matches + Referees)
-- =============================================================
INSERT INTO MatchReferees (ndeshja_id, gjyqtari_id, roli) VALUES
(1, 1, 'Kryegjyqtar'),
(1, 2, 'Asistent 1'),
(1, 3, 'Asistent 2'),
(2, 4, 'Kryegjyqtar'),
(2, 5, 'Asistent 1'),
(3, 1, 'Kryegjyqtar'),
(3, 2, 'Asistent 1'),
(4, 4, 'Kryegjyqtar'),
(5, 1, 'Kryegjyqtar'),
(7, 3, 'Kryegjyqtar');

-- =============================================================
--  12. Standings  (needs Tournaments + Teams)
-- =============================================================
INSERT INTO Standings (turneu_id, ekipi_id, ndeshjet_luajtura, fitoret, barazimet, humbjet, golat_shenuar, golat_pranuar, piket) VALUES
-- Kampionati Kombëtar (id=1)
(1, 1, 10, 8, 1, 1, 24,  8, 25),
(1, 2, 10, 7, 2, 1, 20, 10, 23),
(1, 3, 10, 6, 1, 3, 18, 14, 19),
(1, 4, 10, 5, 2, 3, 16, 13, 17),
(1, 5, 10, 3, 3, 4, 12, 18, 12),
-- Kupa e Basketbollit (id=2)
(2, 6,  2, 2, 0, 0, 178, 152, 6),
(2, 7,  2, 0, 0, 2, 152, 178, 0);
