import express from "express";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";
import recalculateStandings from "../services/recalculateStandings.js";
const router = express.Router();

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
      orderBy: [{ turneu_id: "asc" }, { piket: "desc" }, { golat_shenuar: "desc" }],
    });
    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET standings for a specific tournament (league table order)
router.get("/tournament/:turneuId", protect, async (req, res) => {
  const turneuId = Number(req.params.turneuId);
  if (!turneuId || turneuId <= 0) {
    return res.status(400).json({ error: "Invalid tournament ID" });
  }
  try {
    const standings = await prisma.standings.findMany({
      where: { turneu_id: turneuId },
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
router.post("/recalculate/:turneuId", protect, requireRole("is_admin"), async (req, res) => {
  const turneuId = Number(req.params.turneuId);
  if (!turneuId || turneuId <= 0) {
    return res.status(400).json({ error: "Invalid tournament ID" });
  }
  try {
    await recalculateStandings(turneuId);
    res.json({ message: "Standings recalculated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
