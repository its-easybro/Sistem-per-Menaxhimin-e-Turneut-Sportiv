import express from "express";
import pool from "../config/db.js";
import { protect, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, username, full_name, is_admin, created_at
       FROM users
       ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", protect, requireAdmin, async (req, res) => {
  const { email, username, full_name, is_admin } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO users (email, username, full_name, is_admin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, full_name, is_admin, created_at`,
      [email, username, full_name, is_admin]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", protect, async (req, res) => {
  const { id } = req.params;
  const { email, username, full_name, is_admin } = req.body;

  if (!req.user.is_admin && req.user.id !== Number(id)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET email = $1,
           username = $2,
           full_name = $3,
           is_admin = $4
       WHERE id = $5
       RETURNING id, email, username, full_name, is_admin, created_at`,
      [email, username, full_name, is_admin, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Perdoruesi nuk u gjet" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM users
       WHERE id = $1
       RETURNING id, email, username, full_name, is_admin, created_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Perdoruesi nuk u gjet" });
    }

    res.json({
      message: "Perdoruesi u fshi me sukses",
      deleted: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
