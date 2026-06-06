// Defines venue routes for managing tournament locations and their availability details.
import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import Joi from "joi";

const router = express.Router();

// Validation Schemas
const venueCreateSchema = Joi.object({
  emertimi: Joi.string().trim().required().messages({
    "string.empty": "Venue name is required.",
    "any.required": "Venue name is required.",
  }),
  adresa: Joi.string().trim().required().messages({
    "string.empty": "Address is required.",
    "any.required": "Address is required.",
  }),
  qyteti: Joi.string().trim().required().messages({
    "string.empty": "City is required.",
    "any.required": "City is required.",
  }),
  kapaciteti: Joi.number().integer().optional().allow(null).messages({
    "number.base": "Capacity must be a valid number.",
  }),
  lloji_siperfaqes: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Surface type must be a string.",
  }),
  ndricimi: Joi.boolean().optional().allow(null).messages({
    "boolean.base": "Lighting must be true or false.",
  }),
  statusi: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Status must be a string.",
  }),
});

const venueUpdateSchema = Joi.object({
  emertimi: Joi.string().trim().optional().messages({
    "string.empty": "Venue name cannot be empty.",
  }),
  adresa: Joi.string().trim().optional().messages({
    "string.empty": "Address cannot be empty.",
  }),
  qyteti: Joi.string().trim().optional().messages({
    "string.empty": "City cannot be empty.",
  }),
  kapaciteti: Joi.number().integer().optional().allow(null).messages({
    "number.base": "Capacity must be a valid number.",
  }),
  lloji_siperfaqes: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Surface type must be a string.",
  }),
  ndricimi: Joi.boolean().optional().allow(null).messages({
    "boolean.base": "Lighting must be true or false.",
  }),
  statusi: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Status must be a string.",
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
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildVenueFilters(query) {
  const search = parseStringQuery(query.search);
  const qyteti = parseStringQuery(query.qyteti);
  const statusi = parseStringQuery(query.statusi);

  const where = {};

  if (search) {
    where.OR = [
      { emertimi: { contains: search, mode: "insensitive" } },
      { adresa: { contains: search, mode: "insensitive" } },
      { qyteti: { contains: search, mode: "insensitive" } },
      { lloji_siperfaqes: { contains: search, mode: "insensitive" } },
      { statusi: { contains: search, mode: "insensitive" } },
    ];
  }

  if (qyteti) {
    where.qyteti = { equals: qyteti, mode: "insensitive" };
  }

  if (statusi) {
    where.statusi = { equals: statusi, mode: "insensitive" };
  }

  return where;
}

// Route for getting all venues. This route is public.
router.get("/", protect, async (req, res) => {
  const page = req.query.page ? Math.max(1, parseInt(req.query.page) || 1) : null;
  const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit) || 10) : null;
  const skip = page && limit ? (page - 1) * limit : undefined;

  try {
    const where = buildVenueFilters(req.query);
    const queryOptions = {
      where,
      orderBy: { id: "asc" },
      ...(page && limit ? { skip, take: limit } : {}),
    };

    const venues = await prisma.venues.findMany(queryOptions);

    if (page && limit) {
      const total = await prisma.venues.count({ where });
      return res.json({
        data: venues,
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

    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /venues/:id - Route for getting a specific venue by its ID
router.get("/:id", protect, async (req, res) => {
  const venueId = parsePositiveInt(req.params.id);
  if (!venueId) {
    return res.status(400).json({ error: "Invalid venue id" });
  }

  try {
    const venue = await prisma.venues.findUnique({
      where: { id: venueId },
    });
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }
    res.json(venue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new venue. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  try {
    const { error, value } = venueCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi } = value;

    const venue = await prisma.venues.create({
      data: {
        emertimi,
        adresa,
        qyteti,
        kapaciteti: kapaciteti || null,
        lloji_siperfaqes: lloji_siperfaqes || null,
        ndricimi: ndricimi ?? null,
        statusi: statusi || null,
      },
    });
    res.status(201).json(venue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing venue by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const venueId = parsePositiveInt(req.params.id);
  if (!venueId) {
    return res.status(400).json({ error: "Invalid venue id" });
  }

  try {
    const { error, value } = venueUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const existingVenue = await prisma.venues.findUnique({
      where: { id: venueId },
    });
    if (!existingVenue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const { emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi } = value;

    const venueData = {
      ...(emertimi !== undefined && { emertimi }),
      ...(adresa !== undefined && { adresa }),
      ...(qyteti !== undefined && { qyteti }),
      ...(kapaciteti !== undefined && { kapaciteti: kapaciteti || null }),
      ...(lloji_siperfaqes !== undefined && { lloji_siperfaqes: lloji_siperfaqes || null }),
      ...(ndricimi !== undefined && { ndricimi: ndricimi ?? null }),
      ...(statusi !== undefined && { statusi: statusi || null }),
    };

    const venue = await prisma.venues.update({
      where: { id: venueId },
      data: venueData,
    });

    res.json(venue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing venue by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const venueId = parsePositiveInt(req.params.id);
  if (!venueId) {
    return res.status(400).json({ error: "Invalid venue id" });
  }

  try {
    const existingVenue = await prisma.venues.findUnique({
      where: { id: venueId },
    });
    if (!existingVenue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const deletedVenue = await prisma.venues.delete({
      where: { id: venueId },
    });

    res.json({ message: "Venue deleted successfully", deletedVenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the router to be used in server.js
export default router;
