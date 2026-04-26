import express from "express";
import pool from "../config/db.js";
import { protect, requireRole  } from "../middleware/auth.js";
const router = express.Router();

// Checks that an organizer is trying to manage only a tournament they own.

async function organizerOwnsTournament(tournamentId, organizerId){
  const result = await pool.query(
    "SELECT id FROM tournaments WHERE id = $1 AND organizatori_id = $2",
    [tournamentId, organizerId],
  );

  return result.rows.length > 0;
}
// Checks that an existing match belongs to one of the organizer's tournaments.


async function organizerOwnsmatch(matchId, organizerId){
  const result = await pool.query(
    `SELECT m.id
    FROM matches m
    INNER JOIN tournaments t ON t.id = m.turneu_id
    WHERE m.id = $1 AND t.organizatori_id = $2`,
    [matchId, organizerId],
  );
  return result.rows.length > 0;
}

// Route for getting matches. This route is protected.
router.get("/", protect, async (req, res) => {
  try {
    let result;

    if (req.user.is_admin) {
      result = await pool.query("SELECT * FROM matches ORDER BY id");
    } else if (req.user.is_organizer) {
      // Organizers can only list matches from tournaments assigned to them.
      result = await pool.query(
        `SELECT m.*
         FROM matches m
         INNER JOIN tournaments t ON t.id = m.turneu_id
         WHERE t.organizatori_id = $1
         ORDER BY m.id`,
        [req.user.id],
      );
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific match by its ID. This route is protected.
router.get("/:id", protect, async (req, res) => {
  const { id } = req.params;
  try {
    let result;

    if (req.user.is_admin) {
      result = await pool.query("SELECT * FROM matches WHERE id = $1", [id]);
    } else if (req.user.is_organizer) {
      // Organizers can only open match details for their own tournament space.
      result = await pool.query(
        `SELECT m.*
         FROM matches m
         INNER JOIN tournaments t ON t.id = m.turneu_id
         WHERE m.id = $1 AND t.organizatori_id = $2`,
        [id, req.user.id],
      );
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "The match was not found" });
    }
    res.json(result.rows[0]);
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

    const result = await pool.query(
      "INSERT INTO matches (turneu_id, ekipi_shtepiak_id, ekipi_mysafir_id, data_ndeshjes, ora_fillimit, fusha_id, statusi, faza) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [
        turneu_id,
        ekipi_shtepiak_id,
        ekipi_mysafir_id,
        data_ndeshjes,
        ora_fillimit,
        fusha_id,
        statusi || "Planifikuar",
        faza,
      ],
    );
    res.status(201).json(result.rows[0]);
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
      const ownsCurrentMatch = await organizerOwnsMatch(id, req.user.id);
      const ownsTargetTournament = await organizerOwnsTournament(turneu_id, req.user.id);

      if (!ownsCurrentMatch || !ownsTargetTournament) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const result = await pool.query(
      "UPDATE matches SET turneu_id = $1, ekipi_shtepiak_id = $2, ekipi_mysafir_id = $3, data_ndeshjes = $4, ora_fillimit = $5, fusha_id = $6, statusi = $7, faza = $8 WHERE id = $9 RETURNING *",
      [
        turneu_id,
        ekipi_shtepiak_id,
        ekipi_mysafir_id,
        data_ndeshjes,
        ora_fillimit,
        fusha_id,
        statusi,
        faza,
        id,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "The match was not found" });
    }
    res.json(result.rows[0]);
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
      const ownsMatch = await organizerOwnsMatch(id, req.user.id);
      if (!ownsMatch) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const result = await pool.query(
      "DELETE FROM matches WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "The match was not found" });
    }
    res.json({ message: "The match was deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
