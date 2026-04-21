import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Tipet e mundshme te turneve
const tournamentTypeOptions = [
    "Grup + Eliminim",
    "Vetëm Grup",
    "Vetëm Eliminim",
    "Liga",
];

// Statuset e mundshme te turneve
const tournamentStatusOptions = [
    "Regjistrimi",
    "Aktiv",
    "Përfunduar",
    "Anuluar",
];

// Validizon te dhenat e turneut dhe i kthen ato ne formatin e duhur per bazen e te dhenave
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
        return { error: "Emertimi i turneut eshte i detyrueshem." };
    }

    const sportId = Number(sporti_id);
    if (!Number.isInteger(sportId) || sportId <= 0) {
        return { error: "Sporti i turneut eshte i pavlefshem." };
    }

    if (!tournamentTypeOptions.includes(lloji)) {
        return { error: `Lloji duhet te jete nje nga: ${tournamentTypeOptions.join(", ")}.` };
    }

    if (!tournamentStatusOptions.includes(statusi)) {
        return { error: `Statusi duhet te jete nje nga: ${tournamentStatusOptions.join(", ")}.` };
    }

    if (!data_fillimit || !data_perfundimit) {
        return { error: "Data e fillimit dhe data e perfundimit jane te detyrueshme." };
    }

    // Validizon datat dhe sigurohet qe data e perfundimit eshte pas dates se fillimit
    const startDate = new Date(data_fillimit);
    const endDate = new Date(data_perfundimit);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return { error: "Datat e turneut nuk jane te vlefshme." };
    }

    if (endDate <= startDate) {
        return { error: "Data e perfundimit duhet te jete pas dates se fillimit." };
    }

    // Normalizon cmimin e regjistrimit, vlera default eshte 0 nese nuk eshte dhene
    const registrationPrice =
        cmimi_regjistrimit === "" || cmimi_regjistrimit === null || cmimi_regjistrimit === undefined
            ? 0
            : Number(cmimi_regjistrimit);

    if (!Number.isFinite(registrationPrice) || registrationPrice < 0) {
        return { error: "Cmimi i regjistrimit duhet te jete numer jo-negativ." };
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

// Rruge per te marre te gjithe turnet
router.get("/", async (req, res) => {
    try{
        const result = await pool.query("SELECT * FROM tournaments ORDER BY id");
        res.send(result.rows);   
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Rruge per te marre nje turne specifik ne baze te ID-se se tij
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

// Rruge per te krijuar nje turne te ri. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
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

// Rruge per te perditesuar nje turne ekzistues ne baze te ID-se se tij. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
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
            return res.status(404).json({ error: "Turneu nuk u gjet" });
        }
        res.json(result.rows[0]);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// Rruge per te fshire nje turne ekzistues ne baze te ID-se se tij. Kjo rruge eshte e mbrojtur dhe vetem adminet mund ta perdorin.
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

// Eksporto router-in per tu perdorur ne server.js
export default router;
