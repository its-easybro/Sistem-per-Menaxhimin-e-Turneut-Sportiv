import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

const normalizeOptionalText = (value) => {
    if (typeof value !== "string") return value ?? null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
};

const normalizeOptionalDate = (value) => {
    if (typeof value !== "string") return value ?? null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
};

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM teams ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

router.delete("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
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
    res.status(500).json({ error: err.message });
  }
});

export default router;
