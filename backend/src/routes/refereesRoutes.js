import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
const router = express.Router();

function parsePositiveInt(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

// Route for getting all referees. This route is public.
router.get("/", protect,async (req, res) => {
    try {
        const referees = await prisma.referees.findMany({
            orderBy: { id: "asc" },
        });
        res.json(referees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for getting a specific referee by their ID. This route is public.
// GET /referees/:id
router.get("/:id", protect, async (req, res) => {
    const refereeId = parsePositiveInt(req.params.id);
    if (!refereeId) {
        return res.status(400).json({ error: "Invalid referee id" });
    }
    try {
        const referee = await prisma.referees.findUnique({
            where: { id: refereeId },
        });
        if (!referee) {
            return res.status(404).json({ error: "Referee not found" });
        }
        res.json(referee);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for creating a new referee. This route is protected and only admins can use it.
// POST /referees
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
    const { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh } = req.body;

    try {
        const referee = await prisma.referees.create({
            data: {
                emri,
                mbiemri,
                email,
                telefoni,
                nr_licences,
                kategoria,
                pervoja_vitesh,
            },
        });
        res.status(201).json(referee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for updating an existing referee by their ID. This route is protected and only admins can use it.
// PUT /referees/:id
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
    const refereeId = parsePositiveInt(req.params.id);
    if (!refereeId) {
        return res.status(400).json({ error: "Invalid referee id" });
    }
    const { emri, mbiemri, email, telefoni, nr_licences, kategoria, pervoja_vitesh } = req.body;
    try {
        const existingReferee = await prisma.referees.findUnique({
            where: { id: refereeId },
        });
        if (!existingReferee) {
            return res.status(404).json({ error: "Referee not found" });
        }

        const referee = await prisma.referees.update({
            where: { id: refereeId },
            data: {
                emri,
                mbiemri,
                email,
                telefoni,
                nr_licences,
                kategoria,
                pervoja_vitesh,
            },
        });
        res.json(referee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for deleting an existing referee by their ID. This route is protected and only admins can use it.
// DELETE /referees/:id\
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
    const refereeId = parsePositiveInt(req.params.id);
    if (!refereeId) {
        return res.status(400).json({ error: "Invalid referee id" });
    }
    try {
        const existingReferee = await prisma.referees.findUnique({
            where: { id: refereeId },
        });
        if (!existingReferee) {
            return res.status(404).json({ error: "Referee not found" });
        }

        const referee = await prisma.referees.delete({
            where: { id: refereeId },
        });
        res.json({ message: "Referee deleted successfully", deletedReferee: referee });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export router for use in server.js
export default router;
