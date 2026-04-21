import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";
const router = express.Router();

// Rruge per te marre te gjithe vendodhjet e mundshme te turneve
router.get("/", async (req, res) => {
    try{
        const result = await pool.query("SELECT * FROM venues ORDER BY id");
        res.send(result.rows);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// GET /venues/:id - Rruge per te marre nje venue specifike ne baze te ID-se se tij
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query("SELECT * FROM venues WHERE id = $1", [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Vendodhja nuk u gjet" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Rruge per te krijuar nje venue te re. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
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

// Rruge per te perditesuar nje venue ekzistues ne baze te ID-se se tij. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
router.put("/:id", protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi } = req.body;
    try{
        const result = await pool.query(`
            UPDATE venues SET emertimi = $1, adresa = $2, qyteti = $3, kapaciteti = $4, lloji_siperfaqes = $5, ndricimi = $6, statusi = $7 WHERE id = $8 RETURNING *`, 
            [emertimi, adresa, qyteti, kapaciteti, lloji_siperfaqes, ndricimi, statusi, id]
        );
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Vendodhja nuk u gjet" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Rruge per te fshire nje venue ekzistues ne baze te ID-se se tij. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
router.delete("/:id", protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query("DELETE FROM venues WHERE id = $1 RETURNING *", [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Vendodhja nuk u gjet" });
        }
        res.json({ message: "Vendodhja u fshi me sukses", deletedVenue: result.rows[0] });
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Eksporto router-in per tu perdorur ne server.js
export default router;