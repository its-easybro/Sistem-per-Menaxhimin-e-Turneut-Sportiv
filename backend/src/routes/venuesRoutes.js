import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";
const router = express.Router();

// Route for getting all venues. This route is public.
router.get("/", async (req, res) => {
    try{
        const result = await pool.query("SELECT * FROM venues ORDER BY id");
        res.send(result.rows);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// GET /venues/:id - Route for getting a specific venue by its ID
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query("SELECT * FROM venues WHERE id = $1", [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Venue not found" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Route for creating a new venue. This route is protected and only admins can use it.
router.post("/", protect, requireAdmin, async (req, res) => {
    const { emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi } = req.body;
    try{
        const result = await pool.query(`
            INSERT INTO venues (emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, 
            [emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi]
        );
        res.status(201).json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Route for updating an existing venue by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi } = req.body;
    try{
        const result = await pool.query(`
            UPDATE venues SET emertimi = $1, adresa = $2, qyteti = $3, kapaciteti = $4, lloji_siperfaqes = $5, ndricimi = $6, statusi = $7 WHERE id = $8 RETURNING *`, 
            [emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi, id]
        );
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Venue not found" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Route for deleting an existing venue by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query("DELETE FROM venues WHERE id = $1 RETURNING *", [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Venue not found" });
        }
        res.json({ message: "Venue deleted successfully", deletedVenue: result.rows[0] });
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Export the router to be used in server.js
export default router;