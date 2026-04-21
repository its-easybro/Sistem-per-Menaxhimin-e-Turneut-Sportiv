import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Normalizes optional text fields by trimming whitespace and converting empty strings to null
const normalizeOptionalText = (value) => {
    if (typeof value !== "string") return value ?? null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
};

// Normalizes optional date fields by trimming whitespace and converting empty strings to null
const normalizeOptionalDate = (value) => {
    if (typeof value !== "string") return value ?? null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
};

// Route for getting all teams
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM teams ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific team by its ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM teams WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Ekipi nuk u gjet" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new team. This route is protected and only admins can use it.
router.post("/", protect, requireAdmin, async (req, res) => {
  const {
    emertimi,
    logoja,
    trajneri,
    kontakti,
    email,
    qyteti,
    data_themelimit,
  } = req.body;

  if (!emertimi?.trim()) {
    return res.status(400).json({
      error: "Fusha e detyrueshme: emertimi",
    });
  }

  const normalizedTeam = {
    emertimi: emertimi.trim(),
    logoja: normalizeOptionalText(logoja),
    trajneri: normalizeOptionalText(trajneri),
    kontakti: normalizeOptionalText(kontakti),
    email: normalizeOptionalText(email),
    qyteti: normalizeOptionalText(qyteti),
    data_themelimit: normalizeOptionalDate(data_themelimit),
  };

  try {
    const result = await pool.query(
      `INSERT INTO teams (emertimi, logoja, trajneri, kontakti, email, qyteti, data_themelimit)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        normalizedTeam.emertimi,
        normalizedTeam.logoja,
        normalizedTeam.trajneri,
        normalizedTeam.kontakti,
        normalizedTeam.email,
        normalizedTeam.qyteti,
        normalizedTeam.data_themelimit,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing team by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    emertimi,
    logoja,
    trajneri,
    kontakti,
    email,
    qyteti,
    data_themelimit,
  } = req.body;

  if (!emertimi?.trim()) {
    return res.status(400).json({
      error: "Fusha e detyrueshme: emertimi",
    });
  }

  const normalizedTeam = {
    emertimi: emertimi.trim(),
    logoja: normalizeOptionalText(logoja),
    trajneri: normalizeOptionalText(trajneri),
    kontakti: normalizeOptionalText(kontakti),
    email: normalizeOptionalText(email),
    qyteti: normalizeOptionalText(qyteti),
    data_themelimit: normalizeOptionalDate(data_themelimit),
  };

  try {
    const result = await pool.query(
      `UPDATE teams
       SET emertimi = $1, logoja = $2, trajneri = $3, kontakti = $4, email = $5, qyteti = $6, data_themelimit = $7
       WHERE id = $8
       RETURNING *`,
      [
        normalizedTeam.emertimi,
        normalizedTeam.logoja,
        normalizedTeam.trajneri,
        normalizedTeam.kontakti,
        normalizedTeam.email,
        normalizedTeam.qyteti,
        normalizedTeam.data_themelimit,
        id,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Ekipi nuk u gjet" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing team by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const teamInMatches = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM matches
       WHERE ekipi_shtepiak_id = $1 OR ekipi_mysafir_id = $1`,
      [id],
    );

    if (teamInMatches.rows[0].total > 0) {
      return res.status(409).json({
        error:
          "Ky ekip nuk mund te fshihet sepse eshte i lidhur me nje ose me shume ndeshje.",
      });
    }

    const result = await pool.query(
      `DELETE FROM teams
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Ekipi nuk u gjet" });
    }
    res.json({ message: "Ekipi u fshi me sukses", deleted: result.rows[0] });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(409).json({
        error:
          "Ky ekip nuk mund te fshihet sepse ka te dhena te lidhura ne sistem.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
