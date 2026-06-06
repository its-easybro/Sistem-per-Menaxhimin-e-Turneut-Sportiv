// Defines session routes for administrators to view and delete user login sessions.
import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import Joi from "joi";

const router = express.Router();

const mobileUserAgentFilters = [
    { userAgent: { contains: "Mobile", mode: "insensitive" } },
    { userAgent: { contains: "Android", mode: "insensitive" } },
    { userAgent: { contains: "iPhone", mode: "insensitive" } },
    { userAgent: { contains: "iPad", mode: "insensitive" } },
    { userAgent: { contains: "iPod", mode: "insensitive" } },
];

function getBrowserFilter(browser) {
    if (browser === "Microsoft Edge") {
        return { userAgent: { contains: "Edg/", mode: "insensitive" } };
    }

    if (browser === "Google Chrome") {
        return {
            AND: [
                { userAgent: { contains: "Chrome/", mode: "insensitive" } },
                { NOT: { userAgent: { contains: "Edg/", mode: "insensitive" } } },
                { NOT: { userAgent: { contains: "OPR/", mode: "insensitive" } } },
                { NOT: { userAgent: { contains: "Opera/", mode: "insensitive" } } },
            ],
        };
    }

    if (browser === "Mozilla Firefox") {
        return { userAgent: { contains: "Firefox/", mode: "insensitive" } };
    }

    if (browser === "Safari") {
        return {
            AND: [
                { userAgent: { contains: "Safari/", mode: "insensitive" } },
                { userAgent: { contains: "Version/", mode: "insensitive" } },
            ],
        };
    }

    if (browser === "Opera") {
        return {
            OR: [
                { userAgent: { contains: "OPR/", mode: "insensitive" } },
                { userAgent: { contains: "Opera/", mode: "insensitive" } },
            ],
        };
    }

    if (browser === "Unknown browser") {
        return { userAgent: null };
    }

    return null;
}

function getDeviceFilter(device) {
    if (device === "Mobile") {
        return { OR: mobileUserAgentFilters };
    }

    if (device === "Desktop") {
        return {
            AND: [
                { userAgent: { not: null } },
                { NOT: { OR: mobileUserAgentFilters } },
            ],
        };
    }

    if (device === "Unknown device") {
        return { userAgent: null };
    }

    return null;
}

function buildSessionFilters(query) {
    const filters = [];
    const search = String(query.search || "").trim();
    const browserFilter = getBrowserFilter(query.browser);
    const deviceFilter = getDeviceFilter(query.device);

    if (search) {
        const searchFilters = [
            { id: { contains: search, mode: "insensitive" } },
            { userAgent: { contains: search, mode: "insensitive" } },
            { ipAddress: { contains: search, mode: "insensitive" } },
            { user: { is: { email: { contains: search, mode: "insensitive" } } } },
            { user: { is: { emri: { contains: search, mode: "insensitive" } } } },
            { user: { is: { mbiemri: { contains: search, mode: "insensitive" } } } },
        ];
        const numericSearch = Number(search);

        if (Number.isInteger(numericSearch)) {
            searchFilters.push({ userId: numericSearch });
        }

        filters.push({ OR: searchFilters });
    }

    if (browserFilter) filters.push(browserFilter);
    if (deviceFilter) filters.push(deviceFilter);

    return filters.length ? { AND: filters } : {};
}

// Route for getting all active sessions/users
router.get("/", protect, requireRole("is_admin"), async(req, res) => {
    const page = req.query.page ? Math.max(1, parseInt(req.query.page) || 1) : null;
    const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit) || 10) : null;
    const skip = page && limit ? (page - 1) * limit : undefined;
    const where = buildSessionFilters(req.query);

    try {
        const select = {
            id: true,
            userId: true,
            expiresAt: true,
            createdAt: true,
            userAgent: true,
            ipAddress: true,
            lastSeenAt: true,
            user: {
                select: { id: true, email: true, emri: true, mbiemri: true }
            }
        };
        const sessions = await prisma.session.findMany({
            where,
            orderBy: { createdAt: "desc" },
            ...(page && limit ? { skip, take: limit } : {}),
            select,
        });

        if (page && limit) {
            const total = await prisma.session.count({ where });
            const totalPages = Math.max(1, Math.ceil(total / limit));

            return res.json({
                data: sessions,
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

        res.json(sessions);
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
