import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try{
        const result = await pool.query("SELECT * FROM tournaments ORDER BY id");
        res.send(result.rows);   
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query("SELECT * FROM tournaments WHERE id = $1", [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Turneu nuk u gjet" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

router.post("/", protect, requireAdmin, async (req, res) => {
    const { emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, cmimi_regjistrimit, statusi, pershkrimi } = req.body;
    const organizatori_id = req.user.id; // Assuming the user ID is stored in req.user after authentication
    try{
        const result = await pool.query(`
            INSERT INTO tournaments (emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, organizatori_id, cmimi_regjistrimit, statusi, pershkrimi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, 
            [emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, organizatori_id, cmimi_regjistrimit, statusi, pershkrimi]
        );
        res.status(201).json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });

    }
});

router.put("/:id",protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, cmimi_regjistrimit, statusi, pershkrimi } = req.body;
    try{
        const result = await pool.query(`
            UPDATE tournaments SET emertimi = $1, sporti_id = $2, lloji = $3, data_fillimit = $4, data_perfundimit = $5, lokacioni = $6, cmimi_regjistrimit = $7, statusi = $8, pershkrimi = $9 WHERE id = $10 RETURNING *`, 
            [emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, cmimi_regjistrimit, statusi, pershkrimi, id]
        );
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Turneu nuk u gjet" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

router.delete("/:id",protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query("DELETE FROM tournaments WHERE id = $1 RETURNING *", [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Turneu nuk u gjet" });
        }
        res.json({ message: "Turneu u fshi me sukses", deletedTournament: result.rows[0] });
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

export default router;
