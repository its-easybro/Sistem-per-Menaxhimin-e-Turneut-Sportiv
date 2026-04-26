import { protect, requireRole } from "../middleware/auth.js";
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
        organizatori_id,
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

    // Allows admins to optionally assign a specific user as the organizer of the tournament.
    let organizerId = null;
    if (organizatori_id !== "" && organizatori_id !== null && organizatori_id !== undefined) {
        organizerId = Number(organizatori_id);

        if (!Number.isInteger(organizerId) || organizerId <= 0) {
            return { error: "The organizer ID is invalid." };
        }
    }

    return {
        value: {
            emertimi: emertimi.trim(),
            sporti_id: sportId,
            lloji,
            data_fillimit,
            data_perfundimit,
            lokacioni: lokacioni?.trim() || null,
            organizatori_id: organizerId,
            cmimi_regjistrimit: registrationPrice,
            statusi,
            pershkrimi: pershkrimi?.trim() || null,
        },
    };
}
// Promotes the selected user to organizer when a tournament is assigned to them.
async function ensureOrganizerUser(userId) {
    if(!userId){
        return null;
    }
    const userResult = await pool.query(
        "SELECT id, roli FROM users WHERE id = $1",
        [userId],
    );
    if (userResult.rows.length === 0) {
        throw new Error("Organizer not found");
    }
    if (!["user", "organizator"].includes(userResult.rows[0].roli)) {
        throw new Error("Only users or organizers can be assigned to a tournament");
    }
    if (userResult.rows[0].roli !== "organizator") {
        await pool.query(
            "UPDATE users SET roli = 'organizator' WHERE id = $1",
            [userId],
        );
    }
    return userResult.rows[0];
}
 
// Route for getting all tournaments
router.get("/", protect, async (req, res) => {
    try{
        let result;

        if (req.user.is_admin) {
            result = await pool.query("SELECT * FROM tournaments ORDER BY id");
        } else if (req.user.is_organizer) {
            // Organizers only receive tournaments that are explicitly assigned to them.
            result = await pool.query(
                "SELECT * FROM tournaments WHERE organizatori_id = $1 ORDER BY id",
                [req.user.id],
            );
        } else {
            return res.status(403).json({ error: "Forbidden" });
        }

        res.send(result.rows);   
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Route for getting a specific tournament by its ID
router.get("/:id", protect, async (req, res) => {
    const { id } = req.params;
    try{
        let result;

        if (req.user.is_admin) {
            result = await pool.query("SELECT * FROM tournaments WHERE id = $1", [id]);
        } else if (req.user.is_organizer) {
            // Prevents an organizer from opening another organizer's tournament by id.
            result = await pool.query(
                "SELECT * FROM tournaments WHERE id = $1 AND organizatori_id = $2",
                [id, req.user.id],
            );
        } else {
            return res.status(403).json({ error: "Forbidden" });
        }

        if(result.rows.length === 0){
            return res.status(404).json({ error: "Tournament not found" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Route for creating a new tournament. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
    const validation = validateTournamentPayload(req.body);
    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }

    const { emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, organizatori_id, cmimi_regjistrimit, statusi, pershkrimi } = validation.value;
    try{
        // When a tournament is assigned, the chosen user automatically becomes an organizer.
        if(organizatori_id){
            await ensureOrganizerUser(organizatori_id);
        }
       

        const result = await pool.query(`
            INSERT INTO tournaments (emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, organizatori_id, cmimi_regjistrimit, statusi, pershkrimi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, 
            [emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, organizatori_id, cmimi_regjistrimit, statusi, pershkrimi]
        );
        res.status(201).json(result.rows[0]);
    }catch(err){
        if (
            err.message === "Organizer not found" ||
            err.message === "Only users or organizers can be assigned to a tournament"
        ) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: err.message });

    }
});

// Route for updating an existing tournament by its ID. This route is protected and only admins can use it.
router.put("/:id",protect, requireRole("is_admin"), async (req, res) => {
    const { id } = req.params;
    const validation = validateTournamentPayload(req.body);
    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }

    const { emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, organizatori_id, cmimi_regjistrimit, statusi, pershkrimi } = validation.value;
    try{
        // Keeps the assigned user and organizer role in sync during tournament edits too.
        if (organizatori_id) {
            await ensureOrganizerUser(organizatori_id);
        }

        const result = await pool.query(`
            UPDATE tournaments SET emertimi = $1, sporti_id = $2, lloji = $3, data_fillimit = $4, data_perfundimit = $5, lokacioni = $6, organizatori_id = $7, cmimi_regjistrimit = $8, statusi = $9, pershkrimi = $10 WHERE id = $11 RETURNING *`, 
            [emertimi, sporti_id, lloji, data_fillimit, data_perfundimit, lokacioni, organizatori_id, cmimi_regjistrimit, statusi, pershkrimi, id]
        );
        if(result.rows.length === 0){
            return res.status(404).json({ error: "Tournament not found" });
        }
        res.json(result.rows[0]);
    }catch(err){
        if (
            err.message === "Organizer not found" ||
            err.message === "Only users or organizers can be assigned to a tournament"
        ) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: err.message });
    }
});

// Route for deleting an existing tournament by its ID. This route is protected and only admins can use it.
router.delete("/:id",protect, requireRole("is_admin"), async (req, res) => {
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
