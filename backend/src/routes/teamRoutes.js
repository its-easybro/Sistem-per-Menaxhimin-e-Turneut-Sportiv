import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import multer from "multer";
import path from "path";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Normalizes optional text fields by trimming whitespace and converting empty strings to null
const normalizeOptionalText = (value) => {
    if (typeof value !== "string") return value ?? null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
};

// Normalizes optional date fields by trimming whitespace and converting empty strings to null
const normalizeOptionalDate = (value) => {
    if (typeof value !== "string") return value ?? null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

router.use("/uploads-teams", express.static(path.join(__dirname + "/../uploads/teams")));
const uploadDir = path.join(__dirname, "../uploads/teams")
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + "/../uploads/teams");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow images
    const allowed = ["image/jpeg", "image/png"]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Only JPEG or PNG images are allowed"))
    }
  },
  limits: {fileSize: 5 * 1024 * 1024} // 5MB max
});

router.post("/upload-team-logo", protect, requireRole("is_admin", "is_organizer"), upload.single("logo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const logoUrl = `${req.protocol}://${req.get("host")}/teams/uploads-teams/${req.file.filename}`;
  res.json({ message: "File uploaded successfully", file: req.file, url: logoUrl });
});
// Route for getting all teams
router.get("/", protect, async (req, res) => {
  try {
    const teams = await prisma.teams.findMany({
      orderBy: { id: "asc" },
    });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific team by its ID
router.get("/:id", protect, async (req, res) => {
  const teamId = parsePositiveInt(req.params.id);
  if (!teamId) {
    return res.status(400).json({ error: "Invalid team id" });
  }

  try {
    const team = await prisma.teams.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new team. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  const {
    emertimi,
    logoja,
    trajneri,
    kontakti,
    email,
    qyteti,
    data_themelimit,
  } = req.body;

  if (!emertimi?.trim()) {
    return res.status(400).json({
      error: "The team name is required.",
    });
  }

  const normalizedTeam = {
    emertimi: emertimi.trim(),
    logoja: normalizeOptionalText(logoja),
    trajneri: normalizeOptionalText(trajneri),
    kontakti: normalizeOptionalText(kontakti),
    email: normalizeOptionalText(email),
    qyteti: normalizeOptionalText(qyteti),
    data_themelimit: normalizeOptionalDate(data_themelimit),
  };

  try {
    const createdTeam = await prisma.teams.create({
      data: normalizedTeam,
    });
    res.status(201).json(createdTeam);
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({
        error: "A team with the same unique value already exists.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing team by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const teamId = parsePositiveInt(req.params.id);
  if (!teamId) {
    return res.status(400).json({ error: "Invalid team id" });
  }

  const {
    emertimi,
    logoja,
    trajneri,
    kontakti,
    email,
    qyteti,
    data_themelimit,
  } = req.body;

  if (!emertimi?.trim()) {
    return res.status(400).json({
      error: "The team name is required.",
    });
  }

  const normalizedTeam = {
    emertimi: emertimi.trim(),
    logoja: normalizeOptionalText(logoja),
    trajneri: normalizeOptionalText(trajneri),
    kontakti: normalizeOptionalText(kontakti),
    email: normalizeOptionalText(email),
    qyteti: normalizeOptionalText(qyteti),
    data_themelimit: normalizeOptionalDate(data_themelimit),
  };

  try {
    const existingTeam = await prisma.teams.findUnique({
      where: { id: teamId },
      select: { id: true },
    });
    if (!existingTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    const updatedTeam = await prisma.teams.update({
      where: { id: teamId },
      data: normalizedTeam,
    });

    res.json(updatedTeam);
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({
        error: "A team with the same unique value already exists.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing team by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const teamId = parsePositiveInt(req.params.id);
  if (!teamId) {
    return res.status(400).json({ error: "Invalid team id" });
  }

  try {
    const teamInMatches = await prisma.matches.count({
      where: {
        OR: [
          { ekipi_shtepiak_id: teamId },
          { ekipi_mysafir_id: teamId },
        ],
      },
    });

    if (teamInMatches > 0) {
      return res.status(409).json({
        error:
          "This team cannot be deleted because it is associated with one or more matches.",
      });
    }

    const existingTeam = await prisma.teams.findUnique({
      where: { id: teamId },
    });
    if (!existingTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    const deletedTeam = await prisma.teams.delete({
      where: { id: teamId },
    });

    res.json({ message: "Team deleted successfully", deleted: deletedTeam });
  } catch (err) {
    if (err?.code === "P2003") {
      return res.status(409).json({
        error:
          "This team cannot be deleted because it has associated data in the system.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
