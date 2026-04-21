import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Posible types of tournaments
const tournamentTypeOptions = [
    "Grup + Eliminim",
    "Vetëm Grup",
    "Vetëm Eliminim",
    "Liga",
];

// Posible statuses of tournaments
const tournamentStatusOptions = [
    "Regjistrimi",
    "Aktiv",
    "Përfunduar",
    "Anuluar",
];

// Validates the tournament data and converts it to the appropriate format for the database
function validateTournamentPayload(body) {
    const {
        emertimi,
        sporti_id,
        lloji,
        data_fillimit,
        data_perfundimit,
        lokacioni,
        cmimi_regjistrimit,
        statusi = "Regjistrimi",
        pershkrimi,
    } = body;

    if (!emertimi?.trim()) {
        return { error: "The tournament name is required." };
    }

    const sportId = Number(sporti_id);
    if (!Number.isInteger(sportId) || sportId <= 0) {
        return { error: "The sport ID is invalid." };
    }

    if (!tournamentTypeOptions.includes(lloji)) {
        return { error: `The type must be one of: ${tournamentTypeOptions.join(", ")}.` };
    }

    if (!tournamentStatusOptions.includes(statusi)) {
        return { error: `The status must be one of: ${tournamentStatusOptions.join(", ")}.` };
    }

    if (!data_fillimit || !data_perfundimit) {
        return { error: "The start date and end date are required." };
    }

    // Validates the dates and ensures that the end date is after the start date
    const startDate = new Date(data_fillimit);
    const endDate = new Date(data_perfundimit);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return { error: "The tournament dates are invalid." };
    }

    if (endDate <= startDate) {
        return { error: "The end date must be after the start date." };
    }

    // Validates the registration price, it can be empty (default to 0) but if given it must be a non-negative number
    const registrationPrice =
        cmimi_regjistrimit === "" || cmimi_regjistrimit === null || cmimi_regjistrimit === undefined
            ? 0
            : Number(cmimi_regjistrimit);

    if (!Number.isFinite(registrationPrice) || registrationPrice < 0) {
        return { error: "The registration price must be a non-negative number." };
    }

    return {
        value: {
            emertimi: emertimi.trim(),
            sporti_id: sportId,
            lloji,
            data_fillimit,
            data_perfundimit,
            lokacioni: lokacioni?.trim() || null,
            cmimi_regjistrimit: registrationPrice,
            statusi,
            pershkrimi: pershkrimi?.trim() || null,
        },
    };
}

// Route for getting all tournaments
router.get("/", async (req, res) => {
    try{
        const result = await pool.query("SELECT * FROM tournaments ORDER BY id");
        res.send(result.rows);   
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Route for getting a specific tournament by its ID
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query("SELECT * FROM tournaments WHERE id = $1", [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Tournament not found" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Route for creating a new tournament. This route is protected and only admins can use it.
router.post("/", protect, requireAdmin, async (req, res) => {
    const validation = validateTournamentPayload(req.body);
    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }

    const { emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, cmimi_regjistrimit, statusi, pershkrimi } = validation.value;
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

// Route for updating an existing tournament by its ID. This route is protected and only admins can use it.
router.put("/:id",protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const validation = validateTournamentPayload(req.body);
    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }

    const { emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, cmimi_regjistrimit, statusi, pershkrimi } = validation.value;
    try{
        const result = await pool.query(`
            UPDATE tournaments SET emertimi = $1, sporti_id = $2, lloji = $3, data_fillimit = $4, data_perfundimit = $5, lokacioni = $6, cmimi_regjistrimit = $7, statusi = $8, pershkrimi = $9 WHERE id = $10 RETURNING *`, 
            [emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, cmimi_regjistrimit, statusi, pershkrimi, id]
        );
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Tournament not found" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Route for deleting an existing tournament by its ID. This route is protected and only admins can use it.
router.delete("/:id",protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query("DELETE FROM tournaments WHERE id = $1 RETURNING *", [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Tournament not found" });
        }
        res.json({ message: "Tournament deleted successfully", deletedTournament: result.rows[0] });
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Exporting the router to be used in server.js
export default router;
