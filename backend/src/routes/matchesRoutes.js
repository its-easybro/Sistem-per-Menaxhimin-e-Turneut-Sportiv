import express from "express";
import prisma from "../lib/prisma.js";
import { protect, requireRole  } from "../middleware/auth.js";
const router = express.Router();

// Checks that an organizer is trying to manage only a tournament they own.

async function organizerOwnsTournament(tournamentId, organizerId){
  const tournament = await prisma.tournaments.findFirst({
    where: {
      id: tournamentId,
      organizatori_id: organizerId,
    },
    select: { id: true },
  });

  return !!tournament;
}
// Checks that an existing match belongs to one of the organizer's tournaments.


async function organizerOwnsMatch(matchId, organizerId){
  const match = await prisma.matches.findFirst({
    where: {
      id: matchId,
      tournaments: {
        organizatori_id: organizerId,
      },
    },
    select: { id: true },
  });
  return !!match;
}

// Route for getting matches. This route is protected.
router.get("/", protect, async (req, res) => {
  try {
    let matches;

    if (req.user.is_admin) {
      matches = await prisma.matches.findMany({
        orderBy: { id: "asc" },
      });
    } else if (req.user.is_organizer) {
      // Organizers can only list matches from tournaments assigned to them.
      matches = await prisma.matches.findMany({
        where: {
          tournaments: {
            organizatori_id: req.user.id,
          },
        },
        orderBy: { id: "asc" },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific match by its ID. This route is protected.
router.get("/:id", protect, async (req, res) => {
  const { id } = req.params;
  try {
    let match;

    if (req.user.is_admin) {
      match = await prisma.matches.findUnique({
        where: { id: Number(id) },
      });
    } else if (req.user.is_organizer) {
      // Organizers can only open match details for their own tournament space.
      match = await prisma.matches.findFirst({
        where: {
          id: Number(id),
          tournaments: {
            organizatori_id: req.user.id,
          },
        },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!match) {
      return res.status(404).json({ error: "The match was not found" });
    }
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new match. This route is protected and available to admins or the assigned organizer.
router.post("/", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const {
    turneu_id,
    ekipi_shtepiak_id,
    ekipi_mysafir_id,
    data_ndeshjes,
    ora_fillimit,
    fusha_id,
    statusi,
    faza,
  } = req.body;
  if (!turneu_id || !ekipi_shtepiak_id || !ekipi_mysafir_id || !data_ndeshjes) {
    return res.status(400).json({
      error:
        "Fields required: turneu_id, ekipi_shtepiak_id, ekipi_mysafir_id, data_ndeshjes",
    });
  }
  if (ekipi_shtepiak_id === ekipi_mysafir_id) {
    return res.status(400).json({ error: "The teams cannot be the same" });
  }
  try {
    if (req.user.is_organizer) {
      // Blocks organizers from creating matches in tournaments they do not own.
      const ownsTournament = await organizerOwnsTournament(turneu_id, req.user.id);
      if (!ownsTournament) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const created = await prisma.matches.create({
      data: {
        turneu_id,
        ekipi_shtepiak_id,
        ekipi_mysafir_id,
        data_ndeshjes: new Date(data_ndeshjes),
        ora_fillimit: ora_fillimit ? new Date(`1970-01-01T${ora_fillimit}`) : null,
        fusha_id: fusha_id ?? null,
        statusi: statusi || "Planifikuar",
        faza: faza ?? null,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing match by its ID. This route is protected and available to admins or the assigned organizer.
router.put("/:id", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const { id } = req.params;
  const {
    turneu_id,
    ekipi_shtepiak_id,
    ekipi_mysafir_id,
    data_ndeshjes,
    ora_fillimit,
    fusha_id,
    statusi,
    faza,
  } = req.body;
  if (
    ekipi_shtepiak_id &&
    ekipi_mysafir_id &&
    ekipi_shtepiak_id === ekipi_mysafir_id
  ) {
    return res.status(400).json({ error: "The teams cannot be the same" });
  }
  try {
    if (req.user.is_organizer) {
      // An organizer must own both the current match and the destination tournament during updates.
      const ownsCurrentMatch = await organizerOwnsMatch(Number(id), req.user.id);
      const ownsTargetTournament = await organizerOwnsTournament(turneu_id, req.user.id);

      if (!ownsCurrentMatch || !ownsTargetTournament) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const existing = await prisma.matches.findUnique({
      where: { id: Number(id) },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "The match was not found" });
    }

    const updated = await prisma.matches.update({
      where: { id: Number(id) },
      data: {
        turneu_id,
        ekipi_shtepiak_id,
        ekipi_mysafir_id,
        data_ndeshjes: data_ndeshjes ? new Date(data_ndeshjes) : undefined,
        ora_fillimit: ora_fillimit ? new Date(`1970-01-01T${ora_fillimit}`) : ora_fillimit,
        fusha_id,
        statusi,
        faza,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing match by its ID. This route is protected and available to admins or the assigned organizer.
router.delete("/:id", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.is_organizer) {
      // Organizers can delete only matches that belong to their own tournament.
      const ownsMatch = await organizerOwnsMatch(Number(id), req.user.id);
      if (!ownsMatch) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const existing = await prisma.matches.findUnique({
      where: { id: Number(id) },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "The match was not found" });
    }

    await prisma.matches.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "The match was deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
