import express from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

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
  const normalizedFullName = typeof fullName === "string" ? fullName.trim().replace(/\s+/g, " ") : "";
  const normalizedUsername = typeof fallbackUsername === "string" ? fallbackUsername.trim() : "";

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
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
    });
    res.json(users.map(formatUserResponse));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new user. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  const { email, username, full_name, password, roli } = req.body;

  try {
    if (!email || !username || !password) {
      return res.status(400).json({ error: "Email, username and password are required" });
    }

    const userExists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (userExists) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { emri, mbiemri } = splitName(full_name, username);
    // Validate role, default to 'user' if not provided
    const validRoles = ['admin', 'organizator', 'gjyqtar', 'user'];
    const userRole = validRoles.includes(roli) ? roli : 'user';

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

  const { email, username, full_name, roli } = req.body;

  if (!req.user.is_admin && req.user.id !== userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const { emri, mbiemri } = splitName(full_name, username);
    // Validate role, if not provided use 'user'
    const validRoles = ['admin', 'organizator', 'gjyqtar', 'user'];
    const userRole = validRoles.includes(roli) ? roli : 'user';

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
        email,
        emri,
        mbiemri,
        roli: userRole,
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
