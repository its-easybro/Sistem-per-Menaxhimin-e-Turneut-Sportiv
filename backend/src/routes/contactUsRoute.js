import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
const router = express.Router()

const MESSAGE_MAX_LENGTH = 500;

router.get("/", protect, requireRole("is_admin"), async (req, res) => {
    try{
        const msg = await prisma.contactMessages.findMany({
            orderBy: { created_at: "desc" }
        })
        res.status(200).json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post("/", async (req, res) => {
    const { emri, email, mesazhi } = req.body;

    if (!emri || !email || !mesazhi) {
        return res.status(400).json({ error: "All fields are required"})
    }

    if (mesazhi.length > MESSAGE_MAX_LENGTH) {
        return res.status(400).json({ error: `Message must be ${MESSAGE_MAX_LENGTH} characters or less.` });
    }

    try{
        const msg = await prisma.contactMessages.create({
            data: { emri, email, mesazhi }
        })
        res.status(201).json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

// Mark as read
router.patch("/:id/read", protect, requireRole("is_admin"), async (req, res) => {
    const { id } = req.params;
    try{
        const msg = await prisma.contactMessages.update({
            where: { id: Number(id) },
            data: { lexuar: true, lexuar_at: new Date() }
        })
        res.json(msg)
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
    const { id } = req.params;
    try{
        await prisma.contactMessages.delete({
            where: { id: Number(id) }
        })
        res.json({ message: "Message delete successfully" })
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

export default router;