// Recalculates tournament standings from registrations and completed match results.
import prisma from "../lib/prisma.js";

function createEmptyStats() {
  return {
    ndeshjet_luajtura: 0,
    fitoret: 0,
    barazimet: 0,
    humbjet: 0,
    golat_shenuar: 0,
    golat_pranuar: 0,
    piket: 0,
  };
}

async function recalculateStandings(turneuId) {
  const [registrations, matches] = await Promise.all([
    prisma.tournamentregistrations.findMany({
      where: {
        turneu_id: turneuId,
        statusi: "Aprovuar",
      },
      select: { ekipi_id: true },
    }),
    prisma.matches.findMany({
      where: {
        turneu_id: turneuId,
        matchresults: { isNot: null },
      },
      include: { matchresults: true },
    }),
  ]);

  const statsMap = new Map();

  const getOrCreate = (ekipiId) => {
    if (!statsMap.has(ekipiId)) {
      statsMap.set(ekipiId, createEmptyStats());
    }
    return statsMap.get(ekipiId);
  };

  registrations.forEach((registration) => {
    getOrCreate(registration.ekipi_id);
  });

  for (const match of matches) {
    const result = match.matchresults;
    if (!result) continue;

    const homeId = match.ekipi_shtepiak_id;
    const awayId = match.ekipi_mysafir_id;
    const homeGoals = Number(result.golat_shtepiak || 0);
    const awayGoals = Number(result.golat_mysafir || 0);

    const homeStats = getOrCreate(homeId);
    const awayStats = getOrCreate(awayId);

    homeStats.ndeshjet_luajtura += 1;
    awayStats.ndeshjet_luajtura += 1;

    homeStats.golat_shenuar += homeGoals;
    homeStats.golat_pranuar += awayGoals;
    awayStats.golat_shenuar += awayGoals;
    awayStats.golat_pranuar += homeGoals;

    if (homeGoals > awayGoals) {
      homeStats.fitoret += 1;
      awayStats.humbjet += 1;
    } else if (homeGoals < awayGoals) {
      awayStats.fitoret += 1;
      homeStats.humbjet += 1;
    } else {
      homeStats.barazimet += 1;
      awayStats.barazimet += 1;
    }
  }

  for (const stats of statsMap.values()) {
    stats.piket = stats.fitoret * 3 + stats.barazimet;
  }

  await prisma.$transaction([
    prisma.standings.deleteMany({
      where: { turneu_id: turneuId },
    }),
    ...Array.from(statsMap.entries()).map(([ekipiId, stats]) =>
      prisma.standings.create({
        data: {
          turneu_id: turneuId,
          ekipi_id: ekipiId,
          ...stats,
        },
      }),
    ),
  ]);
}

export default recalculateStandings;
