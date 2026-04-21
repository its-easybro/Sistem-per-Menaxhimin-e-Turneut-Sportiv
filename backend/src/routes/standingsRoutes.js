import express from "express";
import pool from "../config/db.js";
import { protect, requireAdmin } from "../middleware/auth.js";
const router = express.Router();

// Rruge per te marre te gjithe klasifimet. Kjo rruge eshte e mbrojtur.
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM standings ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rruge per te marre nje klasifikim specifik ne baze te ID-se se tij. Kjo rruge eshte e mbrojtur.
router.get("/:id", protect, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM standings WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "The standing was not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rruge per te krijuar nje klasifikim te ri. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
router.post("/", protect, requireAdmin, async (req, res) => {
  const {
    turneu_id,
    ekipi_id,
    ndeshjet_luajtura,
    fitoret,
    barazimet,
    humbjet,
    golat_shenuar,
    golat_pranuar,
    piket,
  } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO standings (turneu_id, ekipi_id, ndeshjet_luajtura, fitoret, barazimet, humbjet, golat_shenuar, golat_pranuar, piket) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        turneu_id,
        ekipi_id,
        ndeshjet_luajtura,
        fitoret,
        barazimet,
        humbjet,
        golat_shenuar,
        golat_pranuar,
        piket,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rruge per te perditesuar nje klasifikim ekzistues ne baze te ID-se se tij. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
router.put("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    turneu_id,
    ekipi_id,
    ndeshjet_luajtura,
    fitoret,
    barazimet,
    humbjet,
    golat_shenuar,
    golat_pranuar,
    piket,
  } = req.body;
  try {
    const result = await pool.query(
      "UPDATE standings SET turneu_id = $1, ekipi_id = $2, ndeshjet_luajtura = $3, fitoret = $4, barazimet = $5, humbjet = $6, golat_shenuar = $7, golat_pranuar = $8, piket = $9 WHERE id = $10 RETURNING *",
      [
        turneu_id,
        ekipi_id,
        ndeshjet_luajtura,
        fitoret,
        barazimet,
        humbjet,
        golat_shenuar,
        golat_pranuar,
        piket,
        id,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "The standing was not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rruge per te fshire nje klasifikim ekzistues ne baze te ID-se se tij. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
router.delete("/:id", protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM standings WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "The standing was not found" });
    }
    res.json({ message: "The standing was deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eksporto router-in per tu perdorur ne server.js
export default router;
