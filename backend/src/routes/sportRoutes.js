import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";
import express from "express";
import pool from "../config/db.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sports ORDER BY id");
    res.send(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /sports/:id - Merr sportin me ID specifike
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM sports WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sporti nuk u gjet" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { emertimi, pershkrimi, numri_lojtareve, lloji } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO sports (emertimi, pershkrimi, numri_lojtareve, lloji)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [emertimi, pershkrimi, numri_lojtareve, lloji],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { emertimi, pershkrimi, numri_lojtareve, lloji } = req.body;

  try {
    const result = await pool.query(
      `UPDATE sports
       SET emertimi = $1, pershkrimi = $2, numri_lojtareve = $3, lloji = $4
       WHERE id = $5
       RETURNING *`,
      [emertimi, pershkrimi, numri_lojtareve, lloji, id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Sporti nuk u gjet" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM sports
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Sporti nuk u gjet" });
    }
    res.json({ message: "Sporti u fshi me sukses", deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
