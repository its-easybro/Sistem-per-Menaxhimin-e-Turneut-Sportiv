import express from "express";
import pool from "../config/db.js";
const router = express.Router();


router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM teams ORDER BY id");
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });

    }
});

router.post("/", async (req, res) => {
    const {

        emertimi,
        logoja,
        trajneri,
        kontakti,
        email,
        qyteti,
        data_themelimit,
    } = req.body;
    if (!emertimi || !trajneri || !kontakti || !email || !qyteti || !data_themelimit) {
        return res.status(400).json({
            error: "Fushat e detyrueshme: emertimi, trajneri, kontakti, email, qyteti, data_themelimit",
        });
    }
    try {
        const result = await pool.query(
            "INSERT INTO teams (emertimi, logoja, trajneri, kontakti, email, qyteti, data_themelimit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [
                emertimi,
                logoja,
                trajneri,
                kontakti,
                email,
                qyteti,
                data_themelimit,
            ],
        );
        res.status(201).json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const {
        emertimi,
        logoja,
        trajneri,
        kontakti,
        email,
        qyteti,
        data_themelimit,
    } = req.body;
    try {
        const result = await pool.query(
            "UPDATE teams SET emertimi = $1, logoja = $2, trajneri = $3, kontakti = $4, email = $5, qyteti = $6, data_themelimit = $7 WHERE id = $8 RETURNING *",
            [
                emertimi,
                logoja,
                trajneri,
                kontakti,
                email,
                qyteti,
                data_themelimit,
                id,
            ],


        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Ekipi nuk u gjet" });
        }
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "DELETE FROM teams WHERE id = $1 RETURNING *",
            [id],

        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Ekipi nuk u gjet" });

        }
        res.json({ message: "Ekipi u fshi me sukses" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;




