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

function toMatchTimeValue(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const normalizedValue =
    typeof value === "string" && value.length === 5 ? `${value}:00` : value;

  return new Date(`1970-01-01T${normalizedValue}`);
}

async function organizerOwnsTournament(tournamentId, organizerId) {
  const parsedTournamentId = parsePositiveInt(tournamentId);
  const parsedOrganizerId = parsePositiveInt(organizerId);

  if (!parsedTournamentId || !parsedOrganizerId) {
    return false;
  }

  const tournament = await prisma.tournaments.findFirst({
    where: {
      id: parsedTournamentId,
      organizatori_id: parsedOrganizerId,
    },
    select: { id: true },
  });

  return Boolean(tournament);
}

async function organizerOwnsMatch(matchId, organizerId) {
  const parsedMatchId = parsePositiveInt(matchId);
  const parsedOrganizerId = parsePositiveInt(organizerId);

  if (!parsedMatchId || !parsedOrganizerId) {
    return false;
  }

  const match = await prisma.matches.findFirst({
    where: {
      id: parsedMatchId,
      tournaments: {
        organizatori_id: parsedOrganizerId,
      },
    },
    select: { id: true },
  });

  return Boolean(match);
}

router.get("/", protect, async (req, res) => {
  try {
    let matches;

    if (req.user.is_admin) {
      matches = await prisma.matches.findMany({
        orderBy: { id: "asc" },
      });
    } else if (req.user.is_organizer) {
      matches = await prisma.matches.findMany({
        where: {
          tournaments: {
            organizatori_id: req.user.id,
          },
        },
        orderBy: { id: "asc" },
      });
    } else if (req.user.is_referee) {
      matches = await prisma.matches.findMany({
        where: {
          matchreferees: {
            some: {
              referees: {
                user_id: req.user.id,
              },
            },
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

router.get("/:id", protect, async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if (!matchId) {
    return res.status(400).json({ error: "Invalid match id" });
  }

  try {
    let match;

    if (req.user.is_admin) {
      match = await prisma.matches.findUnique({
        where: { id: matchId },
      });
    } else if (req.user.is_organizer) {
      match = await prisma.matches.findFirst({
        where: {
          id: matchId,
          tournaments: {
            organizatori_id: req.user.id,
          },
        },
      });
    } else if (req.user.is_referee) {
      match = await prisma.matches.findFirst({
        where: {
          id: matchId,
          matchreferees: {
            some: {
              referees: {
                user_id: req.user.id,
              },
            },
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

  if (Number(ekipi_shtepiak_id) === Number(ekipi_mysafir_id)) {
    return res.status(400).json({ error: "The teams cannot be the same" });
  }

  try {
    if (req.user.is_organizer) {
      const ownsTournament = await organizerOwnsTournament(turneu_id, req.user.id);
      if (!ownsTournament) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const created = await prisma.matches.create({
      data: {
        turneu_id: Number(turneu_id),
        ekipi_shtepiak_id: Number(ekipi_shtepiak_id),
        ekipi_mysafir_id: Number(ekipi_mysafir_id),
        data_ndeshjes: new Date(data_ndeshjes),
        ora_fillimit: toMatchTimeValue(ora_fillimit),
        fusha_id: fusha_id ? Number(fusha_id) : null,
        statusi: statusi || "Planifikuar",
        faza: faza || null,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if (!matchId) {
    return res.status(400).json({ error: "Invalid match id" });
  }

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
    Number(ekipi_shtepiak_id) === Number(ekipi_mysafir_id)
  ) {
    return res.status(400).json({ error: "The teams cannot be the same" });
  }

  try {
    if (req.user.is_organizer) {
      const ownsCurrentMatch = await organizerOwnsMatch(matchId, req.user.id);
      const ownsTargetTournament = await organizerOwnsTournament(turneu_id, req.user.id);

      if (!ownsCurrentMatch || !ownsTargetTournament) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const existing = await prisma.matches.findUnique({
      where: { id: matchId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "The match was not found" });
    }

    const updated = await prisma.matches.update({
      where: { id: matchId },
      data: {
        turneu_id: turneu_id ? Number(turneu_id) : undefined,
        ekipi_shtepiak_id: ekipi_shtepiak_id
          ? Number(ekipi_shtepiak_id)
          : undefined,
        ekipi_mysafir_id: ekipi_mysafir_id
          ? Number(ekipi_mysafir_id)
          : undefined,
        data_ndeshjes: data_ndeshjes ? new Date(data_ndeshjes) : undefined,
        ora_fillimit: toMatchTimeValue(ora_fillimit),
        fusha_id: fusha_id === undefined ? undefined : fusha_id ? Number(fusha_id) : null,
        statusi: statusi ?? undefined,
        faza: faza === undefined ? undefined : faza || null,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", protect, requireRole("is_admin", "is_organizer"), async (req, res) => {
  const matchId = parsePositiveInt(req.params.id);
  if (!matchId) {
    return res.status(400).json({ error: "Invalid match id" });
  }

  try {
    if (req.user.is_organizer) {
      const ownsMatch = await organizerOwnsMatch(matchId, req.user.id);
      if (!ownsMatch) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const existing = await prisma.matches.findUnique({
      where: { id: matchId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "The match was not found" });
    }

    await prisma.matches.delete({
      where: { id: matchId },
    });

    res.json({ message: "The match was deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
