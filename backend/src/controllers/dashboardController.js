// Builds dashboard summaries, statistics, standings, and recent activity data from Prisma models.
import prisma from "../lib/prisma.js";

const ACTIVE_TOURNAMENT_STATUS = "Aktiv";
const LIVE_MATCH_STATUS = "Live";
const UPCOMING_MATCH_STATUS = "Planifikuar";

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isCompletedMatch(match) {
  const status = normalizeStatus(match?.statusi);
  return (
    status.includes("perfunduar") ||
    status.includes("përfunduar") ||
    status.includes("finished") ||
    status.includes("final")
  );
}

function getFullName(person) {
  return [person?.emri, person?.mbiemri].filter(Boolean).join(" ").trim();
}

function getMatchLabel(match) {
  const homeTeam = match?.teams_matches_ekipi_shtepiak_idToteams?.emertimi || "Home";
  const awayTeam = match?.teams_matches_ekipi_mysafir_idToteams?.emertimi || "Away";

  return `${homeTeam} vs ${awayTeam}`;
}

function getMatchScore(match) {
  const result = match?.matchresults;
  if (!result) return null;

  return {
    home: result.golat_shtepiak ?? 0,
    away: result.golat_mysafir ?? 0,
  };
}

function getElapsedMinutes(match) {
  if (!match?.ora_fillimit || !match?.data_ndeshjes) return null;

  const datePart = new Date(match.data_ndeshjes);
  const timePart = new Date(match.ora_fillimit);
  if (Number.isNaN(datePart.getTime()) || Number.isNaN(timePart.getTime())) {
    return null;
  }

  const kickoff = new Date(datePart);
  kickoff.setHours(
    timePart.getHours(),
    timePart.getMinutes(),
    timePart.getSeconds(),
    0,
  );

  const diffMinutes = Math.floor((Date.now() - kickoff.getTime()) / 60000);
  return diffMinutes >= 0 ? diffMinutes : null;
}

function sortStandingsRows(rows) {
  return [...rows].sort((left, right) => {
    const pointsDiff = Number(right.piket || 0) - Number(left.piket || 0);
    if (pointsDiff !== 0) return pointsDiff;

    const goalDifferenceRight = Number(right.golat_shenuar || 0) - Number(right.golat_pranuar || 0);
    const goalDifferenceLeft = Number(left.golat_shenuar || 0) - Number(left.golat_pranuar || 0);
    const goalDiff = goalDifferenceRight - goalDifferenceLeft;
    if (goalDiff !== 0) return goalDiff;

    const goalsForDiff = Number(right.golat_shenuar || 0) - Number(left.golat_shenuar || 0);
    if (goalsForDiff !== 0) return goalsForDiff;

    return (left.teams?.emertimi || "").localeCompare(right.teams?.emertimi || "");
  });
}

function formatTournament(tournament) {
  return {
    id: tournament.id,
    emertimi: tournament.emertimi,
    statusi: tournament.statusi,
    data_fillimit: tournament.data_fillimit,
    data_perfundimit: tournament.data_perfundimit,
    sport: tournament.sports
      ? {
          id: tournament.sports.id,
          emertimi: tournament.sports.emertimi,
        }
      : null,
    matchesCount: tournament._count?.matches || 0,
    standingsCount: tournament._count?.standings || 0,
  };
}

function formatMatch(match) {
  return {
    id: match.id,
    tournamentId: match.turneu_id,
    tournamentName: match.tournaments?.emertimi || null,
    statusi: match.statusi,
    data_ndeshjes: match.data_ndeshjes,
    ora_fillimit: match.ora_fillimit,
    homeTeam: {
      id: match.teams_matches_ekipi_shtepiak_idToteams?.id || null,
      emertimi: match.teams_matches_ekipi_shtepiak_idToteams?.emertimi || "Home",
      logoja: match.teams_matches_ekipi_shtepiak_idToteams?.logoja || null,
    },
    awayTeam: {
      id: match.teams_matches_ekipi_mysafir_idToteams?.id || null,
      emertimi: match.teams_matches_ekipi_mysafir_idToteams?.emertimi || "Away",
      logoja: match.teams_matches_ekipi_mysafir_idToteams?.logoja || null,
    },
    score: getMatchScore(match),
    label: getMatchLabel(match),
  };
}

function formatLiveMatch(match) {
  return {
    ...formatMatch(match),
    elapsedMinutes: getElapsedMinutes(match),
  };
}

async function buildStandingsPreview(tournaments) {
  if (tournaments.length === 0) return [];

  const standingsRows = await prisma.standings.findMany({
    where: { turneu_id: { in: tournaments.map((tournament) => tournament.id) } },
    include: {
      teams: { select: { id: true, emertimi: true, logoja: true } },
      tournaments: {
        select: {
          id: true,
          emertimi: true,
          sports: { select: { id: true, emertimi: true } },
        },
      },
    },
  });

  const grouped = new Map();

  standingsRows.forEach((row) => {
    const existing = grouped.get(row.turneu_id) || [];
    existing.push(row);
    grouped.set(row.turneu_id, existing);
  });

  return tournaments.map((tournament) => {
    const rows = sortStandingsRows(grouped.get(tournament.id) || []).slice(0, 5);
    const tournamentMeta = rows[0]?.tournaments || tournament;

    return {
      tournamentId: tournament.id,
      tournamentName: tournamentMeta?.emertimi || null,
      sportName: tournamentMeta?.sports?.emertimi || null,
      rows: rows.map((standing, index) => ({
        id: standing.id,
        rank: index + 1,
        teamId: standing.ekipi_id,
        teamName: standing.teams?.emertimi || "Unknown team",
        teamLogo: standing.teams?.logoja || null,
        played: standing.ndeshjet_luajtura,
        wins: standing.fitoret,
        draws: standing.barazimet,
        losses: standing.humbjet,
        goalsFor: standing.golat_shenuar,
        goalsAgainst: standing.golat_pranuar,
        points: standing.piket,
      })),
    };
  });
}

function formatRecentMvpResults(results) {
  return results.map((result) => ({
    id: result.id,
    tournamentName: result.matches?.tournaments?.emertimi || null,
    matchLabel: getMatchLabel(result.matches),
    data_ndeshjes: result.matches?.data_ndeshjes || null,
    score: {
      home: result.golat_shtepiak,
      away: result.golat_mysafir,
    },
    player: result.players
      ? {
          id: result.players.id,
          name: getFullName(result.players),
          foto: result.players.foto || null,
        }
      : null,
  }));
}

function formatTopScorers(eventRows) {
  const scorerMap = new Map();

  eventRows.forEach((event) => {
    const playerId = event.lojtari_id || event.players?.id || event.player_name || `event-${event.id}`;
    const current = scorerMap.get(playerId) || {
      playerId: event.players?.id || event.lojtari_id || null,
      playerName: event.players ? getFullName(event.players) : event.player_name || "Unknown player",
      teamName: event.teams?.emertimi || event.players?.teams?.emertimi || null,
      photo: event.players?.foto || null,
      goals: 0,
    };

    current.goals += 1;
    scorerMap.set(playerId, current);
  });

  return [...scorerMap.values()]
    .sort((left, right) => right.goals - left.goals || left.playerName.localeCompare(right.playerName))
    .slice(0, 5);
}

export async function getDashboardData(req, res) {
  try {
    const [
      tournamentsCount,
      teamsCount,
      matchesPlayedCount,
      registeredPlayersCount,
      liveMatches,
      activeTournaments,
      recentResults,
      upcomingMatches,
      recentMvpResults,
      goalEvents,
      sports,
    ] = await Promise.all([
      prisma.tournaments.count(),
      prisma.teams.count(),
      prisma.matches.count({ where: { matchresults: { isNot: null } } }),
      prisma.players.count(),
      prisma.matches.findMany({
        where: { statusi: LIVE_MATCH_STATUS },
        orderBy: [{ data_ndeshjes: "desc" }, { id: "desc" }],
        include: {
          tournaments: { select: { id: true, emertimi: true } },
          teams_matches_ekipi_shtepiak_idToteams: {
            select: { id: true, emertimi: true, logoja: true },
          },
          teams_matches_ekipi_mysafir_idToteams: {
            select: { id: true, emertimi: true, logoja: true },
          },
          matchresults: {
            select: { golat_shtepiak: true, golat_mysafir: true },
          },
        },
      }),
      prisma.tournaments.findMany({
        where: { statusi: ACTIVE_TOURNAMENT_STATUS },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        include: {
          sports: { select: { id: true, emertimi: true } },
          _count: { select: { matches: true, standings: true } },
        },
      }),
      prisma.matches.findMany({
        where: {
          matchresults: { isNot: null },
        },
        orderBy: [{ data_ndeshjes: "desc" }, { id: "desc" }],
        take: 8,
        include: {
          tournaments: { select: { id: true, emertimi: true } },
          teams_matches_ekipi_shtepiak_idToteams: {
            select: { id: true, emertimi: true, logoja: true },
          },
          teams_matches_ekipi_mysafir_idToteams: {
            select: { id: true, emertimi: true, logoja: true },
          },
          matchresults: {
            select: { golat_shtepiak: true, golat_mysafir: true },
          },
        },
      }),
      prisma.matches.findMany({
        where: {
          statusi: UPCOMING_MATCH_STATUS,
          OR: [{ data_ndeshjes: { gte: new Date() } }, { matchresults: { is: null } }],
        },
        orderBy: [{ data_ndeshjes: "asc" }, { ora_fillimit: "asc" }, { id: "asc" }],
        take: 8,
        include: {
          tournaments: { select: { id: true, emertimi: true } },
          teams_matches_ekipi_shtepiak_idToteams: {
            select: { id: true, emertimi: true, logoja: true },
          },
          teams_matches_ekipi_mysafir_idToteams: {
            select: { id: true, emertimi: true, logoja: true },
          },
        },
      }),
      prisma.matchresults.findMany({
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: 6,
        include: {
          players: { select: { id: true, emri: true, mbiemri: true, foto: true } },
          matches: {
            select: {
              id: true,
              data_ndeshjes: true,
              tournaments: { select: { emertimi: true } },
              teams_matches_ekipi_shtepiak_idToteams: {
                select: { id: true, emertimi: true },
              },
              teams_matches_ekipi_mysafir_idToteams: {
                select: { id: true, emertimi: true },
              },
            },
          },
        },
      }),
      prisma.matchevents.findMany({
        where: {
          lloji: { in: ["Goal", "Gol"] },
          OR: [{ lojtari_id: { not: null } }, { player_name: { not: null } }],
        },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: 200,
        include: {
          players: {
            select: {
              id: true,
              emri: true,
              mbiemri: true,
              foto: true,
              teams: { select: { id: true, emertimi: true } },
            },
          },
          teams: { select: { id: true, emertimi: true } },
        },
      }),
      prisma.sports.findMany({
        orderBy: [{ emertimi: "asc" }, { id: "asc" }],
        select: { id: true, emertimi: true, lloji: true },
      }),
    ]);

    const activeTournamentsSorted = [...activeTournaments].sort((left, right) => {
      const leftScore = Number(left._count?.matches || 0) + Number(left._count?.standings || 0);
      const rightScore = Number(right._count?.matches || 0) + Number(right._count?.standings || 0);

      if (rightScore !== leftScore) return rightScore - leftScore;

      return new Date(right.created_at || 0) - new Date(left.created_at || 0);
    });

    const standingsPreview = await buildStandingsPreview(activeTournamentsSorted.slice(0, 4));

    const spotlight = {
      recentMvp: formatRecentMvpResults(recentMvpResults),
      topScorers: formatTopScorers(goalEvents),
    };

    res.json({
      stats: {
        tournaments: tournamentsCount,
        teams: teamsCount,
        matchesPlayed: matchesPlayedCount,
        registeredPlayers: registeredPlayersCount,
      },
      liveMatches: liveMatches.map(formatLiveMatch),
      activeTournaments: activeTournamentsSorted.map(formatTournament),
      recentResults: recentResults.filter(isCompletedMatch).map(formatMatch),
      upcomingMatches: upcomingMatches.map(formatMatch),
      standingsPreview,
      spotlight,
      sports,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function searchDashboard(req, res) {
  try {
    const query = String(req.query.q || req.query.search || "").trim();

    if (!query) {
      return res.json({ tournaments: [], teams: [], players: [] });
    }

    const [tournaments, teams, players] = await Promise.all([
      prisma.tournaments.findMany({
        where: {
          OR: [
            { emertimi: { contains: query, mode: "insensitive" } },
            { statusi: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 6,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        include: { sports: { select: { id: true, emertimi: true } } },
      }),
      prisma.teams.findMany({
        where: {
          OR: [
            { emertimi: { contains: query, mode: "insensitive" } },
            { qyteti: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 6,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        include: { sports: { select: { id: true, emertimi: true } } },
      }),
      prisma.players.findMany({
        where: {
          OR: [
            { emri: { contains: query, mode: "insensitive" } },
            { mbiemri: { contains: query, mode: "insensitive" } },
            { pozicioni: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 6,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        include: { teams: { select: { id: true, emertimi: true, logoja: true } } },
      }),
    ]);

    res.json({
      tournaments: tournaments.map((item) => ({
        id: item.id,
        type: "tournament",
        label: item.emertimi,
        subtitle: item.sports?.emertimi || item.statusi,
        statusi: item.statusi,
      })),
      teams: teams.map((item) => ({
        id: item.id,
        type: "team",
        label: item.emertimi,
        subtitle: [item.qyteti, item.sports?.emertimi].filter(Boolean).join(" · "),
      })),
      players: players.map((item) => ({
        id: item.id,
        type: "player",
        label: getFullName(item) || item.emri,
        subtitle: [item.pozicioni, item.teams?.emertimi].filter(Boolean).join(" · "),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
