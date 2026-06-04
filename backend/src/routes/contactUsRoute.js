import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import Joi from "joi";

const router = express.Router();

const MESSAGE_MAX_LENGTH = 500;
const SUBJECT_MAX_LENGTH = 120;

const CATEGORY_VALUES = ["dispute", "upgrade", "bug", "other"];

function buildContactMessageFilters(query) {
    const where = {};
    const search = String(query.search || "").trim();

    if (query.status === "unread") {
        where.lexuar = false;
    } else if (query.status === "read") {
        where.lexuar = true;
    }

    if (search) {
        where.OR = [
            { emri: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { subjekti: { contains: search, mode: "insensitive" } },
            { kategoria: { contains: search, mode: "insensitive" } },
            { mesazhi: { contains: search, mode: "insensitive" } },
        ];
    }

    return where;
}

// Validation Schemas
const contactMessageSchema = Joi.object({
  emri: Joi.string().trim().required().messages({
    "string.empty": "Name is required.",
    "any.required": "Name is required.",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.email": "Email must be valid.",
    "any.required": "Email is required.",
  }),
    kategoria: Joi.string().trim().valid(...CATEGORY_VALUES).default("other").messages({
        "any.only": "Category is invalid.",
    }),
    subjekti: Joi.string().trim().max(SUBJECT_MAX_LENGTH).allow("", null).optional().messages({
        "string.max": `Subject must be ${SUBJECT_MAX_LENGTH} characters or less.`,
    }),
  mesazhi: Joi.string().trim().max(MESSAGE_MAX_LENGTH).required().messages({
    "string.empty": "Message is required.",
    "string.max": `Message must be ${MESSAGE_MAX_LENGTH} characters or less.`,
    "any.required": "Message is required.",
  }),
});

router.get("/", protect, requireRole("is_admin"), async (req, res) => {
    const page = req.query.page ? Math.max(1, parseInt(req.query.page) || 1) : null;
    const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit) || 10) : null;
    const skip = page && limit ? (page - 1) * limit : undefined;
    const where = buildContactMessageFilters(req.query);

    try{
        const [msg, unreadCount] = await Promise.all([
            prisma.contactMessages.findMany({
                where,
                orderBy: { created_at: "desc" },
                ...(page && limit ? { skip, take: limit } : {}),
            }),
            prisma.contactMessages.count({ where: { lexuar: false } }),
        ]);

        if (page && limit) {
            const total = await prisma.contactMessages.count({ where });
            const totalPages = Math.max(1, Math.ceil(total / limit));

            return res.status(200).json({
                data: msg,
                unreadCount,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            });
        }

        res.status(200).json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post("/", async (req, res) => {
    try {
        const { error, value } = contactMessageSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { emri, email, kategoria, subjekti, mesazhi } = value;

        const msg = await prisma.contactMessages.create({
            data: {
                emri,
                email,
                kategoria,
                subjekti: subjekti || null,
                mesazhi,
            }
        });
        res.status(201).json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
