import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

// Posible types of tournaments
const tournamentTypeOptions = [
  "Grup + Eliminim",
  "VetÃ«m Grup",
  "VetÃ«m Eliminim",
  "Liga",
];

// Posible statuses of tournaments
const tournamentStatusOptions = [
  "Regjistrimi",
  "Aktiv",
  "PÃ«rfunduar",
  "Anuluar",
];

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

// Validates the tournament data and converts it to the appropriate format for the database
function validateTournamentPayload(body) {
  const {
    emertimi,
    sporti_id,
    lloji,
    data_fillimit,
    data_perfundimit,
    lokacioni,
    organizatori_id,
    cmimi_regjistrimit,
    statusi = "Regjistrimi",
    pershkrimi,
  } = body;

  if (!emertimi?.trim()) {
    return { error: "The tournament name is required." };
  }

  const sportId = Number(sporti_id);
  if (!Number.isInteger(sportId) || sportId <= 0) {
    return { error: "The sport ID is invalid." };
  }

  if (!tournamentTypeOptions.includes(lloji)) {
    return { error: `The type must be one of: ${tournamentTypeOptions.join(", ")}.` };
  }

  if (!tournamentStatusOptions.includes(statusi)) {
    return { error: `The status must be one of: ${tournamentStatusOptions.join(", ")}.` };
  }

  if (!data_fillimit || !data_perfundimit) {
    return { error: "The start date and end date are required." };
  }

  // Validates the dates and ensures that the end date is after the start date
  const startDate = new Date(data_fillimit);
  const endDate = new Date(data_perfundimit);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: "The tournament dates are invalid." };
  }

  if (endDate <= startDate) {
    return { error: "The end date must be after the start date." };
  }

  // Validates the registration price, it can be empty (default to 0) but if given it must be a non-negative number
  const registrationPrice =
    cmimi_regjistrimit === "" || cmimi_regjistrimit === null || cmimi_regjistrimit === undefined
      ? 0
      : Number(cmimi_regjistrimit);

  if (!Number.isFinite(registrationPrice) || registrationPrice < 0) {
    return { error: "The registration price must be a non-negative number." };
  }

  // Allows admins to optionally assign a specific user as the organizer of the tournament.
  let organizerId = null;
  if (organizatori_id !== "" && organizatori_id !== null && organizatori_id !== undefined) {
    organizerId = Number(organizatori_id);

    if (!Number.isInteger(organizerId) || organizerId <= 0) {
      return { error: "The organizer ID is invalid." };
    }
  }

  return {
    value: {
      emertimi: emertimi.trim(),
      sporti_id: sportId,
      lloji,
      data_fillimit,
      data_perfundimit,
      lokacioni: lokacioni?.trim() || null,
      organizatori_id: organizerId,
      cmimi_regjistrimit: registrationPrice,
      statusi,
      pershkrimi: pershkrimi?.trim() || null,
    },
  };
}

// Promotes the selected user to organizer when a tournament is assigned to them.
async function ensureOrganizerUser(userId) {
  if (!userId) {
    return null;
  }

  const userResult = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, roli: true },
  });

  if (!userResult) {
    throw new Error("Organizer not found");
  }

  if (!["user", "organizator"].includes(userResult.roli)) {
    throw new Error("Only users or organizers can be assigned to a tournament");
  }

  if (userResult.roli !== "organizator") {
    await prisma.user.update({
      where: { id: userId },
      data: { roli: "organizator" },
    });
  }

  return userResult;
}

// Route for getting all tournaments
router.get("/", protect, async (req, res) => {
  try {
    let result;

    if (req.user.is_admin) {
      result = await prisma.tournaments.findMany({
        orderBy: { id: "asc" },
      });
    } else if (req.user.is_organizer) {
      // Organizers only receive tournaments that are explicitly assigned to them.
      result = await prisma.tournaments.findMany({
        where: { organizatori_id: req.user.id },
        orderBy: { id: "asc" },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific tournament by its ID
router.get("/:id", protect, async (req, res) => {
  const tournamentId = parsePositiveInteger(req.params.id);
  if (!tournamentId) {
    return res.status(400).json({ error: "The tournament ID is invalid." });
  }

  try {
    let result;

    if (req.user.is_admin) {
      result = await prisma.tournaments.findUnique({
        where: { id: tournamentId },
      });
    } else if (req.user.is_organizer) {
      // Prevents an organizer from opening another organizer's tournament by id.
      result = await prisma.tournaments.findFirst({
        where: {
          id: tournamentId,
          organizatori_id: req.user.id,
        },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!result) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new tournament. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  const validation = validateTournamentPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const {
    emertimi,
    sporti_id,
    lloji,
    data_fillimit,
    data_perfundimit,
    lokacioni,
    organizatori_id,
    cmimi_regjistrimit,
    statusi,
    pershkrimi,
  } = validation.value;

  try {
    // When a tournament is assigned, the chosen user automatically becomes an organizer.
    if (organizatori_id) {
      await ensureOrganizerUser(organizatori_id);
    }

    const result = await prisma.tournaments.create({
      data: {
        emertimi,
        sporti_id,
        lloji,
        data_fillimit,
        data_perfundimit,
        lokacioni,
        organizatori_id,
        cmimi_regjistrimit,
        statusi,
        pershkrimi,
      },
    });

    res.status(201).json(result);
  } catch (err) {
    if (
      err.message === "Organizer not found" ||
      err.message === "Only users or organizers can be assigned to a tournament"
    ) {
      return res.status(400).json({ error: err.message });
    }

    if (err?.code === "P2003") {
      return res.status(400).json({ error: "The selected sport or organizer does not exist." });
    }

    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing tournament by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const tournamentId = parsePositiveInteger(req.params.id);
  if (!tournamentId) {
    return res.status(400).json({ error: "The tournament ID is invalid." });
  }

  const validation = validateTournamentPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const {
    emertimi,
    sporti_id,
    lloji,
    data_fillimit,
    data_perfundimit,
    lokacioni,
    organizatori_id,
    cmimi_regjistrimit,
    statusi,
    pershkrimi,
  } = validation.value;

  try {
    const existingTournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });
    if (!existingTournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Keeps the assigned user and organizer role in sync during tournament edits too.
    if (organizatori_id) {
      await ensureOrganizerUser(organizatori_id);
    }

    const result = await prisma.tournaments.update({
      where: { id: tournamentId },
      data: {
        emertimi,
        sporti_id,
        lloji,
        data_fillimit,
        data_perfundimit,
        lokacioni,
        organizatori_id,
        cmimi_regjistrimit,
        statusi,
        pershkrimi,
      },
    });

    res.json(result);
  } catch (err) {
    if (
      err.message === "Organizer not found" ||
      err.message === "Only users or organizers can be assigned to a tournament"
    ) {
      return res.status(400).json({ error: err.message });
    }

    if (err?.code === "P2003") {
      return res.status(400).json({ error: "The selected sport or organizer does not exist." });
    }

    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing tournament by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const tournamentId = parsePositiveInteger(req.params.id);
  if (!tournamentId) {
    return res.status(400).json({ error: "The tournament ID is invalid." });
  }

  try {
    const existingTournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
    });
    if (!existingTournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const deletedTournament = await prisma.tournaments.delete({
      where: { id: tournamentId },
    });

    res.json({ message: "Tournament deleted successfully", deletedTournament });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exporting the router to be used in server.js
export default router;
