import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Route for getting all match results with detailed data. This route is protected.
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
            mr.id,
            mr.ndeshja_id,
            mr.golat_shtepiak,
            mr.golat_mysafir,
            mr.fitues_id,
            t_fitues.emertimi AS fitues_emri,
            mr.shenime,
            mr.mvp_id,
            CONCAT(p.emri, ' ', p.mbiemri) AS mvp_emr_mbiemr,
            m.ekipi_shtepiak_id,
            t_shtepiak.emertimi AS ekipi_shtepiak,
            m.ekipi_mysafir_id,
            t_mysafir.emertimi AS ekipi_mysafir,
            m.data_ndeshjes,
            m.ora_fillimit,
            m.statusi,
            m.faza,
            tu.emertimi AS turneu_emri
        FROM MatchResults mr
        LEFT JOIN Matches m ON mr.ndeshja_id = m.id
        LEFT JOIN Teams t_fitues ON mr.fitues_id = t_fitues.id
        LEFT JOIN Teams t_shtepiak ON m.ekipi_shtepiak_id = t_shtepiak.id
        LEFT JOIN Teams t_mysafir ON m.ekipi_mysafir_id = t_mysafir.id
        LEFT JOIN Players p ON mr.mvp_id = p.id
        LEFT JOIN Tournaments tu ON m.turneu_id = tu.id
        ORDER BY m.data_ndeshjes DESC;`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new match result. This route is protected and only admins can use it.
router.post("/", protect, requireAdmin, async (req, res) => {
  const {
    ndeshja_id,
    golat_shtepiak,
    golat_mysafir,
    fitues_id,
    shenime,
    mvp_id,
  } = req.body;

  if (!ndeshja_id) {
    return res.status(400).json({
      error: "Plotesoni fushat e detyrueshme.",
    });
  }

  try {
    const created = await pool.query(
      "INSERT INTO MatchResults (ndeshja_id, golat_shtepiak, golat_mysafir, fitues_id, shenime, mvp_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [ndeshja_id, golat_shtepiak, golat_mysafir, fitues_id, shenime, mvp_id],
    );
    const result = await pool.query(
      `SELECT 
            mr.id,
            mr.ndeshja_id,
            mr.golat_shtepiak,
            mr.golat_mysafir,
            mr.fitues_id,
            t_fitues.emertimi AS fitues_emri,
            mr.shenime,
            mr.mvp_id,
            CONCAT(p.emri, ' ', p.mbiemri) AS mvp_emr_mbiemr,
            m.ekipi_shtepiak_id,
            t_shtepiak.emertimi AS ekipi_shtepiak,
            m.ekipi_mysafir_id,
            t_mysafir.emertimi AS ekipi_mysafir,
            m.data_ndeshjes,
            m.ora_fillimit,
            m.statusi,
            m.faza,
            tu.emertimi AS turneu_emri
        FROM MatchResults mr
        LEFT JOIN Matches m ON mr.ndeshja_id = m.id
        LEFT JOIN Teams t_fitues ON mr.fitues_id = t_fitues.id
        LEFT JOIN Teams t_shtepiak ON m.ekipi_shtepiak_id = t_shtepiak.id
        LEFT JOIN Teams t_mysafir ON m.ekipi_mysafir_id = t_mysafir.id
        LEFT JOIN Players p ON mr.mvp_id = p.id
        LEFT JOIN Tournaments tu ON m.turneu_id = tu.id
        WHERE mr.id = $1`,
      [created.rows[0].id],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing match result by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    ndeshja_id,
    golat_shtepiak,
    golat_mysafir,
    fitues_id,
    shenime,
    mvp_id,
  } = req.body;

  try {
    const updated = await pool.query(
      "UPDATE MatchResults SET ndeshja_id = $1, golat_shtepiak = $2, golat_mysafir = $3, fitues_id = $4, shenime = $5, mvp_id = $6 WHERE id = $7 RETURNING *",
      [
        ndeshja_id,
        golat_shtepiak,
        golat_mysafir,
        fitues_id,
        shenime,
        mvp_id,
        id,
      ],
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Match result not found." });
    }

    const result = await pool.query(
      `SELECT 
            mr.id,
            mr.ndeshja_id,
            mr.golat_shtepiak,
            mr.golat_mysafir,
            mr.fitues_id,
            t_fitues.emertimi AS fitues_emri,
            mr.shenime,
            mr.mvp_id,
            CONCAT(p.emri, ' ', p.mbiemri) AS mvp_emr_mbiemr,
            m.ekipi_shtepiak_id,
            t_shtepiak.emertimi AS ekipi_shtepiak,
            m.ekipi_mysafir_id,
            t_mysafir.emertimi AS ekipi_mysafir,
            m.data_ndeshjes,
            m.ora_fillimit,
            m.statusi,
            m.faza,
            tu.emertimi AS turneu_emri
        FROM MatchResults mr
        LEFT JOIN Matches m ON mr.ndeshja_id = m.id
        LEFT JOIN Teams t_fitues ON mr.fitues_id = t_fitues.id
        LEFT JOIN Teams t_shtepiak ON m.ekipi_shtepiak_id = t_shtepiak.id
        LEFT JOIN Teams t_mysafir ON m.ekipi_mysafir_id = t_mysafir.id
        LEFT JOIN Players p ON mr.mvp_id = p.id
        LEFT JOIN Tournaments tu ON m.turneu_id = tu.id
        WHERE mr.id = $1`,
      [id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing match result by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `WITH deleted AS (
            DELETE FROM MatchResults
            WHERE id = $1
            RETURNING *
            )
            SELECT 
                mr.id,
                mr.ndeshja_id,
                mr.golat_shtepiak,
                mr.golat_mysafir,
                mr.fitues_id,
                t_fitues.emertimi AS fitues_emri,
                mr.shenime,
                mr.mvp_id,
                CONCAT(p.emri, ' ', p.mbiemri) AS mvp_emr_mbiemr,
                m.ekipi_shtepiak_id,
                t_shtepiak.emertimi AS ekipi_shtepiak,
                m.ekipi_mysafir_id,
                t_mysafir.emertimi AS ekipi_mysafir,
                m.data_ndeshjes,
                m.ora_fillimit,
                m.statusi,
                m.faza,
                tu.emertimi AS turneu_emri
            FROM MatchResults mr
            LEFT JOIN Matches m ON mr.ndeshja_id = m.id
            LEFT JOIN Teams t_fitues ON mr.fitues_id = t_fitues.id
            LEFT JOIN Teams t_shtepiak ON m.ekipi_shtepiak_id = t_shtepiak.id
            LEFT JOIN Teams t_mysafir ON m.ekipi_mysafir_id = t_mysafir.id
            LEFT JOIN Players p ON mr.mvp_id = p.id
            LEFT JOIN Tournaments tu ON m.turneu_id = tu.id
            WHERE mr.id = $1`,
      [id],
    );
    if(result.rows.length === 0){
        return res.status(404).json({ error: "Couldnt find Match"});
    }
    res.json({ message: "Match deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;