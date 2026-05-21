import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import Joi from "joi";

const router = express.Router();

// Route for getting all active sessions/users
router.get("/", protect, requireRole("is_admin"), async(req, res) => {
    try {
        const session = await prisma.session.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { id: true, email: true, emri: true, mbiemri: true }
                }
            }
        });

        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Route for deleting an existing session by id
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
    const sessionId = req.params.id;
    if (!sessionId) {
        return res.status(400).json({ error: "Invalid session id" });
    }

    try {
        const existingSession = await prisma.session.findUnique({
            where: { id: sessionId }
        })
        if (!existingSession) {
            return res.status(404).json({ error: "Sesssion not found" });
        }

        const deleteSession = await prisma.session.delete({
            where: { id: sessionId }
        });
        res.json({ message: "Session deleted successfully", deleted: deleteSession });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

export default router;