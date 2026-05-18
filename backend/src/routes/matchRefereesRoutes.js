import express from "express";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";
import Joi from "joi";

const router = express.Router();

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
  roli: Joi.string().valid("main", "assistant").required().messages({
    "any.only": "Role must be either 'main' or 'assistant'.",
    "any.required": "Role is required.",
  }),
});

const matchRefereeUpdateSchema = Joi.object({
  ndeshja_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Match ID must be a valid number.",
    "number.positive": "Match ID must be a positive integer.",
  }),
  gjyqtari_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Referee ID must be a valid number.",
    "number.positive": "Referee ID must be a positive integer.",
  }),
  roli: Joi.string().valid("main", "assistant").optional().messages({
    "any.only": "Role must be either 'main' or 'assistant'.",
  }),
});


function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

// Route for managing match referees. This route is protected and only admins can use it.
router.get("/", protect, async (req, res) => {
  try {
    let result;

    if (req.user.is_admin) {
      result = await prisma.matchreferees.findMany({
        orderBy: { id: "asc" },
      });
    } else if (req.user.is_referee) {
      // Gjej referee rekordin nga tabela referees duke përdorur user_id
      const refereeRecord = await prisma.referees.findFirst({
        where: { user_id: req.user.id },
      });

      if (!refereeRecord) {
        return res.status(404).json({ error: "Referee profile not found for this user" });
      }

      // Tani përdor ID e referee (jo user ID) për të gjetur ndeshjet
      result = await prisma.matchreferees.findMany({
        where: { gjyqtari_id: refereeRecord.id },
        orderBy: { id: "asc" },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific match referee by its ID. This route is protected.
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