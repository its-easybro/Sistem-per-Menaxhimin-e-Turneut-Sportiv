import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
const router = express.Router();

// Posible sport types
const sportTypeOptions = ["Ekipor", "Individual", "I dyfishtë"];

// Normalizes the sport type to handle variations of the same value
function normalizeSportType(value) {
  if (value === "I dyfishtÃ«" || value === "I dyfishte") {
    return "I dyfishtë";
  }

  return value;
}

// Validates the sport data and converts it to the appropriate format for the database
function validateSportPayload(body) {
  const { emertimi, pershkrimi, numri_lojtareve, lloji } = body;

  if (!emertimi?.trim()) {
    return { error: "The sport name is required." };
  }

  const playersCount = Number(numri_lojtareve);
  if (!Number.isInteger(playersCount) || playersCount <= 0) {
    return { error: "The number of players must be a positive integer." };
  }

  const normalizedType = normalizeSportType(lloji);
  if (!sportTypeOptions.includes(normalizedType)) {
    return { error: `The type must be one of: ${sportTypeOptions.join(", ")}.` };
  }

  return {
    value: {
      emertimi: emertimi.trim(),
      pershkrimi: pershkrimi?.trim() || null,
      numri_lojtareve: playersCount,
      lloji: normalizedType,
    },
  };
}

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

// Route for getting all sports. This route is public.
router.get("/", protect, async (req, res) => {
  try {
    const sports = await prisma.sports.findMany({
      orderBy: { id: "asc" },
    });
    res.send(sports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific sport by its ID. This route is public.
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
  const validation = validateSportPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { emertimi, pershkrimi, numri_lojtareve, lloji } = validation.value;
  try {
    const sport = await prisma.sports.create({
      data: {
        emertimi,
        pershkrimi,
        numri_lojtareve,
        lloji,
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

  const validation = validateSportPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { emertimi, pershkrimi, numri_lojtareve, lloji } = validation.value;

  try {
    const existingSport = await prisma.sports.findUnique({
      where: { id: sportId },
    });
    if (!existingSport) {
      return res.status(404).json({ error: "Sport not found" });
    }

    const sport = await prisma.sports.update({
      where: { id: sportId },
      data: {
        emertimi,
        pershkrimi,
        numri_lojtareve,
        lloji,
      },
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
