import express from "express";
import Joi from "joi";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();
const matchEventLifecycleRoutes = express.Router();

const TEAM_REQUIRED_EVENT_TYPES = new Set([
  "Goal",
  "YellowCard",
  "RedCard",
]);

const STORED_EVENT_TYPES = {
  Goal: "Gol",
  YellowCard: "E verdhe",
  RedCard: "E kuqe",
};

const API_EVENT_TYPES = {
  Goal: "Goal",
  Gol: "Goal",
  YellowCard: "YellowCard",
  "E verdhe": "YellowCard",
  RedCard: "RedCard",
  "E kuqe": "RedCard",
};

const eventPayloadSchema = Joi.object({
  ekipi_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "Team ID must be a valid number.",
    "number.positive": "Team ID must be positive.",
  }),
  lojtari_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "Player ID must be a valid number.",
    "number.positive": "Player ID must be positive.",
  }),
  lloji: Joi.string()
    .valid("Goal", "YellowCard", "RedCard")
    .optional()
    .messages({
      "any.only": "Event type must be one of: Goal, YellowCard, RedCard.",
    }),
  minuta: Joi.number().integer().min(0).optional().allow(null).messages({
    "number.base": "Minute must be a valid number.",
    "number.min": "Minute cannot be negative.",
  }),
  player_name: Joi.string().trim().max(120).optional().allow("", null).messages({
    "string.max": "Player name cannot be longer than 120 characters.",
  }),
  description: Joi.string().trim().max(500).optional().allow("", null).messages({
    "string.max": "Description cannot be longer than 500 characters.",
  }),
});

const eventCreateSchema = eventPayloadSchema.fork(["lloji"], (schema) =>
  schema.required().messages({ "any.required": "Event type is required." }),
);
const eventUpdateSchema = eventPayloadSchema.min(1);

const matchSelectForAccess = {
  id: true,
  turneu_id: true,
  ekipi_shtepiak_id: true,
  ekipi_mysafir_id: true,
  data_ndeshjes: true,
  ora_fillimit: true,
  kohezgjatja: true,
  statusi: true,
  tournaments: {
    select: {
      organizatori_id: true,
    },
  },
  matchreferees: {
    select: {
      referees: {
        select: {
          user_id: true,
        },
      },
    },
  },
};

const eventInclude = {
  teams: {
    select: {
      id: true,
      emertimi: true,
    },
  },
  players: {
    select: {
      id: true,
      emri: true,
      mbiemri: true,
    },
  },
  users: {
    select: {
      id: true,
      emri: true,
      mbiemri: true,
      email: true,
    },
  },
};

const eventIncludeWithMatch = {
  ...eventInclude,
  matches: {
    select: matchSelectForAccess,
  },
};

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizeOptionalText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function isFinishedStatus(statusi) {
  return String(statusi || "").toLowerCase().includes("rfunduar");
}

function isLiveStatus(statusi) {
  return statusi === "Live";
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

function calculateCurrentMinute(match) {
  const datePart = getDatePart(match.data_ndeshjes);
  if (!datePart) return null;

  const startTime = new Date(`${datePart}T${getTimePart(match.ora_fillimit)}`);
  if (Number.isNaN(startTime.getTime())) return null;

  const elapsedMinutes = Math.floor((Date.now() - startTime.getTime()) / 60000);
  const safeMinute = Math.max(0, elapsedMinutes);

  return Number.isInteger(match.kohezgjatja) && match.kohezgjatja > 0
    ? Math.min(safeMinute, match.kohezgjatja)
    : safeMinute;
}

function toStoredEventType(eventType) {
  return STORED_EVENT_TYPES[eventType] || eventType;
}

function toApiEventType(eventType) {
  return API_EVENT_TYPES[eventType] || eventType;
}

function getPlayerName(event) {
  if (event.players) {
    return `${event.players.emri} ${event.players.mbiemri}`.trim();
  }

  return event.player_name ?? null;
}

function formatUserName(user) {
  if (!user) return null;

  return `${user.emri || ""} ${user.mbiemri || ""}`.trim() || user.email || null;
}

function formatMatchEvent(event) {
  const eventType = toApiEventType(event.lloji);

  return {
    id: event.id,
    matchId: event.ndeshja_id,
    teamId: event.ekipi_id,
    teamName: event.teams?.emertimi ?? null,
    playerId: event.lojtari_id,
    playerName: getPlayerName(event),
    player_name: event.player_name ?? null,
    description: event.description ?? null,
    createdByUserId: event.created_by_user_id ?? null,
    createdByUserName: formatUserName(event.users),
    lloji: eventType,
    eventType,
    rawEventType: event.lloji,
    minute: event.minuta,
    minuta: event.minuta,
    created_at: event.created_at,
  };
}

async function getMatchForAccess(matchId) {
  return prisma.matches.findUnique({
    where: { id: matchId },
    select: matchSelectForAccess,
  });
}

function canAccessMatch(user, match) {
  if (user?.is_admin) return true;

  if (user?.is_organizer) {
    return match.tournaments?.organizatori_id === user.id;
  }

  if (user?.is_referee) {
    return match.matchreferees.some(
      (assignment) => assignment.referees?.user_id === user.id,
    );
  }

  return false;
}

function validateTeamForEvent(match, eventType, teamId) {
  if (TEAM_REQUIRED_EVENT_TYPES.has(eventType) && !teamId) {
    return `${eventType} events require a valid team.`;
  }

  if (
    teamId &&
    teamId !== match.ekipi_shtepiak_id &&
    teamId !== match.ekipi_mysafir_id
  ) {
    return "Event team must be one of the match teams.";
  }

  return null;
}

async function validatePlayerForEvent(match, teamId, playerId) {
  if (!playerId) {
    return "Goal and card events require a selected player.";
  }

  const player = await prisma.players.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      ekipi_id: true,
    },
  });

  if (!player) {
    return "Selected player does not exist.";
  }

  if (
    player.ekipi_id !== match.ekipi_shtepiak_id &&
    player.ekipi_id !== match.ekipi_mysafir_id
  ) {
    return "Selected player does not belong to either match team.";
  }

  if (teamId && player.ekipi_id !== teamId) {
    return "Selected player does not belong to the selected team.";
  }

  return null;
}

function getGoalSide(eventType, teamId, match) {
  if (toApiEventType(eventType) !== "Goal") return null;

  if (teamId === match.ekipi_shtepiak_id) return "home";
  if (teamId === match.ekipi_mysafir_id) return "away";

  return null;
}

async function updateScoreForGoalChange(tx, match, previousSide, nextSide) {
  if (previousSide === nextSide) return null;

  const existingResult = await tx.matchresults.findUnique({
    where: { ndeshja_id: match.id },
  });

  let homeScore = existingResult?.golat_shtepiak ?? 0;
  let awayScore = existingResult?.golat_mysafir ?? 0;

  if (previousSide === "home") homeScore = Math.max(0, homeScore - 1);
  if (previousSide === "away") awayScore = Math.max(0, awayScore - 1);
  if (nextSide === "home") homeScore += 1;
  if (nextSide === "away") awayScore += 1;

  if (!existingResult && homeScore === 0 && awayScore === 0) {
    return null;
  }

  return tx.matchresults.upsert({
    where: { ndeshja_id: match.id },
    update: {
      golat_shtepiak: homeScore,
      golat_mysafir: awayScore,
    },
    create: {
      ndeshja_id: match.id,
      golat_shtepiak: homeScore,
      golat_mysafir: awayScore,
    },
  });
}

function emitScoreUpdated(io, matchId, result) {
  if (!result) return;

  const payload = {
    matchId,
    homeScore: result.golat_shtepiak,
    awayScore: result.golat_mysafir,
  };

  io.emit("score-updated", payload);
  io.emit("score_update", payload);
}

function buildEventUpdateData(value) {
  return {
    ...(value.lloji !== undefined && { lloji: toStoredEventType(value.lloji) }),
    ...(value.ekipi_id !== undefined && { ekipi_id: value.ekipi_id }),
    ...(value.lojtari_id !== undefined && { lojtari_id: value.lojtari_id }),
    ...(value.minuta !== undefined && { minuta: value.minuta }),
    ...(value.player_name !== undefined && {
      player_name: normalizeOptionalText(value.player_name),
    }),
    ...(value.description !== undefined && {
      description: normalizeOptionalText(value.description),
    }),
  };
}

router.get(
  "/:id/events",
  protect,
  requireRole("is_admin", "is_organizer", "is_referee"),
  async (req, res) => {
    const matchId = parsePositiveInt(req.params.id);
    if (!matchId) {
      return res.status(400).json({ error: "Invalid match id" });
    }

    try {
      const match = await getMatchForAccess(matchId);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      if (!canAccessMatch(req.user, match)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const events = await prisma.matchevents.findMany({
        where: { ndeshja_id: matchId },
        include: eventInclude,
        orderBy: [{ minuta: "asc" }, { id: "asc" }],
      });

      res.json(events.map(formatMatchEvent));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/:id/events",
  protect,
  requireRole("is_admin", "is_organizer", "is_referee"),
  async (req, res) => {
    const matchId = parsePositiveInt(req.params.id);
    if (!matchId) {
      return res.status(400).json({ error: "Invalid match id" });
    }

    const { error, value } = eventCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { ekipi_id = null, lojtari_id = null, lloji } = value;

    try {
      const match = await getMatchForAccess(matchId);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      if (!canAccessMatch(req.user, match)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (isFinishedStatus(match.statusi)) {
        return res
          .status(400)
          .json({ error: "Cannot add events to a finished match." });
      }

      if (!isLiveStatus(match.statusi)) {
        return res
          .status(400)
          .json({ error: "The match must be live before adding events." });
      }

      const teamError = validateTeamForEvent(match, lloji, ekipi_id);
      if (teamError) {
        return res.status(400).json({ error: teamError });
      }

      const playerError = await validatePlayerForEvent(
        match,
        ekipi_id,
        lojtari_id,
      );
      if (playerError) {
        return res.status(400).json({ error: playerError });
      }

      const goalSide = getGoalSide(lloji, ekipi_id, match);
      const eventMinute =
        value.minuta === null || value.minuta === undefined
          ? calculateCurrentMinute(match)
          : value.minuta;

      const { event, result } = await prisma.$transaction(async (tx) => {
        const createdEvent = await tx.matchevents.create({
          data: {
            ndeshja_id: matchId,
            ekipi_id,
            lojtari_id,
            lloji: toStoredEventType(lloji),
            minuta: eventMinute,
            player_name: normalizeOptionalText(value.player_name),
            description: normalizeOptionalText(value.description),
            created_by_user_id: req.user.id,
          },
          include: eventInclude,
        });

        const updatedResult = await updateScoreForGoalChange(
          tx,
          match,
          null,
          goalSide,
        );

        return {
          event: createdEvent,
          result: updatedResult,
        };
      });

      const formattedEvent = formatMatchEvent(event);
      const io = req.app.get("io");

      io.emit("match-event-created", formattedEvent);
      emitScoreUpdated(io, matchId, result);

      res.status(201).json({
        event: formattedEvent,
        ...(result && {
          score: {
            golat_shtepiak: result.golat_shtepiak,
            golat_mysafir: result.golat_mysafir,
          },
        }),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

matchEventLifecycleRoutes.put(
  "/:eventId",
  protect,
  requireRole("is_admin", "is_organizer", "is_referee"),
  async (req, res) => {
    const eventId = parsePositiveInt(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const { error, value } = eventUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    try {
      const existingEvent = await prisma.matchevents.findUnique({
        where: { id: eventId },
        include: eventIncludeWithMatch,
      });

      if (!existingEvent) {
        return res.status(404).json({ error: "Match event not found" });
      }

      const match = existingEvent.matches;
      if (!canAccessMatch(req.user, match)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (isFinishedStatus(match.statusi)) {
        return res
          .status(400)
          .json({ error: "Cannot update events for a finished match." });
      }

      const nextEventType = value.lloji ?? toApiEventType(existingEvent.lloji);
      const nextTeamId =
        value.ekipi_id !== undefined ? value.ekipi_id : existingEvent.ekipi_id;
      const nextPlayerId =
        value.lojtari_id !== undefined
          ? value.lojtari_id
          : existingEvent.lojtari_id;

      const teamError = validateTeamForEvent(match, nextEventType, nextTeamId);
      if (teamError) {
        return res.status(400).json({ error: teamError });
      }

      const playerError = await validatePlayerForEvent(
        match,
        nextTeamId,
        nextPlayerId,
      );
      if (playerError) {
        return res.status(400).json({ error: playerError });
      }

      const previousGoalSide = getGoalSide(
        existingEvent.lloji,
        existingEvent.ekipi_id,
        match,
      );
      const nextGoalSide = getGoalSide(nextEventType, nextTeamId, match);

      const { event, result } = await prisma.$transaction(async (tx) => {
        const updatedEvent = await tx.matchevents.update({
          where: { id: eventId },
          data: buildEventUpdateData(value),
          include: eventInclude,
        });

        const updatedResult = await updateScoreForGoalChange(
          tx,
          match,
          previousGoalSide,
          nextGoalSide,
        );

        return {
          event: updatedEvent,
          result: updatedResult,
        };
      });

      const formattedEvent = formatMatchEvent(event);
      const io = req.app.get("io");

      io.emit("match-event-updated", formattedEvent);
      emitScoreUpdated(io, match.id, result);

      res.json({
        event: formattedEvent,
        ...(result && {
          score: {
            golat_shtepiak: result.golat_shtepiak,
            golat_mysafir: result.golat_mysafir,
          },
        }),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

matchEventLifecycleRoutes.delete(
  "/:eventId",
  protect,
  requireRole("is_admin", "is_organizer", "is_referee"),
  async (req, res) => {
    const eventId = parsePositiveInt(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    try {
      const existingEvent = await prisma.matchevents.findUnique({
        where: { id: eventId },
        include: eventIncludeWithMatch,
      });

      if (!existingEvent) {
        return res.status(404).json({ error: "Match event not found" });
      }

      const match = existingEvent.matches;
      if (!canAccessMatch(req.user, match)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (isFinishedStatus(match.statusi)) {
        return res
          .status(400)
          .json({ error: "Cannot delete events for a finished match." });
      }

      const previousGoalSide = getGoalSide(
        existingEvent.lloji,
        existingEvent.ekipi_id,
        match,
      );

      const result = await prisma.$transaction(async (tx) => {
        await tx.matchevents.delete({
          where: { id: eventId },
        });

        return updateScoreForGoalChange(tx, match, previousGoalSide, null);
      });

      const io = req.app.get("io");
      const payload = {
        eventId,
        matchId: match.id,
      };

      io.emit("match-event-deleted", payload);
      emitScoreUpdated(io, match.id, result);

      res.json({
        message: "Match event deleted successfully",
        deleted: payload,
        ...(result && {
          score: {
            golat_shtepiak: result.golat_shtepiak,
            golat_mysafir: result.golat_mysafir,
          },
        }),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

export { matchEventLifecycleRoutes };
export default router;
