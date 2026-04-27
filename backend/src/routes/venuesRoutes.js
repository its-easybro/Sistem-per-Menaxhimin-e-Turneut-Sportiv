import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
const router = express.Router();

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

// Route for getting all venues. This route is public.
router.get("/", protect, async (req, res) => {
  try {
    const venues = await prisma.venues.findMany({
      orderBy: { id: "asc" },
    });
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
  const { emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi } = req.body;
  try {
    const venue = await prisma.venues.create({
      data: {
        emertimi,
        adresa,
        qyteti,
        kapaciteti,
        lloji_siperfaqes,
        ndricimi,
        statusi,
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

  const { emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi } = req.body;
  try {
    const existingVenue = await prisma.venues.findUnique({
      where: { id: venueId },
    });
    if (!existingVenue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const venue = await prisma.venues.update({
      where: { id: venueId },
      data: {
        emertimi,
        adresa,
        qyteti,
        kapaciteti,
        lloji_siperfaqes,
        ndricimi,
        statusi,
      },
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
