// Defines routes for assigning referees to matches and viewing referee match assignments.
import express from "express";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";
import Joi from "joi";

const router = express.Router();

// Validates a new referee assignment for one match.
const matchRefereeCreateSchema = Joi.object({
  ndeshja_id: Joi.number().integer().positive().required().messages({
    "number.base": "Match ID must be a valid number.",
    "number.positive": "Match ID must be a positive integer.",
    "any.required": "Match ID is required.",
  }),
  gjyqtari_id: Joi.number().integer().positive().required().messages({
    "number.base": "Referee ID must be a valid number.",
    "number.positive": "Referee ID must be a positive integer.",
    "any.required": "Referee ID is required.",
  }),
  roli: Joi.string().valid("Kryegjyqtar", "Asistent 1", "Asistent 2", "Gjyqtar i 4-të", "VAR",).required().messages({
    "any.only": "Role must be one of the allowed values.",
    "any.required": "Role is required.",
  }),
});

// Allows changing the match, referee, or role on an assignment.
const matchRefereeUpdateSchema = Joi.object({
  ndeshja_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Match ID must be a valid number.",
    "number.positive": "Match ID must be a positive integer.",
  }),
  gjyqtari_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Referee ID must be a valid number.",
    "number.positive": "Referee ID must be a positive integer.",
  }),
  roli: Joi.string().valid("Kryegjyqtar", "Asistent 1", "Asistent 2", "Gjyqtar i 4-të", "VAR",).optional().messages({
    "any.only": "Role must be one of the allowed values.",
  }),
});


// Converts id-like inputs into positive integers.
function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

// Normalizes optional string query values.
function parseStringQuery(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Parses date filters used for assignment searches.
function parseMatchDate(value) {
  const dateValue = parseStringQuery(value);
  if (!dateValue) {
    return null;
  }

  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateValue);
  const parsed = dateOnlyMatch
    ? new Date(`${dateValue}T00:00:00.000Z`)
    : new Date(dateValue);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Builds filters for match status, dates, referee names, and team names.
function buildMatchRefereeFilters(query) {
  const statusi = parseStringQuery(query.statusi);
  const search = parseStringQuery(query.search);
  const exactDate = parseMatchDate(query.date);
  const dateFrom = parseMatchDate(query.date_from);
  const dateTo = parseMatchDate(query.date_to);
  const filters = [];
  const matchFilters = {};

  if (statusi) {
    matchFilters.statusi = { equals: statusi, mode: "insensitive" };
  }

  if (exactDate) {
    matchFilters.data_ndeshjes = { equals: exactDate };
  } else if (dateFrom || dateTo) {
    matchFilters.data_ndeshjes = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  if (Object.keys(matchFilters).length > 0) {
    filters.push({ matches: matchFilters });
  }

  if (search) {
    const searchFilters = [
      { roli: { contains: search, mode: "insensitive" } },
      { referees: { emri: { contains: search, mode: "insensitive" } } },
      { referees: { mbiemri: { contains: search, mode: "insensitive" } } },
      { referees: { kategoria: { contains: search, mode: "insensitive" } } },
      { matches: { statusi: { contains: search, mode: "insensitive" } } },
      { matches: { faza: { contains: search, mode: "insensitive" } } },
      {
        matches: {
          teams_matches_ekipi_shtepiak_idToteams: {
            emertimi: { contains: search, mode: "insensitive" },
          },
        },
      },
      {
        matches: {
          teams_matches_ekipi_mysafir_idToteams: {
            emertimi: { contains: search, mode: "insensitive" },
          },
        },
      },
    ];
    const numericSearch = Number(search);

    if (Number.isInteger(numericSearch)) {
      searchFilters.push(
        { id: numericSearch },
        { ndeshja_id: numericSearch },
        { gjyqtari_id: numericSearch },
      );
    }

    filters.push({ OR: searchFilters });
  }

  return filters.length > 0 ? { AND: filters } : {};
}

// Lists referee assignments with optional filters and pagination.
router.get("/", protect, async (req, res) => {
  const page = req.query.page ? Math.max(1, parseInt(req.query.page) || 1) : null;
  const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit) || 10) : null;
  const skip = page && limit ? (page - 1) * limit : undefined;

  try {
    let result;
    const filters = buildMatchRefereeFilters(req.query);

    const queryOptions = {
      where: filters,
      orderBy: { id: "asc" },
      ...(page && limit ? { skip, take: limit } : {}),
    };

    if (req.user.is_admin) {
      result = await prisma.matchreferees.findMany(queryOptions);

      if (page && limit) {
        const total = await prisma.matchreferees.count({ where: filters });
        const totalPages = Math.max(1, Math.ceil(total / limit));
        return res.json({
          data: result,
          pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        });
      }
    } else if (req.user.is_referee) {
      const refereeRecord = await prisma.referees.findFirst({
        where: { user_id: req.user.id },
      });

      if (!refereeRecord) {
        return res.status(404).json({ error: "Referee profile not found for this user" });
      }

      const refereeWhere = { ...filters, gjyqtari_id: refereeRecord.id };
      result = await prisma.matchreferees.findMany({
        ...queryOptions,
        where: refereeWhere,
      });

      if (page && limit) {
        const total = await prisma.matchreferees.count({ where: refereeWhere });
        const totalPages = Math.max(1, Math.ceil(total / limit));
        return res.json({
          data: result,
          pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        });
      }
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific match referee by its ID. This route is protected.
// Fetches one referee assignment by id.
router.get("/:id", protect, async (req, res) => {
  const matchesRefereesId = parsePositiveInteger(req.params.id);
  if (!matchesRefereesId) {
    return res.status(400).json({ error: "The match referee ID is invalid." });
  }

  try {
    let result;

    if (req.user.is_admin) {
      result = await prisma.matchreferees.findUnique({
        where: { id: matchesRefereesId },
      });
    } else if (req.user.is_referee) {
      // Gjej referee rekordin nga tabela referees
      const refereeRecord = await prisma.referees.findFirst({
        where: { user_id: req.user.id },
      });

      if (!refereeRecord) {
        return res.status(404).json({ error: "Referee profile not found for this user" });
      }

      // Lejon aksess vetëm nëse ky matchreferee i përket këtij gjyqtari
      result = await prisma.matchreferees.findFirst({
        where: {
          id: matchesRefereesId,
          gjyqtari_id: refereeRecord.id,
        },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!result) {
      return res.status(404).json({ error: "Match referee not found" });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new match referee. This route is protected and only admins can use it.
// Creates a new referee assignment.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  const { ndeshja_id, gjyqtari_id, roli } = req.body;
  const { error } = matchRefereeCreateSchema.validate({ ndeshja_id, gjyqtari_id, roli });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  try {
    const result = await prisma.matchreferees.create({
      data: {
        ndeshja_id,
        gjyqtari_id,
        roli,
      },
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing match referee by its ID. This route is protected and only admins can use it.
// Updates one referee assignment.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const { id } = req.params;
  const { ndeshja_id, gjyqtari_id, roli } = req.body;
  const { error } = matchRefereeUpdateSchema.validate({ ndeshja_id, gjyqtari_id, roli });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  try {
    const result = await prisma.matchreferees.update({
      where: { id: parseInt(id) },
      data: {
        ndeshja_id,
        gjyqtari_id,
        roli,
      },
    });
    res.json(result);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Referee not found" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing match referee by its ID. This route is protected and only admins can use it.
// Deletes one referee assignment.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.matchreferees.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "Referee deleted successfully" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Referee not found" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Export the router to be used in server.js
export default router;
