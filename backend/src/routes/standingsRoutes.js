// Defines standings routes for public and protected tournament standings queries.
import express from "express";
import Joi from "joi";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";
import recalculateStandings from "../services/recalculateStandings.js";

const router = express.Router();

const standingsParamSchema = Joi.object({
  turneuId: Joi.number().integer().positive().required().messages({
    "number.base": "Tournament ID must be a valid number.",
    "number.positive": "Tournament ID must be a positive integer.",
    "any.required": "Tournament ID is required.",
  }),
});

function getGoalDifference(standing) {
  return Number(standing.golat_shenuar || 0) - Number(standing.golat_pranuar || 0);
}

function getTeamName(standing) {
  return standing.teams?.emertimi || "";
}

function sortStandings(rows) {
  return [...rows].sort((a, b) => {
    const pointsDiff = Number(b.piket || 0) - Number(a.piket || 0);
    if (pointsDiff !== 0) return pointsDiff;

    const gdDiff = getGoalDifference(b) - getGoalDifference(a);
    if (gdDiff !== 0) return gdDiff;

    const goalsDiff = Number(b.golat_shenuar || 0) - Number(a.golat_shenuar || 0);
    if (goalsDiff !== 0) return goalsDiff;

    return getTeamName(a).localeCompare(getTeamName(b));
  });
}

function getMatchOutcome(match, teamId) {
  const result = match.matchresults;
  if (!result) return null;

  const isHome = match.ekipi_shtepiak_id === teamId;
  const isAway = match.ekipi_mysafir_id === teamId;
  if (!isHome && !isAway) return null;

  const ownGoals = isHome ? result.golat_shtepiak : result.golat_mysafir;
  const opponentGoals = isHome ? result.golat_mysafir : result.golat_shtepiak;

  if (ownGoals > opponentGoals) return "W";
  if (ownGoals < opponentGoals) return "L";
  return "D";
}

async function buildFormMap(tournamentIds) {
  if (tournamentIds.length === 0) return new Map();

  const matches = await prisma.matches.findMany({
    where: {
      turneu_id: { in: tournamentIds },
      matchresults: { isNot: null },
    },
    include: { matchresults: true },
    orderBy: [{ data_ndeshjes: "asc" }, { id: "asc" }],
  });

  const formMap = new Map();

  matches.forEach((match) => {
    [match.ekipi_shtepiak_id, match.ekipi_mysafir_id].forEach((teamId) => {
      const outcome = getMatchOutcome(match, teamId);
      if (!outcome) return;

      const key = `${match.turneu_id}:${teamId}`;
      const form = formMap.get(key) || [];
      form.push(outcome);
      formMap.set(key, form.slice(-5));
    });
  });

  return formMap;
}

async function fetchStandings({ tournamentId = null, user = null, isPublic = false } = {}) {
  const where = {};

  if (tournamentId) {
    where.turneu_id = tournamentId;
  }

  if (!isPublic) {
    if (user?.is_admin) {
      // Admins can see every tournament.
    } else if (user?.is_organizer) {
      where.tournaments = { organizatori_id: user.id };
    } else {
      return { forbidden: true, rows: [] };
    }
  }

  const standings = await prisma.standings.findMany({
    where,
    include: {
      teams: { select: { emertimi: true } },
      tournaments: {
        select: {
          emertimi: true,
          organizatori_id: true,
          sports: { select: { emertimi: true } },
        },
      },
    },
  });

  const tournamentIds = [
    ...new Set(standings.map((standing) => standing.turneu_id)),
  ];
  const formMap = await buildFormMap(tournamentIds);
  const grouped = new Map();

  standings.forEach((standing) => {
    const tournamentRows = grouped.get(standing.turneu_id) || [];
    tournamentRows.push(standing);
    grouped.set(standing.turneu_id, tournamentRows);
  });

  const rows = Array.from(grouped.values()).flatMap((tournamentRows) =>
    sortStandings(tournamentRows).map((standing, index) => {
      const goalDifference = getGoalDifference(standing);
      const formKey = `${standing.turneu_id}:${standing.ekipi_id}`;

      return {
        ...standing,
        rank: index + 1,
        goal_difference: goalDifference,
        form: formMap.get(formKey) || [],
        team_name: standing.teams?.emertimi || null,
        tournament_name: standing.tournaments?.emertimi || null,
        sport_name: standing.tournaments?.sports?.emertimi || null,
      };
    }),
  );

  return {
    forbidden: false,
    rows: rows.sort((a, b) => {
      if (a.turneu_id !== b.turneu_id) return a.turneu_id - b.turneu_id;
      return a.rank - b.rank;
    }),
  };
}

async function ensureCanRecalculateTournament(turneuId, user) {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: turneuId },
    select: { id: true, organizatori_id: true },
  });

  if (!tournament) {
    return { ok: false, status: 404, error: "Tournament not found." };
  }

  if (user?.is_admin) {
    return { ok: true };
  }

  if (user?.is_organizer && tournament.organizatori_id === user.id) {
    return { ok: true };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

router.get("/public", async (req, res) => {
  try {
    const { rows } = await fetchStandings({ isPublic: true });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/public/tournament/:turneuId", async (req, res) => {
  const { error, value } = standingsParamSchema.validate({
    turneuId: req.params.turneuId,
  });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const { rows } = await fetchStandings({
      tournamentId: value.turneuId,
      isPublic: true,
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const { forbidden, rows } = await fetchStandings({ user: req.user });
    if (forbidden) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tournament/:turneuId", protect, async (req, res) => {
  const { error, value } = standingsParamSchema.validate({
    turneuId: req.params.turneuId,
  });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const { forbidden, rows } = await fetchStandings({
      tournamentId: value.turneuId,
      user: req.user,
    });
    if (forbidden) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/recalculate/:turneuId",
  protect,
  requireRole("is_admin", "is_organizer"),
  async (req, res) => {
    const { error, value } = standingsParamSchema.validate({
      turneuId: req.params.turneuId,
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    try {
      const access = await ensureCanRecalculateTournament(value.turneuId, req.user);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      await recalculateStandings(value.turneuId);
      res.json({ message: "Standings recalculated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
