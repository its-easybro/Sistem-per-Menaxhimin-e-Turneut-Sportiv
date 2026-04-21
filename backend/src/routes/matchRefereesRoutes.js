import express from "express";
import pool from "../config/db.js";
import { protect, requireAdmin } from "../middleware/auth.js";
const router = express.Router();

// Route for managing match referees. This route is protected and only admins can use it.
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM matchreferees ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific match referee by its ID. This route is protected.
router.get("/:id", protect, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM matchreferees WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Referee not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new match referee. This route is protected and only admins can use it.
router.post("/", protect, requireAdmin, async (req, res) => {
  const { ndeshja_id, gjyqtari_id, roli } = req.body;
  if (!ndeshja_id || !gjyqtari_id || !roli) {
    return res.status(400).json({
      error: "Fields required: ndeshja_id, gjyqtari_id, roli",
    });
  }
  try {
    const result = await pool.query(
      "INSERT INTO matchreferees (ndeshja_id, gjyqtari_id, roli) VALUES ($1, $2, $3) RETURNING *",
      [ndeshja_id, gjyqtari_id, roli],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing match referee by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { ndeshja_id, gjyqtari_id, roli } = req.body;
  if (!ndeshja_id || !gjyqtari_id || !roli) {
    return res.status(400).json({
      error: "Fields required: ndeshja_id, gjyqtari_id, roli",
    });
  }
  try {
    const result = await pool.query(
      "UPDATE matchreferees SET ndeshja_id = $1, gjyqtari_id = $2, roli = $3 WHERE id = $4 RETURNING *",
      [ndeshja_id, gjyqtari_id, roli, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Referee not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing match referee by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM matchreferees WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Referee not found" });
    }
    res.json({ message: "Referee deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the router to be used in server.js
export default router;
