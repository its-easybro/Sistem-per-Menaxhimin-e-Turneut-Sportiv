import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import Joi from "joi";

const router = express.Router();

// Posible types of tournaments
const tournamentTypeOptions = [
  "Grup + Eliminim",
  "Vet\u00ebm Grup",
  "Vet\u00ebm Eliminim",
  "Liga",
];

// Posible statuses of tournaments
const tournamentStatusOptions = [
  "Regjistrimi",
  "Aktiv",
  "P\u00ebrfunduar",
  "Anuluar",
];

const normalizedTournamentTypeMap = {};

const normalizedTournamentStatusMap = {};

function normalizeTournamentType(value) {
  return value;
}

function normalizeTournamentStatus(value) {
  return value;
}

const tournamentParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Tournament ID must be a valid number.",
    "number.positive": "Tournament ID must be a positive integer.",
    "any.required": "Tournament ID is required.",
  }),
});

const tournamentCreateSchema = Joi.object({
  emertimi: Joi.string().trim().min(1).required().messages({
    "string.empty": "The tournament name is required.",
    "any.required": "The tournament name is required.",
  }),
  sporti_id: Joi.number().integer().positive().required().messages({
    "number.base": "The sport ID is invalid.",
    "number.positive": "The sport ID must be a positive integer.",
    "any.required": "The sport ID is required.",
  }),
  lloji: Joi.string()
    .valid(...tournamentTypeOptions)
    .required()
    .messages({
      "any.only": `The type must be one of: ${tournamentTypeOptions.join(", ")}.`,
      "any.required": "Tournament type is required.",
    }),
  data_fillimit: Joi.date().iso().required().messages({
    "date.base": "The tournament dates are invalid.",
    "date.iso": "The tournament dates are invalid.",
    "any.required": "The start date is required.",
  }),
  data_perfundimit: Joi.date().iso().required().messages({
    "date.base": "The tournament dates are invalid.",
    "date.iso": "The tournament dates are invalid.",
    "any.required": "The end date is required.",
  }),
  lokacioni: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "Location must be a valid string.",
  }),
  organizatori_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
    .messages({
      "number.base": "The organizer ID is invalid.",
      "number.positive": "The organizer ID must be a positive integer.",
    }),
  cmimi_regjistrimit: Joi.number().min(0).optional().default(0).messages({
    "number.base": "The registration price must be a non-negative number.",
    "number.min": "The registration price must be a non-negative number.",
  }),
  statusi: Joi.string()
    .valid(...tournamentStatusOptions)
    .optional()
    .default("Regjistrimi")
    .messages({
      "any.only": `The status must be one of: ${tournamentStatusOptions.join(", ")}.`,
    }),
  pershkrimi: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "Description must be a valid string.",
  }),
}).external(async (value) => {
  if (new Date(value.data_perfundimit) <= new Date(value.data_fillimit)) {
    throw new Error("The end date must be after the start date.");
  }
});

const tournamentUpdateSchema = Joi.object({
  emertimi: Joi.string().trim().min(1).optional().messages({
    "string.empty": "The tournament name cannot be empty.",
  }),
  sporti_id: Joi.number().integer().positive().optional().messages({
    "number.base": "The sport ID is invalid.",
    "number.positive": "The sport ID must be a positive integer.",
  }),
  lloji: Joi.string()
    .valid(...tournamentTypeOptions)
    .optional()
    .messages({
      "any.only": `The type must be one of: ${tournamentTypeOptions.join(", ")}.`,
    }),
  data_fillimit: Joi.date().iso().optional().messages({
    "date.base": "The tournament dates are invalid.",
    "date.iso": "The tournament dates are invalid.",
  }),
  data_perfundimit: Joi.date().iso().optional().messages({
    "date.base": "The tournament dates are invalid.",
    "date.iso": "The tournament dates are invalid.",
  }),
  lokacioni: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "Location must be a valid string.",
  }),
  organizatori_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
    .messages({
      "number.base": "The organizer ID is invalid.",
      "number.positive": "The organizer ID must be a positive integer.",
    }),
  cmimi_regjistrimit: Joi.number().min(0).optional().messages({
    "number.base": "The registration price must be a non-negative number.",
    "number.min": "The registration price must be a non-negative number.",
  }),
  statusi: Joi.string()
    .valid(...tournamentStatusOptions)
    .optional()
    .messages({
      "any.only": `The status must be one of: ${tournamentStatusOptions.join(", ")}.`,
    }),
  pershkrimi: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "Description must be a valid string.",
  }),
}).external(async (value) => {
  if (
    value.data_perfundimit &&
    value.data_fillimit &&
    new Date(value.data_perfundimit) <= new Date(value.data_fillimit)
  ) {
    throw new Error("The end date must be after the start date.");
  }
});

function handleTournamentError(err, res) {
  if (
    err.message === "Organizer not found" ||
    err.message === "Only users or organizers can be assigned to a tournament"
  ) {
    return res.status(400).json({ error: err.message });
  }

  if (err?.code === "P2003") {
    return res
      .status(400)
      .json({ error: "The selected sport or organizer does not exist." });
  }

  if (err?.code === "P2004") {
    return res.status(400).json({
      error: "The tournament data does not meet the database constraints.",
    });
  }

  if (err?.code === "P2025") {
    return res
      .status(404)
      .json({ error: "Tournament or organizer not found." });
  }

  return res.status(500).json({ error: err.message });
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseTournamentDate(value) {
  if (!value) {
    return null;
  }

  // Accepts YYYY-MM-DD from the UI and normalizes it to a UTC Date for Prisma DateTime fields.
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    if (dateOnlyMatch) {
      const normalized = new Date(`${trimmed}T00:00:00.000Z`);
      return Number.isNaN(normalized.getTime()) ? null : normalized;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Validates the tournament data and converts it to the appropriate format for the database
function validateTournamentPayload(body) {
  const {
    emertimi,
    sporti_id,
    lloji: rawType,
    data_fillimit,
    data_perfundimit,
    lokacioni,
    organizatori_id,
    cmimi_regjistrimit,
    statusi: rawStatus = "Regjistrimi",
    pershkrimi,
  } = body;

  const lloji = normalizeTournamentType(rawType);
  const statusi = normalizeTournamentStatus(rawStatus);

  if (!emertimi?.trim()) {
    return { error: "The tournament name is required." };
  }

  const sportId = Number(sporti_id);
  if (!Number.isInteger(sportId) || sportId <= 0) {
    return { error: "The sport ID is invalid." };
  }

  if (!tournamentTypeOptions.includes(lloji)) {
    return {
      error: `The type must be one of: ${tournamentTypeOptions.join(", ")}.`,
    };
  }

  if (!tournamentStatusOptions.includes(statusi)) {
    return {
      error: `The status must be one of: ${tournamentStatusOptions.join(", ")}.`,
    };
  }

  if (!data_fillimit || !data_perfundimit) {
    return { error: "The start date and end date are required." };
  }

  // Validates the dates and ensures that the end date is after the start date
  const startDate = parseTournamentDate(data_fillimit);
  const endDate = parseTournamentDate(data_perfundimit);
  if (!startDate || !endDate) {
    return { error: "The tournament dates are invalid." };
  }

  if (endDate <= startDate) {
    return { error: "The end date must be after the start date." };
  }

  // Validates the registration price, it can be empty (default to 0) but if given it must be a non-negative number
  const registrationPrice =
    cmimi_regjistrimit === "" ||
    cmimi_regjistrimit === null ||
    cmimi_regjistrimit === undefined
      ? 0
      : Number(cmimi_regjistrimit);

  if (!Number.isFinite(registrationPrice) || registrationPrice < 0) {
    return { error: "The registration price must be a non-negative number." };
  }

  // Allows admins to optionally assign a specific user as the organizer of the tournament.
  let organizerId = null;
  if (
    organizatori_id !== "" &&
    organizatori_id !== null &&
    organizatori_id !== undefined
  ) {
    organizerId = Number(organizatori_id);

    if (!Number.isInteger(organizerId) || organizerId <= 0) {
      return { error: "The organizer ID is invalid." };
    }
  }

  return {
    value: {
      emertimi: emertimi.trim(),
      sporti_id: sportId,
      lloji,
      data_fillimit: startDate,
      data_perfundimit: endDate,
      lokacioni: lokacioni?.trim() || null,
      organizatori_id: organizerId,
      cmimi_regjistrimit: registrationPrice,
      statusi,
      pershkrimi: pershkrimi?.trim() || null,
    },
  };
}

// Promotes the selected user to organizer when a tournament is assigned to them.
async function ensureOrganizerUser(userId) {
  if (!userId) {
    return null;
  }

  const userResult = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, roli: true },
  });

  if (!userResult) {
    throw new Error("Organizer not found");
  }

  if (!["user", "organizator"].includes(userResult.roli)) {
    throw new Error("Only users or organizers can be assigned to a tournament");
  }

  if (userResult.roli !== "organizator") {
    await prisma.user.update({
      where: { id: userId },
      data: { roli: "organizator" },
    });
  }

  return userResult;
}

// Route for getting all tournaments
router.get("/", protect, async (req, res) => {
  try {
    let result;

    if (req.user.is_admin) {
      result = await prisma.tournaments.findMany({
        orderBy: { id: "asc" },
      });
    } else if (req.user.is_organizer) {
      // Organizers only receive tournaments that are explicitly assigned to them.
      result = await prisma.tournaments.findMany({
        where: { organizatori_id: req.user.id },
        orderBy: { id: "asc" },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific tournament by its ID
router.get("/:id", protect, async (req, res) => {
  const { error, value } = tournamentParamSchema.validate({
    id: req.params.id,
  });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const tournamentId = value.id;

  try {
    let result;

    if (req.user.is_admin) {
      result = await prisma.tournaments.findUnique({
        where: { id: tournamentId },
      });
    } else if (req.user.is_organizer) {
      // Prevents an organizer from opening another organizer's tournament by id.
      result = await prisma.tournaments.findFirst({
        where: {
          id: tournamentId,
          organizatori_id: req.user.id,
        },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!result) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new tournament. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  const { error, value } = await tournamentCreateSchema.validateAsync(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const {
    emertimi,
    sporti_id,
    lloji,
    data_fillimit,
    data_perfundimit,
    lokacioni,
    organizatori_id,
    cmimi_regjistrimit,
    statusi,
    pershkrimi,
  } = value;

  try {
    // When a tournament is assigned, the chosen user automatically becomes an organizer.
    if (organizatori_id) {
      await ensureOrganizerUser(organizatori_id);
    }

    const result = await prisma.tournaments.create({
      data: {
        emertimi,
        sporti_id,
        lloji,
        data_fillimit,
        data_perfundimit,
        lokacioni,
        organizatori_id,
        cmimi_regjistrimit,
        statusi,
        pershkrimi,
      },
    });

    res.status(201).json(result);
  } catch (err) {
    handleTournamentError(err, res);
  }
});

// Route for updating an existing tournament by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const { error: paramError, value: paramValue } = tournamentParamSchema.validate({
    id: req.params.id,
  });
  if (paramError) {
    return res.status(400).json({ error: paramError.details[0].message });
  }

  const { error: bodyError, value: bodyValue } = await tournamentUpdateSchema.validateAsync(
    req.body,
  );
  if (bodyError) {
    return res.status(400).json({ error: bodyError.details[0].message });
  }

  const tournamentId = paramValue.id;
  const {
    emertimi,
    sporti_id,
    lloji,
    data_fillimit,
    data_perfundimit,
    lokacioni,
    organizatori_id,
    cmimi_regjistrimit,
    statusi,
    pershkrimi,
  } = bodyValue;

  try {
    const existingTournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });
    if (!existingTournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Keeps the assigned user and organizer role in sync during tournament edits too.
    if (organizatori_id) {
      await ensureOrganizerUser(organizatori_id);
    }

    const result = await prisma.tournaments.update({
      where: { id: tournamentId },
      data: {
        emertimi,
        sporti_id,
        lloji,
        data_fillimit,
        data_perfundimit,
        lokacioni,
        organizatori_id,
        cmimi_regjistrimit,
        statusi,
        pershkrimi,
      },
    });

    res.json(result);
  } catch (err) {
    handleTournamentError(err, res);
  }
});

// Route for deleting an existing tournament by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const { error, value } = tournamentParamSchema.validate({ id: req.params.id });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const tournamentId = value.id;

  try {
    const existingTournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
    });
    if (!existingTournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const deletedTournament = await prisma.tournaments.delete({
      where: { id: tournamentId },
    });

    res.json({ message: "Tournament deleted successfully", deletedTournament });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exporting the router to be used in server.js
export default router;
