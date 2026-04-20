import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";
const router = express.Router();
const sportTypeOptions = ["Ekipor", "Individual", "I dyfishtë"];

function normalizeSportType(value) {
  if (value === "I dyfishtÃ«" || value === "I dyfishte") {
    return "I dyfishtë";
  }

  return value;
}

function validateSportPayload(body) {
  const { emertimi, pershkrimi, numri_lojtareve, lloji } = body;

  if (!emertimi?.trim()) {
    return { error: "Emertimi i sportit eshte i detyrueshem." };
  }

  const playersCount = Number(numri_lojtareve);
  if (!Number.isInteger(playersCount) || playersCount <= 0) {
    return { error: "Numri i lojtareve duhet te jete numer pozitiv." };
  }

  const normalizedType = normalizeSportType(lloji);
  if (!sportTypeOptions.includes(normalizedType)) {
    return { error: `Lloji duhet te jete nje nga: ${sportTypeOptions.join(", ")}.` };
  }

  return {
    value: {
      emertimi: emertimi.trim(),
      pershkrimi: pershkrimi?.trim() || null,
      numri_lojtareve: playersCount,
      lloji: normalizedType,
    },
  };
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sports ORDER BY id");
    res.send(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /sports/:id
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

router.post("/", protect, requireAdmin, async (req, res) => {
  const validation = validateSportPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { emertimi, pershkrimi, numri_lojtareve, lloji } = validation.value;
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

router.put("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const validation = validateSportPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { emertimi, pershkrimi, numri_lojtareve, lloji } = validation.value;

  try {
    const result = await pool.query(
      `UPDATE sports
       SET emertimi = $1, pershkrimi = $2, numri_lojtareve = $3, lloji = $4
       WHERE id = $5
       RETURNING *`,
      [emertimi, pershkrimi, numri_lojtareve, lloji, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sporti nuk u gjet" });
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
      `DELETE FROM sports
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sporti nuk u gjet" });
    }
    res.json({ message: "Sporti u fshi me sukses", deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
