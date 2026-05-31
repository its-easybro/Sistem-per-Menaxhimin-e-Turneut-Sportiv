import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import Joi from "joi";

const router = express.Router();

const periodLabelOptions = ["Half", "Quarter", "Period", "Set"];
const DEFAULT_SPORT_DURATION_MINUTES = 60;
const DEFAULT_SPORT_PERIODS = 2;
const DEFAULT_SPORT_PERIOD_LABEL = "Half";

const sportTypeOptions = ["Ekipor", "Individual", "I dyfishtë"];

// Validation Schemas
const sportCreateSchema = Joi.object({
  emertimi: Joi.string().trim().required().messages({
    "string.empty": "The sport name is required.",
    "any.required": "The sport name is required.",
  }),
  pershkrimi: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Description must be a string.",
  }),
  numri_lojtareve: Joi.number().integer().positive().required().messages({
    "number.base": "The number of players must be a valid number.",
    "number.positive": "The number of players must be a positive integer.",
    "any.required": "The number of players is required.",
  }),
  lloji: Joi.string().trim().valid(...sportTypeOptions).required().messages({
    "any.only": `The type must be one of: ${sportTypeOptions.join(", ")}.`,
    "any.required": "Sport type is required.",
  }),
  kohezgjatja_default: Joi.number().integer().positive().optional().messages({
    "number.base": "Default match duration must be a valid number.",
    "number.positive": "Default match duration must be positive.",
  }),
  numri_periodave: Joi.number().integer().positive().optional().messages({
    "number.base": "Number of periods must be a valid number.",
    "number.positive": "Number of periods must be positive.",
  }),
  emri_periodave: Joi.string()
    .trim()
    .valid(...periodLabelOptions)
    .optional()
    .messages({
      "any.only": `Period label must be one of: ${periodLabelOptions.join(", ")}.`,
    }),
});

const sportUpdateSchema = Joi.object({
  emertimi: Joi.string().trim().optional().messages({
    "string.empty": "The sport name cannot be empty.",
  }),
  pershkrimi: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Description must be a string.",
  }),
  numri_lojtareve: Joi.number().integer().positive().optional().messages({
    "number.base": "The number of players must be a valid number.",
    "number.positive": "The number of players must be a positive integer.",
  }),
  lloji: Joi.string().trim().valid(...sportTypeOptions).optional().messages({
    "any.only": `The type must be one of: ${sportTypeOptions.join(", ")}.`,
  }),
  kohezgjatja_default: Joi.number().integer().positive().optional().messages({
    "number.base": "Default match duration must be a valid number.",
    "number.positive": "Default match duration must be positive.",
  }),
  numri_periodave: Joi.number().integer().positive().optional().messages({
    "number.base": "Number of periods must be a valid number.",
    "number.positive": "Number of periods must be positive.",
  }),
  emri_periodave: Joi.string()
    .trim()
    .valid(...periodLabelOptions)
    .optional()
    .messages({
      "any.only": `Period label must be one of: ${periodLabelOptions.join(", ")}.`,
    }),
});

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseStringQuery(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function buildSportsFilters(query) {
  const search = parseStringQuery(query.search);
  const lloji = parseStringQuery(query.lloji);

  const where = {};

  if (search) {
    where.OR = [
      { emertimi: { contains: search, mode: "insensitive" } },
      { pershkrimi: { contains: search, mode: "insensitive" } },
      { lloji: { contains: search, mode: "insensitive" } },
    ];
  }

  if (lloji) {
    where.lloji = { equals: lloji, mode: "insensitive" };
  }

  return where;
}

// Route for getting all sports.
router.get("/", protect, async (req, res) => {
  try {
    const where = buildSportsFilters(req.query);
    const sports = await prisma.sports.findMany({
      where,
      orderBy: { id: "asc" },
    });
    res.json(sports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific sport by its ID.
router.get("/:id", protect, async (req, res) => {
  const sportId = parsePositiveInt(req.params.id);
  if (!sportId) {
    return res.status(400).json({ error: "Invalid sport id" });
  }

  try {
    const sport = await prisma.sports.findUnique({
      where: { id: sportId },
    });
    if (!sport) {
      return res.status(404).json({ error: "Sport not found" });
    }
    res.json(sport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new sport. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  try {
    const { error, value } = sportCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      emertimi,
      pershkrimi,
      numri_lojtareve,
      lloji,
      kohezgjatja_default,
      numri_periodave,
      emri_periodave,
    } = value;

    const sport = await prisma.sports.create({
      data: {
        emertimi,
        pershkrimi: pershkrimi || null,
        numri_lojtareve,
        lloji,
        kohezgjatja_default:
          kohezgjatja_default ?? DEFAULT_SPORT_DURATION_MINUTES,
        numri_periodave: numri_periodave ?? DEFAULT_SPORT_PERIODS,
        emri_periodave: emri_periodave || DEFAULT_SPORT_PERIOD_LABEL,
      },
    });
    res.status(201).json(sport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing sport by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const sportId = parsePositiveInt(req.params.id);
  if (!sportId) {
    return res.status(400).json({ error: "Invalid sport id" });
  }

  try {
    const { error, value } = sportUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const existingSport = await prisma.sports.findUnique({
      where: { id: sportId },
    });
    if (!existingSport) {
      return res.status(404).json({ error: "Sport not found" });
    }

    const {
      emertimi,
      pershkrimi,
      numri_lojtareve,
      lloji,
      kohezgjatja_default,
      numri_periodave,
      emri_periodave,
    } = value;

    const sportData = {
      ...(emertimi !== undefined && { emertimi }),
      ...(pershkrimi !== undefined && { pershkrimi: pershkrimi || null }),
      ...(numri_lojtareve !== undefined && { numri_lojtareve }),
      ...(lloji !== undefined && { lloji }),
      ...(kohezgjatja_default !== undefined && { kohezgjatja_default }),
      ...(numri_periodave !== undefined && { numri_periodave }),
      ...(emri_periodave !== undefined && { emri_periodave }),
    };

    const sport = await prisma.sports.update({
      where: { id: sportId },
      data: sportData,
    });
    res.json(sport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing sport by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const sportId = parsePositiveInt(req.params.id);
  if (!sportId) {
    return res.status(400).json({ error: "Invalid sport id" });
  }

  try {
    const existingSport = await prisma.sports.findUnique({
      where: { id: sportId },
    });
    if (!existingSport) {
      return res.status(404).json({ error: "Sport not found" });
    }

    const deletedSport = await prisma.sports.delete({
      where: { id: sportId },
    });
    res.json({ message: "Sport deleted successfully", deleted: deletedSport });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
