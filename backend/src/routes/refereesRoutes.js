import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import Joi from "joi";

const router = express.Router();

// Validation Schemas
const promoteSchema = Joi.object({
  user_id: Joi.number().integer().positive().required().messages({
    "number.base": "User ID must be a valid number.",
    "number.positive": "User ID must be positive.",
    "any.required": "User ID is required.",
  }),
  telefoni: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Phone number must be a string.",
  }),
  nr_licences: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "License number must be a string.",
  }),
  kategoria: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Category must be a string.",
  }),
  pervoja_vitesh: Joi.number().integer().min(0).optional().allow(null).messages({
    "number.base": "Years of experience must be a valid number.",
    "number.min": "Years of experience must be non-negative.",
  }),
});

// Validation schema for creating a new referee. All fields are required except for phone, license number, category, and years of experience.
const refereeCreateSchema = Joi.object({
  emri: Joi.string().trim().required().messages({
    "string.empty": "First name is required.",
    "any.required": "First name is required.",
  }),
  mbiemri: Joi.string().trim().required().messages({
    "string.empty": "Last name is required.",
    "any.required": "Last name is required.",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.email": "Email must be valid.",
    "any.required": "Email is required.",
  }),
  telefoni: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Phone number must be a string.",
  }),
  nr_licences: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "License number must be a string.",
  }),
  kategoria: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Category must be a string.",
  }),
  pervoja_vitesh: Joi.number().integer().min(0).optional().allow(null).messages({
    "number.base": "Years of experience must be a valid number.",
    "number.min": "Years of experience must be non-negative.",
  }),
});

// Validation schema for updating a referee. All fields are optional, but if provided they must be valid.
const refereeUpdateSchema = Joi.object({
  emri: Joi.string().trim().optional().messages({
    "string.empty": "First name cannot be empty.",
  }),
  mbiemri: Joi.string().trim().optional().messages({
    "string.empty": "Last name cannot be empty.",
  }),
  email: Joi.string().trim().email().optional().allow(null).messages({
    "string.email": "Email must be valid.",
  }),
  telefoni: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Phone number must be a string.",
  }),
  nr_licences: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "License number must be a string.",
  }),
  kategoria: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Category must be a string.",
  }),
  pervoja_vitesh: Joi.number().integer().min(0).optional().allow(null).messages({
    "number.base": "Years of experience must be a valid number.",
    "number.min": "Years of experience must be non-negative.",
  }),
});

async function ensureRefereeUser(userId) {
  if (!userId) return null;

  const userResult = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, roli: true, emri: true, mbiemri: true, email: true },
  });

  if (!userResult) {
    throw new Error("Referee not found");
  }

  if (userResult.roli !== "gjyqtar") {
    throw new Error("Only referee can be assigned to a match");
  }

  const existingReferee = await prisma.referees.findFirst({
    where: { user_id: userId },
  });

  if (!existingReferee) {
    await prisma.referees.create({
      data: {
        emri: userResult.emri,
        mbiemri: userResult.mbiemri,
        email: userResult.email,
        user_id: userId,
      },
    });
  }
}

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

function buildRefereeFilters(query) {
  const search = parseStringQuery(query.search);
  const kategoria = parseStringQuery(query.kategoria);
  

  const where = {};

  if (search) {
    where.OR = [
      { emri: { contains: search, mode: "insensitive" } },
      { mbiemri: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { kategoria: { contains: search, mode: "insensitive" } },
    ];
  }

  if (kategoria) {
    where.kategoria = { equals: kategoria, mode: "insensitive" };
  }

  

  return where;
}

// Route for getting all referees. This route is protected.
router.get("/", protect, async (req, res) => {
  try {
    const where = buildRefereeFilters(req.query);
    const referees = await prisma.referees.findMany({
      where,
      orderBy: { id: "asc" },
    });
    res.json(referees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting users that can be promoted to referees.
router.get("/promotable-users", protect, requireRole("is_admin"), async (req, res) => {
  try {
    const existingReferees = await prisma.referees.findMany({
      where: {
        user_id: { not: null },
      },
      select: { user_id: true },
    });
    const existingUserIds = existingReferees
      .map((referee) => referee.user_id)
      .filter(Boolean);

    const users = await prisma.user.findMany({
      where: {
        roli: "user",
        ...(existingUserIds.length > 0
          ? { id: { notIn: existingUserIds } }
          : {}),
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        email: true,
        roli: true,
      },
    });

    res.json(
      users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.emri,
        full_name: [user.emri, user.mbiemri].filter(Boolean).join(" ") || null,
        roli: user.roli,
        is_admin: user.roli === "admin",
        is_organizer: user.roli === "organizator",
        is_referee: user.roli === "gjyqtar",
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for promoting a user to referee. Must be BEFORE /:id
router.post("/promote", protect, requireRole("is_admin"), async (req, res) => {
  try {
    const { error, value } = promoteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { user_id, telefoni, nr_licences, kategoria, pervoja_vitesh } = value;

    const userResult = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, roli: true, emri: true, mbiemri: true, email: true },
    });

    if (!userResult) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userResult.roli !== "gjyqtar") {
      await prisma.user.update({
        where: { id: user_id },
        data: { roli: "gjyqtar" },
      });
    }

    const existing = await prisma.referees.findFirst({
      where: { user_id },
    });

    if (existing) {
      return res.status(409).json({ error: "This user is already a referee" });
    }

    const referee = await prisma.referees.create({
      data: {
        emri: userResult.emri,
        mbiemri: userResult.mbiemri,
        email: userResult.email,
        telefoni: telefoni || null,
        nr_licences: nr_licences || null,
        kategoria: kategoria || null,
        pervoja_vitesh: pervoja_vitesh || null,
        user_id,
      },
    });

    res.status(201).json(referee);
  } catch (err) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] ?? 'field';
      return res.status(409).json({ error: `A referee with this ${field} already exists.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific referee by their ID.
router.get("/:id", protect, async (req, res) => {
  const refereeId = parsePositiveInt(req.params.id);
  if (!refereeId) {
    return res.status(400).json({ error: "Invalid referee id" });
  }
  try {
    const referee = await prisma.referees.findUnique({
      where: { id: refereeId },
    });
    if (!referee) {
      return res.status(404).json({ error: "Referee not found" });
    }
    res.json(referee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new referee. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  try {
    const { error, value } = refereeCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh } = value;

    const referee = await prisma.referees.create({
      data: {
        emri,
        mbiemri,
        email,
        telefoni: telefoni || null,
        nr_licences: nr_licences || null,
        kategoria: kategoria || null,
        pervoja_vitesh: pervoja_vitesh || null,
      },
    });
    res.status(201).json(referee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing referee by their ID.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const refereeId = parsePositiveInt(req.params.id);
  if (!refereeId) {
    return res.status(400).json({ error: "Invalid referee id" });
  }

  try {
    const { error, value } = refereeUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const existingReferee = await prisma.referees.findUnique({
      where: { id: refereeId },
    });
    if (!existingReferee) {
      return res.status(404).json({ error: "Referee not found" });
    }

    const { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh } = value;

    const refereeData = {
      ...(emri !== undefined && { emri }),
      ...(mbiemri !== undefined && { mbiemri }),
      ...(email !== undefined && { email }),
      ...(telefoni !== undefined && { telefoni: telefoni || null }),
      ...(nr_licences !== undefined && { nr_licences: nr_licences || null }),
      ...(kategoria !== undefined && { kategoria: kategoria || null }),
      ...(pervoja_vitesh !== undefined && { pervoja_vitesh: pervoja_vitesh || null }),
    };

    const referee = await prisma.referees.update({
      where: { id: refereeId },
      data: refereeData,
    });
    res.json(referee);
  } catch (err) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] ?? 'field';
      return res.status(409).json({ error: `A referee with this ${field} already exists.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing referee by their ID.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const refereeId = parsePositiveInt(req.params.id);
  if (!refereeId) {
    return res.status(400).json({ error: "Invalid referee id" });
  }
  try {
    const existingReferee = await prisma.referees.findUnique({
      where: { id: refereeId },
    });
    if (!existingReferee) {
      return res.status(404).json({ error: "Referee not found" });
    }
    const referee = await prisma.referees.delete({
      where: { id: refereeId },
    });
    res.json({ message: "Referee deleted successfully", deletedReferee: referee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
