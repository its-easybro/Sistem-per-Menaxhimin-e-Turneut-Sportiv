import express from "express";
import pool from "../config/db.js";
import { protect, requireRole  } from "../middleware/auth.js";
const router = express.Router();

// Route for getting matches. This route is protected.
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM matches ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific match by its ID. This route is protected.
router.get("/:id", protect, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM matches WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "The match was not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new match. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
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

// Route for updating an existing match by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
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

// Route for deleting an existing match by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const { id } = req.params;
  try {
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
