import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import recalculateStandings from "../services/recalculateStandings.js";
import {
  applyBracketResultProgression,
  revertBracketResultProgression,
} from "../services/bracketService.js";
import Joi from "joi";

const router = express.Router();

const matchResultCreateSchema = Joi.object({
  ndeshja_id: Joi.number().integer().positive().required().messages({
    "number.base": "Match ID must be a valid number.",
    "number.positive": "Match ID must be a positive integer.",
    "any.required": "Match ID is required.",
  }),
  golat_shtepiak: Joi.number().integer().min(0).optional().messages({
    "number.base": "Home team goals must be a valid number.",
    "number.min": "Home team goals cannot be negative.",
  }),
  golat_mysafir: Joi.number().integer().min(0).optional().messages({
    "number.base": "Away team goals must be a valid number.",
    "number.min": "Away team goals cannot be negative.",
  }),
  fitues_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "Winner ID must be a valid number.",
    "number.positive": "Winner ID must be a positive integer.",
  }),
  shenime: Joi.string().optional().allow(null, "").messages({
    "string.base": "Notes must be a valid string.",
  }),
  mvp_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "MVP ID must be a valid number.",
    "number.positive": "MVP ID must be a positive integer.",
  }),
});

const matchResultUpdateSchema = Joi.object({
  ndeshja_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Match ID must be a valid number.",
    "number.positive": "Match ID must be a positive integer.",
  }),
  golat_shtepiak: Joi.number().integer().min(0).optional().messages({
    "number.base": "Home team goals must be a valid number.",
    "number.min": "Home team goals cannot be negative.",
  }),
  golat_mysafir: Joi.number().integer().min(0).optional().messages({
    "number.base": "Away team goals must be a valid number.",
    "number.min": "Away team goals cannot be negative.",
  }),
  fitues_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "Winner ID must be a valid number.",
    "number.positive": "Winner ID must be a positive integer.",
  }),
  shenime: Joi.string().optional().allow(null, "").messages({
    "string.base": "Notes must be a valid string.",
  }),
  mvp_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "MVP ID must be a valid number.",
    "number.positive": "MVP ID must be a positive integer.",
  }),
});

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

const matchResultInclude = {
  matches: {
    select: {
      ekipi_shtepiak_id: true,
      ekipi_mysafir_id: true,
      turneu_id: true,
      data_ndeshjes: true,
      ora_fillimit: true,
      statusi: true,
      faza: true,
      teams_matches_ekipi_shtepiak_idToteams: { select: { emertimi: true } },
      teams_matches_ekipi_mysafir_idToteams: { select: { emertimi: true } },
      tournaments: {
        select: {
          emertimi: true,
          sports: { select: { emertimi: true } },
        },
      },
    },
  },
  teams: { select: { emertimi: true } },
  players: { select: { emri: true, mbiemri: true } },
};

// Helper to format a matchresult record (with includes) into the API shape.
function formatMatchResult(result) {
  return {
    id: result.id,
    ndeshja_id: result.ndeshja_id,
    golat_shtepiak: result.golat_shtepiak,
    golat_mysafir: result.golat_mysafir,
    fitues_id: result.fitues_id,
    fitues_emri: result.teams?.emertimi ?? null,
    shenime: result.shenime,
    mvp_id: result.mvp_id,
    mvp_emr_mbiemr: result.players
      ? `${result.players.emri} ${result.players.mbiemri}`
      : null,
    ekipi_shtepiak_id: result.matches?.ekipi_shtepiak_id ?? null,
    ekipi_shtepiak:
      result.matches?.teams_matches_ekipi_shtepiak_idToteams?.emertimi ?? null,
    ekipi_mysafir_id: result.matches?.ekipi_mysafir_id ?? null,
    ekipi_mysafir:
      result.matches?.teams_matches_ekipi_mysafir_idToteams?.emertimi ?? null,
    data_ndeshjes: result.matches?.data_ndeshjes ?? null,
    ora_fillimit: result.matches?.ora_fillimit ?? null,
    statusi: result.matches?.statusi ?? null,
    faza: result.matches?.faza ?? null,
    turneu_id: result.matches?.turneu_id ?? null,
    turneu_emri: result.matches?.tournaments?.emertimi ?? null,
    sport_emri: result.matches?.tournaments?.sports?.emertimi ?? null,
  };
}

async function fetchManageableMatch(matchId, user) {
  const parsedMatchId = parsePositiveInteger(matchId);
  if (!parsedMatchId) {
    return { ok: false, status: 400, error: "Match ID is invalid." };
  }

  const match = await prisma.matches.findUnique({
    where: { id: parsedMatchId },
    select: {
      id: true,
      turneu_id: true,
      tournaments: {
        select: { organizatori_id: true },
      },
    },
  });

  if (!match) {
    return { ok: false, status: 404, error: "Match not found." };
  }

  if (user?.is_admin) {
    return { ok: true, match };
  }

  if (
    user?.is_organizer &&
    match.tournaments?.organizatori_id === user.id
  ) {
    return { ok: true, match };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

function getErrorMessage(err) {
  return err.response?.data?.error || err.message;
}

// Route for getting all match results with detailed data. This route is protected.
router.get("/", protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const { fromDate, toDate, search } = req.query;

    const where = {};

    // Date range filtering
    if (fromDate || toDate) {
      where.matches = {
        data_ndeshjes: {},
      };

      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        where.matches.data_ndeshjes.gte = from;
      }

      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        where.matches.data_ndeshjes.lte = to;
      }
    }

    // Fetch results (without pagination initially to apply search filter)
    const allResults = await prisma.matchresults.findMany({
      where,
      include: matchResultInclude,
      orderBy: {
        matches: {
          data_ndeshjes: "desc",
        },
      },
    });

    // Apply search filter on formatted results
    let filteredResults = allResults.map(formatMatchResult);
    if (search) {
      const searchLower = search.toLowerCase();
      filteredResults = filteredResults.filter(
        (result) =>
          (result.ekipi_shtepiak && result.ekipi_shtepiak.toLowerCase().includes(searchLower)) ||
          (result.ekipi_mysafir && result.ekipi_mysafir.toLowerCase().includes(searchLower)) ||
          (result.turneu_emri && result.turneu_emri.toLowerCase().includes(searchLower))
      );
    }

    // Apply pagination on filtered results
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(skip, skip + limit);

    res.json({
      data: paginatedResults,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new match result. Admins and owning organizers can use it.
router.post("/", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const {
    ndeshja_id,
    golat_shtepiak,
    golat_mysafir,
    fitues_id,
    shenime,
    mvp_id,
  } = req.body;

  const { error } = matchResultCreateSchema.validate({
    ndeshja_id,
    golat_shtepiak,
    golat_mysafir,
    fitues_id,
    shenime,
    mvp_id,
  });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const access = await fetchManageableMatch(ndeshja_id, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const created = await prisma.$transaction(async (tx) => {
      await tx.matchresults.create({
        data: {
          ndeshja_id,
          golat_shtepiak: golat_shtepiak ?? 0,
          golat_mysafir: golat_mysafir ?? 0,
          fitues_id: fitues_id ?? null,
          shenime: shenime ?? null,
          mvp_id: mvp_id ?? null,
        },
      });

      await applyBracketResultProgression(tx, ndeshja_id, {
        golat_shtepiak: golat_shtepiak ?? 0,
        golat_mysafir: golat_mysafir ?? 0,
        fitues_id: fitues_id ?? null,
      });

      return tx.matchresults.findUnique({
        where: { ndeshja_id },
        include: matchResultInclude,
      });
    });

    // Recalculate standings for the tournament this match belongs to
    try {
      await recalculateStandings(access.match.turneu_id);
    } catch (err) {
      console.error("Standings recalculation failed", err);
    }

    res.status(201).json(formatMatchResult(created));
  } catch (err) {
    res.status(err.status || 500).json({ error: getErrorMessage(err) });
  }
});

// Route for updating an existing match result by its ID. Admins and owning organizers can use it.
router.put("/:id", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const { id } = req.params;
  const matchResultId = parsePositiveInteger(id);
  if (!matchResultId) {
    return res.status(400).json({ error: "The match result ID is invalid." });
  }

  const {
    ndeshja_id,
    golat_shtepiak,
    golat_mysafir,
    fitues_id,
    shenime,
    mvp_id,
  } = req.body;

  const { error } = matchResultUpdateSchema.validate({
    ndeshja_id,
    golat_shtepiak,
    golat_mysafir,
    fitues_id,
    shenime,
    mvp_id,
  });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const existing = await prisma.matchresults.findUnique({
      where: { id: matchResultId },
      select: {
        id: true,
        ndeshja_id: true,
        golat_shtepiak: true,
        golat_mysafir: true,
        fitues_id: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Match result not found." });
    }

    if (ndeshja_id !== undefined && ndeshja_id !== existing.ndeshja_id) {
      return res.status(400).json({
        error: "Match ID cannot be changed for an existing result.",
      });
    }

    const access = await fetchManageableMatch(existing.ndeshja_id, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const nextScores = {
      golat_shtepiak: golat_shtepiak ?? existing.golat_shtepiak,
      golat_mysafir: golat_mysafir ?? existing.golat_mysafir,
      fitues_id: Object.prototype.hasOwnProperty.call(req.body, "fitues_id")
        ? fitues_id ?? null
        : null,
    };

    const updated = await prisma.$transaction(async (tx) => {
      await tx.matchresults.update({
        where: { id: matchResultId },
        data: {
          golat_shtepiak,
          golat_mysafir,
          fitues_id,
          shenime,
          mvp_id,
        },
      });

      await applyBracketResultProgression(
        tx,
        existing.ndeshja_id,
        nextScores,
      );

      return tx.matchresults.findUnique({
        where: { id: matchResultId },
        include: matchResultInclude,
      });
    });

    // Recalculate standings for the tournament this match belongs to
    try {
      await recalculateStandings(access.match.turneu_id);
    } catch (err) {
      console.error("Standings recalculation failed", err);
    }

    res.json(formatMatchResult(updated));
  } catch (err) {
    res.status(err.status || 500).json({ error: getErrorMessage(err) });
  }
});

// Route for deleting an existing match result by its ID. Admins and owning organizers can use it.
router.delete("/:id", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const { id } = req.params;
  const matchResultId = parsePositiveInteger(id);
  if (!matchResultId) {
    return res.status(400).json({ error: "The match result ID is invalid." });
  }

  try {
    const existing = await prisma.matchresults.findUnique({
      where: { id: matchResultId },
      include: {
        matches: {
          select: {
            turneu_id: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Match result not found." });
    }

    const access = await fetchManageableMatch(existing.ndeshja_id, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    await prisma.$transaction(async (tx) => {
      await revertBracketResultProgression(tx, existing.ndeshja_id);
      await tx.matchresults.delete({
        where: { id: matchResultId },
      });
    });

    // Recalculate standings for the tournament this match belongs to
    try {
      if (existing?.matches?.turneu_id) {
        await recalculateStandings(existing.matches.turneu_id);
      }
    } catch (err) {
      console.error("Standings recalculation failed", err);
    }

    res.json({ message: "Match result deleted successfully" });
  } catch (err) {
    res.status(err.status || 500).json({ error: getErrorMessage(err) });
  }
});

// Export router for use in server.js
export default router;
