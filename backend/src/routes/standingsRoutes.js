import express from "express";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";
const router = express.Router();

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

// Route for getting all standings. This route is protected.
router.get("/", protect, async (req, res) => {
    try {
        const standings = await prisma.standings.findMany({
            orderBy: { id: "asc" },
        });
        res.json(standings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for getting a specific standing by its ID. This route is protected.
router.get("/:id", protect, async (req, res) => {
  const standingId = parsePositiveInt(req.params.id);
  if (!standingId) {
    return res.status(400).json({ error: "Invalid standing id" });
  }
  try {
    const standing = await prisma.standings.findUnique({
      where: { id: standingId },
    });
    if (!standing) {
      return res.status(404).json({ error: "The standing was not found" });
    }
    res.json(standing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new standing. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  const {
    turneu_id,
    ekipi_id,
    ndeshjet_luajtura,
    fitoret,
    barazimet,
    humbjet,
    golat_shenuar,
    golat_pranuar,
    piket,
  } = req.body;
  try {
    const standing = await prisma.standings.create({
      data: {
        turneu_id,
        ekipi_id,
        ndeshjet_luajtura,
        fitoret,
        barazimet,
        humbjet,
        golat_shenuar,
        golat_pranuar,
        piket,
      },
    });
    res.status(201).json(standing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing standing by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const standingId = parsePositiveInt(req.params.id);
  if (!standingId) {
    return res.status(400).json({ error: "Invalid standing id" });
  }
  const {
    turneu_id,
    ekipi_id,
    ndeshjet_luajtura,
    fitoret,
    barazimet,
    humbjet,
    golat_shenuar,
    golat_pranuar,
    piket,
  } = req.body;
  try {
    const existingStanding = await prisma.standings.findUnique({
      where: { id: standingId },
    });
    if (!existingStanding) {
      return res.status(404).json({ error: "The standing was not found" });
    }

    const standing = await prisma.standings.update({
      where: { id: standingId },
      data: {
        turneu_id,
        ekipi_id,
        ndeshjet_luajtura,
        fitoret,
        barazimet,
        humbjet,
        golat_shenuar,
        golat_pranuar,
        piket,
      },
    });
    res.json(standing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Route for deleting an existing standing by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const standingId = parsePositiveInt(req.params.id);
  if (!standingId) {
    return res.status(400).json({ error: "Invalid standing id" });
  }
  try {
    const existingStanding = await prisma.standings.findUnique({
      where: { id: standingId },
    });
    if (!existingStanding) {
      return res.status(404).json({ error: "The standing was not found" });
    }

    await prisma.standings.delete({
      where: { id: standingId },
    });

    res.json({ message: "The standing was deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
