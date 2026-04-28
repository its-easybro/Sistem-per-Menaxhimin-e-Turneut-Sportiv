import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

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

// Route for getting all referees. This route is protected.
router.get("/", protect, async (req, res) => {
  try {
    const referees = await prisma.referees.findMany({
      orderBy: { id: "asc" },
    });
    res.json(referees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for promoting a user to referee. Must be BEFORE /:id
router.post("/promote", protect, requireRole("is_admin"), async (req, res) => {
  const { user_id, telefoni, nr_licences, kategoria, pervoja_vitesh } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  try {
    const userResult = await prisma.user.findUnique({
      where: { id: Number(user_id) },
      select: { id: true, roli: true, emri: true, mbiemri: true, email: true },
    });

    if (!userResult) {
      return res.status(404).json({ error: "User not found" });
    }

    // Ndrysho rolin në gjyqtar nëse nuk është
    if (userResult.roli !== "gjyqtar") {
      await prisma.user.update({
        where: { id: Number(user_id) },
        data: { roli: "gjyqtar" },
      });
    }

    // Kontrollo nëse ekziston tashmë
    const existing = await prisma.referees.findFirst({
      where: { user_id: Number(user_id) },
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
        pervoja_vitesh: pervoja_vitesh ? Number(pervoja_vitesh) : null,
        user_id: Number(user_id),
      },
    });

    res.status(201).json(referee);
  } catch (err) {
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
  const { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh } = req.body;
  try {
    const referee = await prisma.referees.create({
      data: {
        emri,
        mbiemri,
        email,
        telefoni,
        nr_licences,
        kategoria,
        pervoja_vitesh,
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
  const { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh } = req.body;
  try {
    const existingReferee = await prisma.referees.findUnique({
      where: { id: refereeId },
    });
    if (!existingReferee) {
      return res.status(404).json({ error: "Referee not found" });
    }
    const referee = await prisma.referees.update({
      where: { id: refereeId },
      data: { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh },
    });
    res.json(referee);
  } catch (err) {
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