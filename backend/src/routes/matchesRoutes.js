import express from "express";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";
import Joi from "joi";

const router = express.Router();
const DEFAULT_MATCH_DURATION_MINUTES = 60;

// Validation Schemas
const matchCreateSchema = Joi.object({
  turneu_id: Joi.number().integer().positive().required().messages({
    "number.base": "Tournament ID must be a valid number.",
    "number.positive": "Tournament ID must be positive.",
    "any.required": "Tournament ID is required.",
  }),
  ekipi_shtepiak_id: Joi.number().integer().positive().required().messages({
    "number.base": "Home team ID must be a valid number.",
    "number.positive": "Home team ID must be positive.",
    "any.required": "Home team ID is required.",
  }),
  ekipi_mysafir_id: Joi.number().integer().positive().required().messages({
    "number.base": "Away team ID must be a valid number.",
    "number.positive": "Away team ID must be positive.",
    "any.required": "Away team ID is required.",
  }),
  data_ndeshjes: Joi.date().required().messages({
    "date.base": "Match date must be a valid date.",
    "any.required": "Match date is required.",
  }),
  ora_fillimit: Joi.string().optional().allow("", null).pattern(/^\d{2}:\d{2}(:\d{2})?$/).messages({
    "string.pattern.base": "Match time must be in HH:MM or HH:MM:SS format.",
  }),
  fusha_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "Field ID must be a valid number.",
    "number.positive": "Field ID must be positive.",
  }),
  statusi: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Status must be a string.",
  }),
  faza: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Phase must be a string.",
  }),
});

const matchUpdateSchema = Joi.object({
  turneu_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Tournament ID must be a valid number.",
    "number.positive": "Tournament ID must be positive.",
  }),
  ekipi_shtepiak_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Home team ID must be a valid number.",
    "number.positive": "Home team ID must be positive.",
  }),
  ekipi_mysafir_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Away team ID must be a valid number.",
    "number.positive": "Away team ID must be positive.",
  }),
  data_ndeshjes: Joi.date().optional().messages({
    "date.base": "Match date must be a valid date.",
  }),
  ora_fillimit: Joi.string().optional().allow("", null).pattern(/^\d{2}:\d{2}(:\d{2})?$/).messages({
    "string.pattern.base": "Match time must be in HH:MM or HH:MM:SS format.",
  }),
  fusha_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "Field ID must be a valid number.",
    "number.positive": "Field ID must be positive.",
  }),
  statusi: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Status must be a string.",
  }),
  faza: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Phase must be a string.",
  }),
});

const matchScoreSchema = Joi.object({
  golat_shtepiak: Joi.number().integer().min(0).required().messages({
    "number.base": "Home score must be a valid number.",
    "number.min": "Home score cannot be negative.",
    "any.required": "Home score is required.",
  }),
  golat_mysafir: Joi.number().integer().min(0).required().messages({
    "number.base": "Away score must be a valid number.",
    "number.min": "Away score cannot be negative.",
    "any.required": "Away score is required.",
  }),
});

const matchStatusSchema = Joi.object({
  statusi: Joi.string()
    .valid("Planifikuar", "Live", "HalfTime", "Shtyrë", "Anuluar")
    .required()
    .messages({
      "any.only": "Status must be one of: Planifikuar, Live, HalfTime, Shtyrë, Anuluar.",
      "any.required": "Status is required.",
    }),
});

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function isLiveStatus(statusi) {
  return statusi === "Live";
}

function isPlayableStatus(statusi) {
  return statusi === "Live" || statusi === "HalfTime";
}

function getCurrentTimeValue() {
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);

  return new Date(`1970-01-01T${time}Z`);
}

function calculateWinner(match, result) {
  if (!result) return null;

  if (result.golat_shtepiak > result.golat_mysafir) {
    return match.ekipi_shtepiak_id;
  }

  if (result.golat_mysafir > result.golat_shtepiak) {
    return match.ekipi_mysafir_id;
  }

  return null;
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

async function userCanManageLiveMatch(matchId, user) {
  if (user?.is_admin) {
    return true;
  }

  if (user?.is_organizer) {
    return organizerOwnsMatch(matchId, user.id);
  }

  if (user?.is_referee) {
    const assignedMatch = await prisma.matches.findFirst({
      where: {
        id: matchId,
        matchreferees: {
          some: {
            referees: {
              user_id: user.id,
            },
          },
        },
      },
      select: { id: true },
    });

    return Boolean(assignedMatch);
  }

  return false;
}

function normalizeMatchEventType(eventType) {
  const types = {
    Goal: "Goal",
    Gol: "Goal",
    YellowCard: "YellowCard",
    "E verdhe": "YellowCard",
    RedCard: "RedCard",
    "E kuqe": "RedCard",
  };

  return types[eventType] || eventType;
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
    cards: match.matchevents.map((event) => {
      const eventType = normalizeMatchEventType(event.lloji);

      return {
        id: event.id,
        matchId: event.ndeshja_id,
        playerId: event.lojtari_id,
        playerName: event.players
          ? `${event.players.emri} ${event.players.mbiemri}`
          : null,
        teamId: event.ekipi_id,
        teamName: event.teams?.emertimi ?? null,
        card: eventType,
        eventType,
        rawEventType: event.lloji,
        minute: event.minuta,
        minuta: event.minuta,
        created_at: event.created_at,
      };
    }),
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
          { statusi: "HalfTime" },
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
  const page = req.query.page ? parsePositiveInt(req.query.page) : null;
  const limit = req.query.limit ? Math.max(1, parsePositiveInt(req.query.limit)) : null;
  const skip = page && limit ? (page - 1) * limit : undefined;
  const { statusi, search, turneu_id, team_id } = req.query;

  const where = {};

  if (statusi) {
    where.statusi = statusi;
  }

  if (turneu_id) {
    const tournamentId = parsePositiveInt(turneu_id);
    if (tournamentId) {
      where.turneu_id = tournamentId;
    }
  }

  if (team_id) {
    const teamId = parsePositiveInt(team_id);
    if (teamId) {
      where.OR = [
        { ekipi_shtepiak_id: teamId },
        { ekipi_mysafir_id: teamId },
      ];
    }
  }

  if (search) {
    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      where.OR = [
        ...(where.OR || []),
        {
          tournaments: {
            emertimi: { contains: normalizedSearch, mode: "insensitive" },
          },
        },
        {
          teams_matches_ekipi_shtepiak_idToteams: {
            emertimi: { contains: normalizedSearch, mode: "insensitive" },
          },
        },
        {
          teams_matches_ekipi_mysafir_idToteams: {
            emertimi: { contains: normalizedSearch, mode: "insensitive" },
          },
        },
        {
          statusi: { contains: normalizedSearch, mode: "insensitive" },
        },
        {
          faza: { contains: normalizedSearch, mode: "insensitive" },
        },
      ];
    }
  }

  if (req.user.is_organizer) {
    where.tournaments = {
      organizatori_id: req.user.id,
    };
  }

  if (req.user.is_referee) {
    where.matchreferees = {
      some: {
        referees: {
          user_id: req.user.id,
        },
      },
    };
  }

  try {
    let matches;

    if (page && limit) {
      const [total, rows] = await Promise.all([
        prisma.matches.count({ where }),
        prisma.matches.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: "asc" },
        }),
      ]);

      return res.json({
        data: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });
    }

    if (req.user.is_admin || req.user.is_organizer || req.user.is_referee) {
      matches = await prisma.matches.findMany({
        where,
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
  try {
    const { error, value } = matchCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
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
    } = value;

    if (ekipi_shtepiak_id === ekipi_mysafir_id) {
      return res.status(400).json({ error: "The teams cannot be the same" });
    }

    if (req.user.is_organizer) {
      const ownsTournament = await organizerOwnsTournament(turneu_id, req.user.id);
      if (!ownsTournament) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const matchValidation = await validateMatchTeamsForTournament({
      turneu_id,
      ekipi_shtepiak_id,
      ekipi_mysafir_id,
    });
    if (!matchValidation.ok) {
      return res.status(matchValidation.status).json({ error: matchValidation.error });
    }

    const created = await prisma.matches.create({
      data: {
        turneu_id,
        ekipi_shtepiak_id,
        ekipi_mysafir_id,
        data_ndeshjes,
        ora_fillimit: toMatchTimeValue(ora_fillimit),
        fusha_id: fusha_id || null,
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

  try {
    const { error, value } = matchUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
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
    } = value;

    if (ekipi_shtepiak_id && ekipi_mysafir_id && ekipi_shtepiak_id === ekipi_mysafir_id) {
      return res.status(400).json({ error: "The teams cannot be the same" });
    }

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

    const targetTournamentId = turneu_id ?? existing.turneu_id;
    const targetHomeTeamId = ekipi_shtepiak_id ?? existing.ekipi_shtepiak_id;
    const targetAwayTeamId = ekipi_mysafir_id ?? existing.ekipi_mysafir_id;

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

    const updateData = {
      ...(turneu_id !== undefined && { turneu_id }),
      ...(ekipi_shtepiak_id !== undefined && { ekipi_shtepiak_id }),
      ...(ekipi_mysafir_id !== undefined && { ekipi_mysafir_id }),
      ...(data_ndeshjes !== undefined && { data_ndeshjes }),
      ...(ora_fillimit !== undefined && { ora_fillimit: toMatchTimeValue(ora_fillimit) }),
      ...(fusha_id !== undefined && { fusha_id: fusha_id || null }),
      ...(statusi !== undefined && { statusi: statusi || null }),
      ...(faza !== undefined && { faza: faza || null }),
    };

    const updated = await prisma.matches.update({
      where: { id: matchId },
      data: updateData,
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

router.patch("/:id/status", protect, requireRole("is_admin", "is_organizer", "is_referee"), async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if (!matchId) {
    return res.status(400).json({ error: "Invalid match id" });
  }

  try {
    const { error, value } = matchStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const canManage = await userCanManageLiveMatch(matchId, req.user);
    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (
      req.user.is_referee &&
      !["Live", "HalfTime"].includes(value.statusi)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const match = await prisma.matches.findUnique({
      where: { id: matchId },
      select: { id: true, statusi: true },
    });

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    if (match.statusi === "P\u00ebrfunduar") {
      return res.status(400).json({ error: "Finished matches cannot be updated." });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const isStartingPeriod = value.statusi === "Live";
      const updatedMatch = await tx.matches.update({
        where: { id: matchId },
        data: {
          statusi: value.statusi,
          ...(isStartingPeriod && {
            data_ndeshjes: new Date(),
            ora_fillimit: getCurrentTimeValue(),
          }),
        },
      });

      if (value.statusi === "Live") {
        await tx.matchresults.upsert({
          where: { ndeshja_id: matchId },
          update: {},
          create: {
            ndeshja_id: matchId,
            golat_shtepiak: 0,
            golat_mysafir: 0,
          },
        });
      }

      return updatedMatch;
    });

    const io = req.app.get("io");

    io.emit("match-status-updated", {
      matchId,
      statusi: updated.statusi,
      status: updated.statusi,
    });

    if (updated.statusi === "Live") {
      io.emit("match_live", { matchId });
    }

    res.json({ message: "Match status updated successfully", match: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/finish", protect, requireRole("is_admin", "is_organizer", "is_referee"), async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if (!matchId) {
    return res.status(400).json({ error: "Invalid match id" });
  }

  try {
    const canManage = await userCanManageLiveMatch(matchId, req.user);
    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const match = await prisma.matches.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        statusi: true,
        ekipi_shtepiak_id: true,
        ekipi_mysafir_id: true,
        matchresults: true,
      },
    });

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    if (!isPlayableStatus(match.statusi)) {
      return res
        .status(400)
        .json({ error: "Only live or half-time matches can be finished." });
    }

    const currentResult =
      match.matchresults ??
      (await prisma.matchresults.create({
        data: {
          ndeshja_id: matchId,
          golat_shtepiak: 0,
          golat_mysafir: 0,
        },
      }));
    const winnerTeamId = calculateWinner(match, currentResult);

    const { updatedMatch, updatedResult } = await prisma.$transaction(async (tx) => {
      const result = await tx.matchresults.update({
        where: { ndeshja_id: matchId },
        data: {
          fitues_id: winnerTeamId,
        },
      });

      const finishedMatch = await tx.matches.update({
        where: { id: matchId },
        data: {
          statusi: "P\u00ebrfunduar",
        },
      });

      return {
        updatedMatch: finishedMatch,
        updatedResult: result,
      };
    });

    const io = req.app.get("io");

    io.emit("match_finished", { matchId });
    io.emit("match-finished", {
      matchId,
      winnerTeamId,
      homeScore: updatedResult.golat_shtepiak,
      awayScore: updatedResult.golat_mysafir,
    });
    io.emit("match-status-updated", {
      matchId,
      statusi: updatedMatch.statusi,
      status: updatedMatch.statusi,
    });

    res.json({
      message: "Match finished successfully",
      match: updatedMatch,
      result: updatedResult,
      winnerTeamId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/score", protect, requireRole("is_admin", "is_organizer", "is_referee"), async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if(!matchId){
    return res.status(400).json({ error: "Invalid match id" });
  }

  try {
    const { error, value } = matchScoreSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { golat_shtepiak, golat_mysafir } = value;

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

    if (!isLiveStatus(match.statusi)) {
      return res
        .status(400)
        .json({ error: "The match must be live before updating the score." });
    }

    const result = await prisma.matchresults.upsert({
      where: { ndeshja_id: matchId },
      update: {
        golat_shtepiak,
        golat_mysafir,
      },
      create: {
        ndeshja_id: matchId,
        golat_shtepiak,
        golat_mysafir,
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
