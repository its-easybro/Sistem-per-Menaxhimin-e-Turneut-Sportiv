import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";
import path from "path";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.id,
        p.emri,
        p.mbiemri,
        p.data_lindjes,
        COALESCE(t.emertimi, 'No Team') AS ekipi_id,
        p.pozicioni,
        p.numri,
        p.gjatesia,
        p.pesha,
        p.kombesia
      FROM players p
      LEFT JOIN teams t ON p.ekipi_id = t.id
      ORDER BY p.id`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", protect, requireAdmin, async (req, res) => {
  const {
    emri,
    mbiemri,
    data_lindjes,
    ekipi_id,
    pozicioni,
    numri,
    gjatesia,
    pesha,
    kombesia,
  } = req.body;


  if (!emri || !mbiemri || !data_lindjes || !pozicioni || !numri) {
    return res.status(400).json({
      error: "Fushat e detyrueshme: emri, mbiemri, data_lindjes, pozicioni, numri",
    });
  }

  try {
    const created = await pool.query(
      "INSERT INTO players (emri, mbiemri, data_lindjes, ekipi_id, pozicioni, numri, gjatesia, pesha, kombesia) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        emri,
        mbiemri,
        data_lindjes,
        ekipi_id,
        pozicioni,
        numri,
        gjatesia,
        pesha,
        kombesia
      ],
    );

    const result = await pool.query(
      `SELECT 
        p.id,
        p.emri,
        p.mbiemri,
        p.data_lindjes,
        COALESCE(t.emertimi, 'No Team') AS ekipi_id,
        p.pozicioni,
        p.numri,
        p.gjatesia,
        p.pesha,
        p.kombesia
      FROM players p
      LEFT JOIN teams t ON p.ekipi_id = t.id
      WHERE p.id = $1`,
      [created.rows[0].id],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    emri,
    mbiemri,
    data_lindjes,
    ekipi_id,
    pozicioni,
    numri,
    gjatesia,
    pesha,
    kombesia,
  } = req.body;
  try {
    const updated = await pool.query(
      "UPDATE players SET emri = $1, mbiemri = $2, data_lindjes = $3, ekipi_id = $4, pozicioni = $5, numri = $6, gjatesia = $7, pesha = $8, kombesia = $9 WHERE id = $10 RETURNING *",
      [
        emri,
        mbiemri,
        data_lindjes,
        ekipi_id,
        pozicioni,
        numri,
        gjatesia,
        pesha,
        kombesia,
        id,
      ],
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Lojtari nuk u gjet" });
    }

    const result = await pool.query(
      `SELECT 
        p.id,
        p.emri,
        p.mbiemri,
        p.data_lindjes,
        COALESCE(t.emertimi, 'No Team') AS ekipi_id,
        p.pozicioni,
        p.numri,
        p.gjatesia,
        p.pesha,
        p.kombesia
      FROM players p
      LEFT JOIN teams t ON p.ekipi_id = t.id
      WHERE p.id = $1`,
      [id],
    );

    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `WITH deleted AS (
        DELETE FROM players
        WHERE id = $1
        RETURNING *
      )
      SELECT 
        d.id,
        d.emri,
        d.mbiemri,
        d.data_lindjes,
        COALESCE(t.emertimi, 'No Team') AS ekipi_id,
        d.pozicioni,
        d.numri,
        d.gjatesia,
        d.pesha,
        d.kombesia
      FROM deleted d
      LEFT JOIN teams t ON d.ekipi_id = t.id`,
      [id]
    );
    if (result.rows.length === 0){
        return res.status(404).json({ error: "Lojtari nuk u gjet "});
    }
    res.json({ message: "Lojtari u fshi me sukses", deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
