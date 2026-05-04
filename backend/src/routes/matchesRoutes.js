import express from "express";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();
const DEFAULT_MATCH_DURATION_MINUTES = 60;

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toMatchTimeValue(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const normalizedValue =
    typeof value === "string" && value.length === 5 ? `${value}:00` : value;

  return new Date(`1970-01-01T${normalizedValue}Z`);
}

function getDatePart(value) {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function getTimePart(value) {
  if (!value) return "00:00:00";

  const text = value instanceof Date ? value.toISOString() : String(value);
  if (text.includes("T")) return text.slice(11, 19);

  return text.length === 5 ? `${text}:00` : text.slice(0, 8);
}

async function validateMatchTeamsForTournament({
  turneu_id,
  ekipi_shtepiak_id,
  ekipi_mysafir_id,
}) {
  const [tournament, homeTeam, awayTeam, homeRegistration, awayRegistration] =
    await Promise.all([
      prisma.tournaments.findUnique({
        where: { id: turneu_id },
        select: { id: true, sporti_id: true },
      }),
      prisma.teams.findUnique({
        where: { id: ekipi_shtepiak_id },
        select: { id: true, sporti_id: true },
      }),
      prisma.teams.findUnique({
        where: { id: ekipi_mysafir_id },
        select: { id: true, sporti_id: true },
      }),
      prisma.tournamentregistrations.findFirst({
        where: {
          turneu_id,
          ekipi_id: ekipi_shtepiak_id,
          statusi: "Aprovuar",
        },
        select: { id: true },
      }),
      prisma.tournamentregistrations.findFirst({
        where: {
          turneu_id,
          ekipi_id: ekipi_mysafir_id,
          statusi: "Aprovuar",
        },
        select: { id: true },
      }),
    ]);

  if (!tournament || !homeTeam || !awayTeam) {
    return {
      ok: false,
      status: 400,
      error: "The selected tournament or teams do not exist.",
    };
  }

  if (
    homeTeam.sporti_id !== tournament.sporti_id ||
    awayTeam.sporti_id !== tournament.sporti_id
  ) {
    return {
      ok: false,
      status: 400,
      error: "Both teams must belong to the same sport as the tournament.",
    };
  }

  if (!homeRegistration || !awayRegistration) {
    return {
      ok: false,
      status: 400,
      error: "Both teams must be approved in this tournament before creating a match.",
    };
  }

  return { ok: true };
}

async function organizerOwnsTournament(tournamentId, organizerId) {
  const parsedTournamentId = parsePositiveInt(tournamentId);
  const parsedOrganizerId = parsePositiveInt(organizerId);

  if (!parsedTournamentId || !parsedOrganizerId) {
    return false;
  }

  const tournament = await prisma.tournaments.findFirst({
    where: {
      id: parsedTournamentId,
      organizatori_id: parsedOrganizerId,
    },
    select: { id: true },
  });

  return Boolean(tournament);
}

async function organizerOwnsMatch(matchId, organizerId) {
  const parsedMatchId = parsePositiveInt(matchId);
  const parsedOrganizerId = parsePositiveInt(organizerId);

  if (!parsedMatchId || !parsedOrganizerId) {
    return false;
  }

  const match = await prisma.matches.findFirst({
    where: {
      id: parsedMatchId,
      tournaments: {
        organizatori_id: parsedOrganizerId,
      },
    },
    select: { id: true },
  });

  return Boolean(match);
}

function formatPublicMatch(match){
  const result = match.matchresults;

  return{
    id: match.id,
    turneu_id: match.turneu_id,
    ekipi_shtepiak_id: match.ekipi_shtepiak_id,
    ekipi_mysafir_id: match.ekipi_mysafir_id,
    ekipi_shtepiak:
      match.teams_matches_ekipi_shtepiak_idToteams?.emertimi ?? null,
    ekipi_mysafir:
      match.teams_matches_ekipi_mysafir_idToteams?.emertimi ?? null,
    turneu_emri: match.tournaments?.emertimi ?? null,
    data_ndeshjes: match.data_ndeshjes,
    ora_fillimit: match.ora_fillimit,
    starts_at: `${getDatePart(match.data_ndeshjes)}T${getTimePart(match.ora_fillimit)}`,
    statusi: match.statusi,
    faza: match.faza,
    kohezgjatja: match.kohezgjatja ?? DEFAULT_MATCH_DURATION_MINUTES,
    score: {
      golat_shtepiak: result?.golat_shtepiak ?? 0,
      golat_mysafir: result?.golat_mysafir ?? 0,
    },
    cards: match.matchevents.map((event) => ({
      id: event.id,
      matchId: event.ndeshja_id,
      playerId: event.lojtari_id,
      playerName: event.players
        ? `${event.players.emri} ${event.players.mbiemri}`
        : null,
      teamId: event.ekipi_id,
      teamName: event.teams?.emertimi ?? null,
      card: event.lloji,
      minuta: event.minuta,
      created_at: event.created_at,

    })),
  };
}

router.get("/public/live", async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const matches = await prisma.matches.findMany({
      where: {
        OR: [
          { statusi: "Live" },
          {
            statusi: "Përfunduar",
            data_ndeshjes: {
              gte: yesterday,
            },
          },
        ],
      },
      include: {
        teams_matches_ekipi_shtepiak_idToteams: {
          select: { emertimi: true },
        },
        teams_matches_ekipi_mysafir_idToteams: {
          select: { emertimi: true },
        },
        tournaments: {
          select: { emertimi: true },
        },
        matchresults: true,
        matchevents: {
          include: {
            players: {
              select: {
                id: true,
                emri: true,
                mbiemri: true,
              },
            },
            teams: {
              select: {
                id: true,
                emertimi: true,
              },
            },
          },
          orderBy: [
            { minuta: "asc" },
            { id: "asc" },
          ],
        },
      },
      orderBy: [
        { data_ndeshjes: "desc" },
        { ora_fillimit: "desc" },
      ],
    });

    res.json(matches.map(formatPublicMatch));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/", protect, async (req, res) => {
  try {
    let matches;

    if (req.user.is_admin) {
      matches = await prisma.matches.findMany({
        orderBy: { id: "asc" },
      });
    } else if (req.user.is_organizer) {
      matches = await prisma.matches.findMany({
        where: {
          tournaments: {
            organizatori_id: req.user.id,
          },
        },
        orderBy: { id: "asc" },
      });
    } else if (req.user.is_referee) {
      matches = await prisma.matches.findMany({
        where: {
          matchreferees: {
            some: {
              referees: {
                user_id: req.user.id,
              },
            },
          },
        },
        orderBy: { id: "asc" },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if (!matchId) {
    return res.status(400).json({ error: "Invalid match id" });
  }

  try {
    let match;

    if (req.user.is_admin) {
      match = await prisma.matches.findUnique({
        where: { id: matchId },
      });
    } else if (req.user.is_organizer) {
      match = await prisma.matches.findFirst({
        where: {
          id: matchId,
          tournaments: {
            organizatori_id: req.user.id,
          },
        },
      });
    } else if (req.user.is_referee) {
      match = await prisma.matches.findFirst({
        where: {
          id: matchId,
          matchreferees: {
            some: {
              referees: {
                user_id: req.user.id,
              },
            },
          },
        },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!match) {
      return res.status(404).json({ error: "The match was not found" });
    }

    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const {
    turneu_id,
    ekipi_shtepiak_id,
    ekipi_mysafir_id,
    data_ndeshjes,
    ora_fillimit,
    fusha_id,
    statusi,
    faza,
  } = req.body;

  if (!turneu_id || !ekipi_shtepiak_id || !ekipi_mysafir_id || !data_ndeshjes) {
    return res.status(400).json({
      error:
        "Fields required: turneu_id, ekipi_shtepiak_id, ekipi_mysafir_id, data_ndeshjes",
    });
  }

  if (Number(ekipi_shtepiak_id) === Number(ekipi_mysafir_id)) {
    return res.status(400).json({ error: "The teams cannot be the same" });
  }

  try {
    if (req.user.is_organizer) {
      const ownsTournament = await organizerOwnsTournament(turneu_id, req.user.id);
      if (!ownsTournament) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const numericTurneuId = Number(turneu_id);
    const numericHomeTeamId = Number(ekipi_shtepiak_id);
    const numericAwayTeamId = Number(ekipi_mysafir_id);
    const matchValidation = await validateMatchTeamsForTournament({
      turneu_id: numericTurneuId,
      ekipi_shtepiak_id: numericHomeTeamId,
      ekipi_mysafir_id: numericAwayTeamId,
    });
    if (!matchValidation.ok) {
      return res.status(matchValidation.status).json({ error: matchValidation.error });
    }

    const created = await prisma.matches.create({
      data: {
        turneu_id: numericTurneuId,
        ekipi_shtepiak_id: numericHomeTeamId,
        ekipi_mysafir_id: numericAwayTeamId,
        data_ndeshjes: new Date(data_ndeshjes),
        ora_fillimit: toMatchTimeValue(ora_fillimit),
        fusha_id: fusha_id ? Number(fusha_id) : null,
        statusi: statusi || "Planifikuar",
        faza: faza || null,
        kohezgjatja: DEFAULT_MATCH_DURATION_MINUTES,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if (!matchId) {
    return res.status(400).json({ error: "Invalid match id" });
  }

  const {
    turneu_id,
    ekipi_shtepiak_id,
    ekipi_mysafir_id,
    data_ndeshjes,
    ora_fillimit,
    fusha_id,
    statusi,
    faza,
  } = req.body;

  if (
    ekipi_shtepiak_id &&
    ekipi_mysafir_id &&
    Number(ekipi_shtepiak_id) === Number(ekipi_mysafir_id)
  ) {
    return res.status(400).json({ error: "The teams cannot be the same" });
  }

  try {
    const existing = await prisma.matches.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        turneu_id: true,
        ekipi_shtepiak_id: true,
        ekipi_mysafir_id: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "The match was not found" });
    }

    const targetTournamentId = turneu_id ? Number(turneu_id) : existing.turneu_id;
    const targetHomeTeamId = ekipi_shtepiak_id
      ? Number(ekipi_shtepiak_id)
      : existing.ekipi_shtepiak_id;
    const targetAwayTeamId = ekipi_mysafir_id
      ? Number(ekipi_mysafir_id)
      : existing.ekipi_mysafir_id;

    if (req.user.is_organizer) {
      const ownsCurrentMatch = await organizerOwnsMatch(matchId, req.user.id);
      const ownsTargetTournament = await organizerOwnsTournament(targetTournamentId, req.user.id);

      if (!ownsCurrentMatch || !ownsTargetTournament) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const matchValidation = await validateMatchTeamsForTournament({
      turneu_id: targetTournamentId,
      ekipi_shtepiak_id: targetHomeTeamId,
      ekipi_mysafir_id: targetAwayTeamId,
    });
    if (!matchValidation.ok) {
      return res.status(matchValidation.status).json({ error: matchValidation.error });
    }

    const updated = await prisma.matches.update({
      where: { id: matchId },
      data: {
        turneu_id: turneu_id ? targetTournamentId : undefined,
        ekipi_shtepiak_id: ekipi_shtepiak_id ? targetHomeTeamId : undefined,
        ekipi_mysafir_id: ekipi_mysafir_id ? targetAwayTeamId : undefined,
        data_ndeshjes: data_ndeshjes ? new Date(data_ndeshjes) : undefined,
        ora_fillimit: toMatchTimeValue(ora_fillimit),
        fusha_id: fusha_id === undefined ? undefined : fusha_id ? Number(fusha_id) : null,
        statusi: statusi ?? undefined,
        faza: faza === undefined ? undefined : faza || null,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if (!matchId) {
    return res.status(400).json({ error: "Invalid match id" });
  }

  try {
    if (req.user.is_organizer) {
      const ownsMatch = await organizerOwnsMatch(matchId, req.user.id);
      if (!ownsMatch) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const existing = await prisma.matches.findUnique({
      where: { id: matchId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "The match was not found" });
    }

    await prisma.matches.delete({
      where: { id: matchId },
    });

    res.json({ message: "The match was deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/score", protect, requireRole("is_admin", "is_organizer", "is_referee"), async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if(!matchId){
    return res.status(400).json({ error: "Invalid match id" });
  }

  const homeScore = Number(req.body.golat_shtepiak);
  const awayScore = Number(req.body.golat_mysafir);

  if(
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0
  ){
    return res.status(400).json({ error: "Scores must be non-negative numbers" });
  }

  try{
    if(req.user.is_organizer){
      const ownsMatch = await organizerOwnsMatch(matchId, req.user.id);
      if(!ownsMatch){
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    if(req.user.is_referee){
      const assignedMatch = await prisma.matches.findFirst({
        where: {
          id: matchId,
          matchreferees: {
            some: {
              referees: {
                user_id: req.user.id,
              },
            },
          },
        },
        select: { id: true },
      });
      if(!assignedMatch){
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const match = await prisma.matches.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        statusi: true,
      },
    });

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const result = await prisma.matchresults.upsert({
      where: { ndeshja_id: matchId },
      update: {
        golat_shtepiak: homeScore,
        golat_mysafir: awayScore,
      },
      create: {
        ndeshja_id: matchId,
        golat_shtepiak: homeScore,
        golat_mysafir: awayScore,
      },
    });

    const io = req.app.get("io");

    io.emit("score_update", {
      matchId,
      homeScore: result.golat_shtepiak,
      awayScore: result.golat_mysafir,
    });

    res.json({ message: "Score updated successfully", result });
  }catch(err){
    res.status(500).json({ error: err.message });
  }

});

export default router;
