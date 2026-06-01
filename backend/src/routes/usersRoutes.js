import express from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";
import Joi from "joi";

const router = express.Router();

// Validation Schemas
const userCreateSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email must be valid",
    "any.required": "Email is required",
  }),
  username: Joi.string().min(3).max(30).required().messages({
    "string.min": "Username must be at least 3 characters",
    "string.max": "Username must be less than 30 characters",
    "any.required": "Username is required",
  }),
  full_name: Joi.string().optional(),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
  roli: Joi.string()
    .valid("admin", "organizator", "gjyqtar", "user")
    .optional()
    .messages({
      "any.only": "Role must be admin, organizator, gjyqtar, or user",
    }),
});

const userUpdateSchema = Joi.object({
  email: Joi.string().email().optional().messages({
    "string.email": "Email must be valid",
  }),
  username: Joi.string().min(3).max(30).optional().messages({
    "string.min": "Username must be at least 3 characters",
    "string.max": "Username must be less than 30 characters",
  }),
  full_name: Joi.string().optional(),
  roli: Joi.string()
    .valid("admin", "organizator", "gjyqtar", "user")
    .optional()
    .messages({
      "any.only": "Role must be admin, organizator, gjyqtar, or user",
    }),
  password: Joi.string().min(6).optional().allow("", null).messages({
    "string.min": "Password must be at least 6 characters",
  }),
});

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.emri,
    full_name: [user.emri, user.mbiemri].filter(Boolean).join(" ") || null,
    roli: user.roli,
    is_admin: user.roli === "admin",
    is_organizer: user.roli === "organizator",
    is_referee: user.roli === "gjyqtar",
    created_at: user.createdAt ?? null,
  };
}

// Helper function to split a full name into first name and last name, or use the username as a fallback for the first name if the full name is not provided
function splitName(fullName = "", fallbackUsername = "") {
  const normalizedFullName =
    typeof fullName === "string" ? fullName.trim().replace(/\s+/g, " ") : "";
  const normalizedUsername =
    typeof fallbackUsername === "string" ? fallbackUsername.trim() : "";

  if (normalizedFullName) {
    const [emri, ...rest] = normalizedFullName.split(" ");
    return { emri, mbiemri: rest.join(" ") };
  }

  return { emri: normalizedUsername, mbiemri: "" };
}

async function ensureRefereeRecord(user) {
  if (!user || user.roli !== "gjyqtar") {
    return;
  }

  const existingReferee = await prisma.referees.findFirst({
    where: { user_id: user.id },
    select: { id: true },
  });

  if (existingReferee) {
    return;
  }

  await prisma.referees.create({
    data: {
      emri: user.emri,
      mbiemri: user.mbiemri,
      email: user.email,
      user_id: user.id,
    },
  });
}

// Route for getting all users. This route is protected and only admins can use it.
router.get("/", protect, requireRole("is_admin"), async (req, res) => {
  const returnAll = req.query.limit === "all";
  const page = returnAll ? 1 : Math.max(1, parseInt(req.query.page) || 1);
  const limit = returnAll ? null : Math.max(1, parseInt(req.query.limit) || 10);
  const skip = returnAll ? undefined : (page - 1) * limit;
  const { roli, search } = req.query;

  const where = {};

  if (roli) where.roli=roli;
  if(search) {
    where.OR = [
      { emri: { contains: search, mode: "insensitive"} },
      { mbiemri: { contains: search, mode: "insensitive"} },
      { email: { contains: search, mode: "insensitive"} },
    ]
  }

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        ...(returnAll ? {} : { skip, take: limit }),
        orderBy: { id: "asc" },
        select: {
          id: true,
          emri: true,
          mbiemri: true,
          email: true,
          roli: true,
          statusi: true,
          createdAt: true,
        }
      })
    ])
    res.json({
      data: users.map(formatUserResponse),
      pagination: returnAll
        ? null
        : {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          }
    })
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new user. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  try {
    const { error, value } = userCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, username, full_name, password, roli } = value;

    const userExists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (userExists) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { emri, mbiemri } = splitName(full_name, username);
    const validRoles = ["admin", "organizator", "gjyqtar", "user"];
    const userRole = validRoles.includes(roli) ? roli : "user";

    const createdUser = await prisma.user.create({
      data: {
        email,
        emri,
        mbiemri,
        password: hashedPassword,
        roli: userRole,
        statusi: "Aktiv",
      },
    });

    await ensureRefereeRecord(createdUser);

    res.status(201).json(formatUserResponse(createdUser));
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing user by their ID. This route is protected and only admins or the user themselves can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const userId = parsePositiveInt(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const { error, value } = userUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, username, full_name, roli, password } = value;

    if (!req.user.is_admin && req.user.id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const validRoles = ["admin", "organizator", "gjyqtar", "user"];
    const userRole = validRoles.includes(roli) ? roli : undefined;
    const shouldUpdateName = full_name !== undefined || username !== undefined;
    const nameParts = shouldUpdateName ? splitName(full_name, username) : null;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(email !== undefined && { email }),
        ...(nameParts && { emri: nameParts.emri, mbiemri: nameParts.mbiemri }),
        ...(userRole !== undefined && { roli: userRole }),
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      },
    });

    await ensureRefereeRecord(updatedUser);

    res.json(formatUserResponse(updatedUser));
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing user by their ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const userId = parsePositiveInt(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const deletedUser = await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      message: "User deleted successfully",
      deleted: formatUserResponse(deletedUser),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the router to be used in server.js
export default router;
