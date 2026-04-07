import express from "express";
import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { protect, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
const userSelect = `
  id,
  email,
  emri AS username,
  CONCAT_WS(' ', emri, mbiemri) AS full_name,
  (roli = 'admin') AS is_admin,
  created_at
`;

function splitName(fullName = "", fallbackUsername = "") {
  const normalizedFullName = typeof fullName === "string" ? fullName.trim().replace(/\s+/g, " ") : "";
  const normalizedUsername = typeof fallbackUsername === "string" ? fallbackUsername.trim() : "";

  if (normalizedFullName) {
    const [emri, ...rest] = normalizedFullName.split(" ");
    return { emri, mbiemri: rest.join(" ") };
  }

  return { emri: normalizedUsername, mbiemri: "" };
}

router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${userSelect}
       FROM users
       ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", protect, requireAdmin, async (req, res) => {
  const { email, username, full_name, password, is_admin } = req.body;

  try {
    if (!email || !username || !password) {
      return res.status(400).json({ error: "Email, username and password are required" });
    }

    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { emri, mbiemri } = splitName(full_name, username);

    const result = await pool.query(
      `INSERT INTO users (email, emri, mbiemri, password, roli, statusi)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${userSelect}`,
      [email, emri, mbiemri, hashedPassword, is_admin ? "admin" : "user", "Aktiv"]
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
    const { emri, mbiemri } = splitName(full_name, username);

    const result = await pool.query(
      `UPDATE users
       SET email = $1,
           emri = $2,
           mbiemri = $3,
           roli = $4
       WHERE id = $5
       RETURNING ${userSelect}`,
      [email, emri, mbiemri, is_admin ? "admin" : "user", id]
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
       RETURNING ${userSelect}`,
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
