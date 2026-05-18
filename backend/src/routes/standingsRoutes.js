import express from "express";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";
import recalculateStandings from "../services/recalculateStandings.js";
import Joi from "joi";

const router = express.Router();

const standingsParamSchema = Joi.object({
  turneuId: Joi.number().integer().positive().required().messages({
    "number.base": "Tournament ID must be a valid number.",
    "number.positive": "Tournament ID must be a positive integer.",
    "any.required": "Tournament ID is required.",
  }),
});

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

// GET all standings (with team and tournament names)
router.get("/", protect, async (req, res) => {
  try {
    const standings = await prisma.standings.findMany({
      include: {
        teams: { select: { emertimi: true } },
        tournaments: {
          select: {
            emertimi: true,
            sports: { select: { emertimi: true } },
          },
        },
      },
      orderBy: [
        { turneu_id: "asc" },
        { piket: "desc" },
        { golat_shenuar: "desc" },
      ],
    });
    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET standings for a specific tournament (league table order)
router.get("/tournament/:turneuId", protect, async (req, res) => {
  const { error, value } = standingsParamSchema.validate({
    turneuId: req.params.turneuId,
  });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const standings = await prisma.standings.findMany({
      where: { turneu_id: value.turneuId },
      include: {
        teams: { select: { emertimi: true } },
        tournaments: {
          select: {
            emertimi: true,
            sports: { select: { emertimi: true } },
          },
        },
      },
      orderBy: [{ piket: "desc" }, { golat_shenuar: "desc" }],
    });
    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST force recalculate standings for a tournament (admin only)
router.post(
  "/recalculate/:turneuId",
  protect,
  requireRole("is_admin"),
  async (req, res) => {
    const { error, value } = standingsParamSchema.validate({
      turneuId: req.params.turneuId,
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    try {
      await recalculateStandings(value.turneuId);
      res.json({ message: "Standings recalculated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
