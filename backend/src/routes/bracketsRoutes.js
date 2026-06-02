import express from "express";
import Joi from "joi";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";
import {
  advanceBracketWinner,
  ensureLinkedMatchForBracketNode,
  getRoundLabel,
  parseMatchDate,
  parseMatchTime,
} from "../services/bracketService.js";

const router = express.Router();

const bracketParamSchema = Joi.object({
  turneuId: Joi.number().integer().positive().required().messages({
    "number.base": "Tournament ID must be a valid number.",
    "number.positive": "Tournament ID must be a positive integer.",
    "any.required": "Tournament ID is required.",
  }),
});

const bracketGenerateSchema = Joi.object({
  team_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(2)
    .required()
    .messages({
      "array.min": "At least two teams are required.",
      "any.required": "Seeded team IDs are required.",
    }),
  data_ndeshjes: Joi.alternatives().try(Joi.date(), Joi.string().allow("")).optional().allow(null),
  start_date: Joi.alternatives().try(Joi.date(), Joi.string().allow("")).optional().allow(null),
  ora_fillimit: Joi.string()
    .pattern(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .allow("", null)
    .messages({
      "string.pattern.base": "Start time must be in HH:MM or HH:MM:SS format.",
    }),
  start_time: Joi.string()
    .pattern(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .allow("", null)
    .messages({
      "string.pattern.base": "Start time must be in HH:MM or HH:MM:SS format.",
    }),
  fusha_id: Joi.number().integer().positive().optional().allow(null, "").messages({
    "number.base": "Venue ID must be a valid number.",
    "number.positive": "Venue ID must be a positive integer.",
  }),
});

const bracketMatchParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Bracket match ID must be a valid number.",
    "number.positive": "Bracket match ID must be a positive integer.",
    "any.required": "Bracket match ID is required.",
  }),
});

const bracketMatchScheduleSchema = Joi.object({
  data_ndeshjes: Joi.alternatives()
    .try(Joi.date(), Joi.string().allow(""))
    .optional()
    .allow(null),
  ora_fillimit: Joi.string()
    .pattern(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .allow("", null)
    .messages({
      "string.pattern.base": "Start time must be in HH:MM or HH:MM:SS format.",
    }),
  fusha_id: Joi.number().integer().positive().optional().allow(null, "").messages({
    "number.base": "Venue ID must be a valid number.",
    "number.positive": "Venue ID must be a positive integer.",
  }),
});

const bracketInclude = {
  teams_bracketmatches_ekipi_shtepiak_idToteams: {
    select: { id: true, emertimi: true, logoja: true },
  },
  teams_bracketmatches_ekipi_mysafir_idToteams: {
    select: { id: true, emertimi: true, logoja: true },
  },
  teams_bracketmatches_fitues_idToteams: {
    select: { id: true, emertimi: true, logoja: true },
  },
  matches: {
    select: {
      id: true,
      statusi: true,
      data_ndeshjes: true,
      ora_fillimit: true,
      fusha_id: true,
      matchresults: {
        select: {
          id: true,
          golat_shtepiak: true,
          golat_mysafir: true,
          fitues_id: true,
        },
      },
    },
  },
  venues: {
    select: { id: true, emertimi: true, qyteti: true },
  },
};

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function nextPowerOfTwo(value) {
  // Knockout brackets need a power-of-two size; missing teams become byes.
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function buildSeedOrder(size) {
  // Places high and low seeds apart so top seeds do not meet in round one.
  if (size === 1) return [1];

  const previous = buildSeedOrder(size / 2);
  return previous.flatMap((seed) => [seed, size + 1 - seed]);
}

function getSlotField(slot) {
  return slot === "home" ? "ekipi_shtepiak_id" : "ekipi_mysafir_id";
}

function normalizeTeamIds(teamIds) {
  const normalized = teamIds.map((id) => Number(id));
  const unique = new Set(normalized);

  if (unique.size !== normalized.length) {
    return { error: "Seed list cannot contain duplicate teams." };
  }

  return { value: normalized };
}

function getBracketTeam(team) {
  return team
    ? {
        id: team.id,
        emertimi: team.emertimi,
        logoja: team.logoja,
      }
    : null;
}

function formatBracketMatch(match, totalRounds) {
  const result = match.matches?.matchresults ?? null;

  return {
    id: match.id,
    turneu_id: match.turneu_id,
    round_number: match.round_number,
    round_label: getRoundLabel(match.round_number, totalRounds),
    position: match.position,
    ekipi_shtepiak_id: match.ekipi_shtepiak_id,
    ekipi_mysafir_id: match.ekipi_mysafir_id,
    fitues_id: match.fitues_id,
    ndeshja_id: match.ndeshja_id,
    next_bracket_match_id: match.next_bracket_match_id,
    next_slot: match.next_slot,
    data_ndeshjes: match.data_ndeshjes,
    ora_fillimit: match.ora_fillimit,
    fusha_id: match.fusha_id,
    home_team: getBracketTeam(
      match.teams_bracketmatches_ekipi_shtepiak_idToteams,
    ),
    away_team: getBracketTeam(
      match.teams_bracketmatches_ekipi_mysafir_idToteams,
    ),
    winner: getBracketTeam(match.teams_bracketmatches_fitues_idToteams),
    venue: match.venues
      ? {
          id: match.venues.id,
          emertimi: match.venues.emertimi,
          qyteti: match.venues.qyteti,
        }
      : null,
    linked_match: match.matches
      ? {
          id: match.matches.id,
          statusi: match.matches.statusi,
          data_ndeshjes: match.matches.data_ndeshjes,
          ora_fillimit: match.matches.ora_fillimit,
          fusha_id: match.matches.fusha_id,
          result,
        }
      : null,
    score: result
      ? {
          golat_shtepiak: result.golat_shtepiak,
          golat_mysafir: result.golat_mysafir,
        }
      : null,
  };
}

function buildBracketResponse(tournament, matches) {
  const totalRounds = Math.max(
    1,
    ...matches.map((match) => match.round_number),
  );
  const formattedMatches = matches.map((match) =>
    formatBracketMatch(match, totalRounds),
  );
  const rounds = Array.from({ length: totalRounds }, (_, index) => {
    const roundNumber = index + 1;
    return {
      round_number: roundNumber,
      label: getRoundLabel(roundNumber, totalRounds),
      matches: formattedMatches.filter(
        (match) => match.round_number === roundNumber,
      ),
    };
  });
  const finalMatch = formattedMatches.find(
    (match) => match.round_number === totalRounds,
  );

  return {
    tournament,
    rounds,
    matches: formattedMatches,
    champion: finalMatch?.winner ?? null,
  };
}

async function ensureCanAccessTournament(turneuId, user) {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: turneuId },
    include: {
      sports: {
        select: { id: true, emertimi: true, kohezgjatja_default: true },
      },
    },
  });

  if (!tournament) {
    return { ok: false, status: 404, error: "Tournament not found." };
  }

  if (user?.is_admin) {
    return { ok: true, tournament };
  }

  if (user?.is_organizer && tournament.organizatori_id === user.id) {
    return { ok: true, tournament };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

async function ensureCanAccessBracketMatch(bracketMatchId, user) {
  const bracketMatch = await prisma.bracketmatches.findUnique({
    where: { id: bracketMatchId },
    include: {
      tournaments: {
        include: {
          sports: {
            select: { id: true, emertimi: true, kohezgjatja_default: true },
          },
        },
      },
      matches: {
        select: {
          id: true,
          statusi: true,
          matchresults: { select: { id: true } },
        },
      },
    },
  });

  if (!bracketMatch) {
    return { ok: false, status: 404, error: "Bracket match not found." };
  }

  if (user?.is_admin) {
    return { ok: true, bracketMatch };
  }

  if (
    user?.is_organizer &&
    bracketMatch.tournaments?.organizatori_id === user.id
  ) {
    return { ok: true, bracketMatch };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

async function fetchBracketPayload(turneuId, { user = null, isPublic = false } = {}) {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: turneuId },
    include: {
      sports: {
        select: { id: true, emertimi: true, kohezgjatja_default: true },
      },
    },
  });

  if (!tournament) {
    return { status: 404, error: "Tournament not found." };
  }

  if (!isPublic) {
    const access = await ensureCanAccessTournament(turneuId, user);
    if (!access.ok) {
      return { status: access.status, error: access.error };
    }
  }

  const matches = await prisma.bracketmatches.findMany({
    where: { turneu_id: turneuId },
    include: bracketInclude,
    orderBy: [{ round_number: "asc" }, { position: "asc" }],
  });

  return {
    status: 200,
    payload: buildBracketResponse(tournament, matches),
  };
}

async function fetchApprovedRegistrations(turneuId) {
  return prisma.tournamentregistrations.findMany({
    where: {
      turneu_id: turneuId,
      statusi: "Aprovuar",
    },
    include: {
      teams: {
        select: { id: true, emertimi: true, sporti_id: true, logoja: true },
      },
    },
    orderBy: [{ data_regjistrimit: "asc" }, { id: "asc" }],
  });
}

async function hasBracketProgress(tx, turneuId) {
  const nodes = await tx.bracketmatches.findMany({
    where: { turneu_id: turneuId },
    include: {
      matches: {
        select: {
          id: true,
          statusi: true,
          matchresults: { select: { id: true } },
        },
      },
    },
  });

  return nodes.some(
    (node) =>
      node.matches?.matchresults ||
      (node.matches && node.matches.statusi !== "Planifikuar"),
  );
}

router.get("/public/tournaments", async (req, res) => {
  try {
    const tournaments = await prisma.tournaments.findMany({
      include: {
        sports: { select: { emertimi: true } },
        _count: { select: { bracketmatches: true } },
      },
      orderBy: { id: "asc" },
    });

    res.json(
      tournaments.map((tournament) => ({
        id: tournament.id,
        emertimi: tournament.emertimi,
        sporti_id: tournament.sporti_id,
        sport_emri: tournament.sports?.emertimi ?? null,
        statusi: tournament.statusi,
        data_fillimit: tournament.data_fillimit,
        data_perfundimit: tournament.data_perfundimit,
        has_bracket: tournament._count.bracketmatches > 0,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/public/tournament/:turneuId", async (req, res) => {
  const { error, value } = bracketParamSchema.validate({
    turneuId: req.params.turneuId,
  });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await fetchBracketPayload(value.turneuId, { isPublic: true });
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tournament/:turneuId", protect, async (req, res) => {
  const { error, value } = bracketParamSchema.validate({
    turneuId: req.params.turneuId,
  });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await fetchBracketPayload(value.turneuId, {
      user: req.user,
    });
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch(
  "/match/:id/schedule",
  protect,
  requireRole("is_admin", "is_organizer"),
  async (req, res) => {
    const { error: paramError, value: paramValue } =
      bracketMatchParamSchema.validate({
        id: req.params.id,
      });
    if (paramError) {
      return res.status(400).json({ error: paramError.details[0].message });
    }

    const { error: bodyError, value: bodyValue } =
      bracketMatchScheduleSchema.validate(req.body);
    if (bodyError) {
      return res.status(400).json({ error: bodyError.details[0].message });
    }

    try {
      const access = await ensureCanAccessBracketMatch(paramValue.id, req.user);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const { bracketMatch } = access;
      if (
        bracketMatch.matches &&
        (bracketMatch.matches.statusi !== "Planifikuar" ||
          bracketMatch.matches.matchresults)
      ) {
        return res.status(400).json({
          error:
            "Scheduled bracket matches cannot be changed after they start or have results.",
        });
      }

      const scheduleDate =
        bodyValue.data_ndeshjes === undefined
          ? bracketMatch.data_ndeshjes
          : parseMatchDate(bodyValue.data_ndeshjes);
      const scheduleTime =
        bodyValue.ora_fillimit === undefined
          ? bracketMatch.ora_fillimit
          : parseMatchTime(bodyValue.ora_fillimit);
      const venueId =
        bodyValue.fusha_id === undefined
          ? bracketMatch.fusha_id
          : parsePositiveInteger(bodyValue.fusha_id) || null;
      const totalRounds = await prisma.bracketmatches
        .aggregate({
          where: { turneu_id: bracketMatch.turneu_id },
          _max: { round_number: true },
        })
        .then((result) => result._max.round_number || 1);

      await prisma.$transaction(async (tx) => {
        await tx.bracketmatches.update({
          where: { id: bracketMatch.id },
          data: {
            data_ndeshjes: scheduleDate,
            ora_fillimit: scheduleTime,
            fusha_id: venueId,
          },
        });

        if (bracketMatch.ndeshja_id) {
          await tx.matches.update({
            where: { id: bracketMatch.ndeshja_id },
            data: {
              data_ndeshjes:
                scheduleDate ||
                parseMatchDate(bracketMatch.tournaments.data_fillimit),
              ora_fillimit: scheduleTime,
              fusha_id: venueId,
              faza: getRoundLabel(bracketMatch.round_number, totalRounds),
            },
          });
        }
      });

      const result = await fetchBracketPayload(bracketMatch.turneu_id, {
        user: req.user,
      });

      res.json(result.payload);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
);

router.post(
  "/tournament/:turneuId/generate",
  protect,
  requireRole("is_admin", "is_organizer"),
  async (req, res) => {
    const { error: paramError, value: paramValue } = bracketParamSchema.validate({
      turneuId: req.params.turneuId,
    });
    if (paramError) {
      return res.status(400).json({ error: paramError.details[0].message });
    }

    const { error: bodyError, value: bodyValue } =
      bracketGenerateSchema.validate(req.body);
    if (bodyError) {
      return res.status(400).json({ error: bodyError.details[0].message });
    }

    const seedValidation = normalizeTeamIds(bodyValue.team_ids);
    if (seedValidation.error) {
      return res.status(400).json({ error: seedValidation.error });
    }

    const turneuId = paramValue.turneuId;
    const seededTeamIds = seedValidation.value;

    try {
      const access = await ensureCanAccessTournament(turneuId, req.user);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const existingCount = await prisma.bracketmatches.count({
        where: { turneu_id: turneuId },
      });
      if (existingCount > 0) {
        return res.status(409).json({
          error: "This tournament already has a generated bracket.",
        });
      }

      const approvedRegistrations = await fetchApprovedRegistrations(turneuId);
      if (approvedRegistrations.length < 2) {
        return res.status(400).json({
          error: "At least two approved teams are required to generate a bracket.",
        });
      }

      const approvedTeamsById = new Map(
        approvedRegistrations.map((registration) => [
          registration.ekipi_id,
          registration.teams,
        ]),
      );
      const invalidTeamIds = seededTeamIds.filter(
        (teamId) => !approvedTeamsById.has(teamId),
      );
      if (invalidTeamIds.length > 0) {
        return res.status(400).json({
          error:
            "Every seeded team must be approved for this tournament before generating the bracket.",
        });
      }

      const scheduleDate = parseMatchDate(access.tournament.data_fillimit);
      const scheduleTime = null;
      const venueId = null;
      // Seed slots are expanded to the bracket size; empty slots are treated as byes.
      const bracketSize = nextPowerOfTwo(seededTeamIds.length);
      const totalRounds = Math.log2(bracketSize);
      const seedOrder = buildSeedOrder(bracketSize);
      const bracketSlots = seedOrder.map((seedNumber) => {
        const teamId = seededTeamIds[seedNumber - 1];
        return teamId ? approvedTeamsById.get(teamId) : null;
      });

      await prisma.$transaction(async (tx) => {
        const createdByRound = new Map();

        for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
          const matchCount = bracketSize / 2 ** roundNumber;
          const roundNodes = [];

          for (let position = 1; position <= matchCount; position += 1) {
            const slotIndex = (position - 1) * 2;
            const homeTeam = roundNumber === 1 ? bracketSlots[slotIndex] : null;
            const awayTeam =
              roundNumber === 1 ? bracketSlots[slotIndex + 1] : null;

            const node = await tx.bracketmatches.create({
              data: {
                turneu_id: turneuId,
                round_number: roundNumber,
                position,
                ekipi_shtepiak_id: homeTeam?.id ?? null,
                ekipi_mysafir_id: awayTeam?.id ?? null,
                data_ndeshjes: scheduleDate,
                ora_fillimit: scheduleTime,
                fusha_id: venueId,
              },
            });
            roundNodes.push(node);
          }

          createdByRound.set(roundNumber, roundNodes);
        }

        // Every node points to the next node and the exact slot its winner should fill.
        for (let roundNumber = 1; roundNumber < totalRounds; roundNumber += 1) {
          const currentRound = createdByRound.get(roundNumber);
          const nextRound = createdByRound.get(roundNumber + 1);

          for (const node of currentRound) {
            const nextPosition = Math.ceil(node.position / 2);
            const nextNode = nextRound[nextPosition - 1];
            const nextSlot = node.position % 2 === 1 ? "home" : "away";

            const updatedNode = await tx.bracketmatches.update({
              where: { id: node.id },
              data: {
                next_bracket_match_id: nextNode.id,
                next_slot: nextSlot,
              },
            });

            Object.assign(node, updatedNode);
          }
        }

        const tournament = access.tournament;
        // First-round byes advance immediately; real pairings get linked matches.
        for (const node of createdByRound.get(1)) {
          const participantIds = [
            node.ekipi_shtepiak_id,
            node.ekipi_mysafir_id,
          ].filter(Boolean);

          if (participantIds.length === 1) {
            await advanceBracketWinner(tx, node, participantIds[0]);
            continue;
          }

          if (participantIds.length === 2) {
            await ensureLinkedMatchForBracketNode(
              tx,
              node,
              tournament,
              totalRounds,
            );
          }
        }

        for (let roundNumber = 2; roundNumber <= totalRounds; roundNumber += 1) {
          const nodes = await tx.bracketmatches.findMany({
            where: { turneu_id: turneuId, round_number: roundNumber },
            orderBy: { position: "asc" },
          });

          for (const node of nodes) {
            await ensureLinkedMatchForBracketNode(
              tx,
              node,
              tournament,
              totalRounds,
            );
          }
        }
      });

      const result = await fetchBracketPayload(turneuId, { user: req.user });
      res.status(201).json(result.payload);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
);

router.delete(
  "/tournament/:turneuId",
  protect,
  requireRole("is_admin", "is_organizer"),
  async (req, res) => {
    const { error, value } = bracketParamSchema.validate({
      turneuId: req.params.turneuId,
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const turneuId = value.turneuId;

    try {
      const access = await ensureCanAccessTournament(turneuId, req.user);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const existingCount = await prisma.bracketmatches.count({
        where: { turneu_id: turneuId },
      });
      if (existingCount === 0) {
        return res.status(404).json({ error: "Bracket not found." });
      }

      const deletedMatchCount = await prisma.$transaction(async (tx) => {
        const progressExists = await hasBracketProgress(tx, turneuId);
        if (progressExists) {
          throw new Error(
            "Bracket cannot be reset after match progress or results exist.",
          );
        }

        const bracketNodes = await tx.bracketmatches.findMany({
          where: { turneu_id: turneuId },
          select: { ndeshja_id: true },
        });
        const matchIds = bracketNodes
          .map((node) => node.ndeshja_id)
          .filter(Boolean);

        await tx.bracketmatches.updateMany({
          where: { turneu_id: turneuId },
          data: { ndeshja_id: null },
        });

        if (matchIds.length > 0) {
          await tx.matches.deleteMany({
            where: { id: { in: matchIds } },
          });
        }

        await tx.bracketmatches.deleteMany({
          where: { turneu_id: turneuId },
        });

        return matchIds.length;
      });

      res.json({
        message: "Bracket reset successfully.",
        deleted_matches: deletedMatchCount,
      });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },
);

export default router;
