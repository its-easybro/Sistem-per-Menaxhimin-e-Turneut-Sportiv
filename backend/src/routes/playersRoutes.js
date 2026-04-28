import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
const router = express.Router();

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

// Route for getting all players with their team information attached. This route is protected.
router.get("/", protect, async (req, res) => {
  try {
    const players = await prisma.players.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        data_lindjes: true,
        pozicioni: true,
        numri: true,
        gjatesia: true,
        pesha: true,
        kombesia: true,
        teams: {
          select: {
            emertimi: true,
          },
        }
      },
    });  

    const result = players.map(players => ({
      id: players.id,
      emri: players.emri,
      mbiemri: players.mbiemri,
      data_lindjes: players.data_lindjes,
      pozicioni: players.pozicioni,
      numri: players.numri,
      gjatesia: players.gjatesia,
      pesha: players.pesha,
      kombesia: players.kombesia
    }))
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new player. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  const {
    emri,
    mbiemri,
    data_lindjes,
    ekipi_id,
    pozicioni,
    numri,
    gjatesia,
    pesha,
    kombesia,
  } = req.body;

  // Validates required fields
  if (!emri || !mbiemri || !data_lindjes || !pozicioni || !numri) {
    return res.status(400).json({
      error: "The following fields are required: emri, mbiemri, data_lindjes, pozicioni, numri",
    });
  }

  try {
    const created = await prisma.players.create({
      data: {
        emri,
        mbiemri,
        data_lindjes,
        ekipi_id,
        pozicioni,
        numri,
        gjatesia,
        pesha,
        kombesia,
      },
    });

    const result = await prisma.players.findUnique({
      where: { id: created.id },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        data_lindjes: true,
        pozicioni: true,
        numri: true,
        gjatesia: true,
        pesha: true,
        kombesia: true,
        teams: {
          select: {
            emertimi: true,
          },
        }
      },
    });

    const formattedResult = {
      id: result.id,
      emri: result.emri,
      mbiemri: result.mbiemri,
      data_lindjes: result.data_lindjes,
      pozicioni: result.pozicioni,
      numri: result.numri,
      gjatesia: result.gjatesia,
      pesha: result.pesha,
      kombesia: result.kombesia,
      ekipi_id: result.teams?.emertimi ?? "No Team",
    };

    res.status(201).json(formattedResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating a single player by their ID with team information attached. This route is protected.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const playerId = parsePositiveInt(req.params.id);
  if (!playerId) {
    return res.status(400).json({ error: "Invalid player id" });
  }

  const {
    emri,
    mbiemri,
    data_lindjes,
    ekipi_id,
    pozicioni,
    numri,
    gjatesia,
    pesha,
    kombesia,
  } = req.body;
  try {
    const existing = await prisma.players.findUnique({
      where: { id: playerId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Player not found" });
    }

    const result = await prisma.players.update({
      where: { id: playerId },
      data: {
        emri,
        mbiemri,
        data_lindjes,
        ekipi_id,
        pozicioni,
        numri,
        gjatesia,
        pesha,
        kombesia,
      },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        data_lindjes: true,
        pozicioni: true,
        numri: true,
        gjatesia: true,
        pesha: true,
        kombesia: true,
        teams: {
          select: {
            emertimi: true,
          },
        },
      },
    });

    const formattedResult = {
      id: result.id,
      emri: result.emri,
      mbiemri: result.mbiemri,
      data_lindjes: result.data_lindjes,
      pozicioni: result.pozicioni,
      numri: result.numri,
      gjatesia: result.gjatesia,
      pesha: result.pesha,
      kombesia: result.kombesia,
      ekipi_id: result.teams?.emertimi ?? "No Team",
    };

    res.json(formattedResult);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Route for deleting a single player by their ID with team information attached. This route is protected.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const playerId = parsePositiveInt(req.params.id);
  if (!playerId) {
    return res.status(400).json({ error: "Invalid player id" });
  }

  try {
    const existing = await prisma.players.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        data_lindjes: true,
        pozicioni: true,
        numri: true,
        gjatesia: true,
        pesha: true,
        kombesia: true,
        teams: {
          select: {
            emertimi: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Player not found" });
    }

    await prisma.players.delete({
      where: { id: playerId },
    });

    const deleted = {
      id: existing.id,
      emri: existing.emri,
      mbiemri: existing.mbiemri,
      data_lindjes: existing.data_lindjes,
      pozicioni: existing.pozicioni,
      numri: existing.numri,
      gjatesia: existing.gjatesia,
      pesha: existing.pesha,
      kombesia: existing.kombesia,
      ekipi_id: existing.teams?.emertimi ?? "No Team",
    };

    res.json({ message: "Player deleted successfully", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
