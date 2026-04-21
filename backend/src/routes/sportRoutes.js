import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";
const router = express.Router();

// Posible sport types
const sportTypeOptions = ["Ekipor", "Individual", "I dyfishtë"];

// Normalizes the sport type to handle variations of the same value
function normalizeSportType(value) {
  if (value === "I dyfishtÃ«" || value === "I dyfishte") {
    return "I dyfishtë";
  }

  return value;
}

// Validates the sport data and converts it to the appropriate format for the database
function validateSportPayload(body) {
  const { emertimi, pershkrimi, numri_lojtareve, lloji } = body;

  if (!emertimi?.trim()) {
    return { error: "The sport name is required." };
  }

  const playersCount = Number(numri_lojtareve);
  if (!Number.isInteger(playersCount) || playersCount <= 0) {
    return { error: "The number of players must be a positive integer." };
  }

  const normalizedType = normalizeSportType(lloji);
  if (!sportTypeOptions.includes(normalizedType)) {
    return { error: `The type must be one of: ${sportTypeOptions.join(", ")}.` };
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

// Route for getting all sports. This route is public.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sports ORDER BY id");
    res.send(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific sport by its ID. This route is public.
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM sports WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sport not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new sport. This route is protected and only admins can use it.
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

// Route for updating an existing sport by its ID. This route is protected and only admins can use it.
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
      return res.status(404).json({ error: "Sport not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing sport by its ID. This route is protected and only admins can use it.
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
      return res.status(404).json({ error: "Sport not found" });
    }
    res.json({ message: "Sport deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
