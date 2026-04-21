import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";
const router = express.Router();


// Rruge per te marre te gjithe referejte
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM referees ORDER BY id");
        res.send(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rruge per te marre nje referi specifik ne baze te ID-se se tij
// GET /referees/:id
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("SELECT * FROM referees WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Referi nuk u gjet" });
        }
        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rruge per te krijuar nje referi te ri. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
// POST /referees
router.post("/", protect, requireAdmin, async (req, res) => {
    const { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh } = req.body;

    try {
        const result = await pool.query(`
        INSERT INTO referees (emri,mbiemri,email,telefoni,nr_licences,kategoria,pervoja_vitesh) VALUES ($1, $2 , $3, $4, $5, $6, $7)RETURNING *`,
            [emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh]
        );
        res.status(201).json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rruge per te perditesuar nje referi ekzistues ne baze te ID-se se tij. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
// PUT /referees/:id
router.put("/:id", protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh } = req.body;
    try {
        const result = await pool.query(`
        UPDATE referees SET emri=$1,mbiemri=$2,email=$3,telefoni=$4,nr_licences=$5,kategoria=$6,pervoja_vitesh =$7  WHERE id = $8 RETURNING *`,
            [emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Referi nuk u gjet" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rruge per te fshire nje referi ekzistues ne baze te ID-se se tij. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
// DELETE /referees/:id\
router.delete("/:id", protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM referees WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Referi nuk u gjet" });

        }
        res.json({ message: "Referi u fshi me sukses" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Eksporto router-in per tu perdorur ne server.js
export default router;
