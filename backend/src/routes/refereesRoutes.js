import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";
const router = express.Router();

// Route for getting all referees. This route is public.
router.get("/", protect,async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM referees ORDER BY id");
        res.send(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for getting a specific referee by their ID. This route is public.
// GET /referees/:id
router.get("/:id", protect, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("SELECT * FROM referees WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Referee not found" });
        }
        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for creating a new referee. This route is protected and only admins can use it.
// POST /referees
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
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

// Route for updating an existing referee by their ID. This route is protected and only admins can use it.
// PUT /referees/:id
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
    const { id } = req.params;
    const { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh } = req.body;
    try {
        const result = await pool.query(`
        UPDATE referees SET emri=$1,mbiemri=$2,email=$3,telefoni=$4,nr_licences=$5,kategoria=$6,pervoja_vitesh =$7  WHERE id = $8 RETURNING *`,
            [emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Referee not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for deleting an existing referee by their ID. This route is protected and only admins can use it.
// DELETE /referees/:id\
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM referees WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Referee not found" });
        }
        res.json({ message: "Referee deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export router for use in server.js
export default router;
