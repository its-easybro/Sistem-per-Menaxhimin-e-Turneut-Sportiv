import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import multer from "multer";
import path from "path";
import Joi from "joi";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validation Schemas
const teamCreateSchema = Joi.object({
  emertimi: Joi.string().trim().required().messages({
    "string.empty": "The team name is required.",
    "any.required": "The team name is required.",
  }),
  sporti_id: Joi.number().integer().positive().required().messages({
    "number.base": "Sport must be a valid number.",
    "number.positive": "Sport ID must be positive.",
    "any.required": "A valid sport is required.",
  }),
  logoja: Joi.string().trim().optional().allow("").messages({
    "string.base": "Logo must be a string.",
  }),
  trajneri: Joi.string().trim().optional().allow("").messages({
    "string.base": "Coach must be a string.",
  }),
  kontakti: Joi.string().trim().optional().allow("").messages({
    "string.base": "Contact must be a string.",
  }),
  email: Joi.string().trim().email().optional().allow("").messages({
    "string.email": "Email must be valid.",
    "string.base": "Email must be a string.",
  }),
  qyteti: Joi.string().trim().optional().allow("").messages({
    "string.base": "City must be a string.",
  }),
  data_themelimit: Joi.date().optional().allow(null).messages({
    "date.base": "Foundation date must be a valid date.",
  }),
});

// Validation schema for updating a team. All fields are optional, but if provided they must be valid.
const teamUpdateSchema = Joi.object({
  emertimi: Joi.string().trim().optional().messages({
    "string.empty": "The team name cannot be empty.",
  }),
  sporti_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Sport must be a valid number.",
    "number.positive": "Sport ID must be positive.",
  }),
  logoja: Joi.string().trim().optional().allow("").messages({
    "string.base": "Logo must be a string.",
  }),
  trajneri: Joi.string().trim().optional().allow("").messages({
    "string.base": "Coach must be a string.",
  }),
  kontakti: Joi.string().trim().optional().allow("").messages({
    "string.base": "Contact must be a string.",
  }),
  email: Joi.string().trim().email().optional().allow("").messages({
    "string.email": "Email must be valid.",
    "string.base": "Email must be a string.",
  }),
  qyteti: Joi.string().trim().optional().allow("").messages({
    "string.base": "City must be a string.",
  }),
  data_themelimit: Joi.date().optional().allow(null).messages({
    "date.base": "Foundation date must be a valid date.",
  }),
});

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
    if (trimmed === "") return null;

    const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? new Date(`${trimmed}T00:00:00.000Z`)
      : new Date(trimmed);

    return Number.isNaN(date.getTime()) ? null : date;
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const teamInclude = {
  sports: {
    select: {
      id: true,
      emertimi: true,
    },
  },
};

const formatTeam = (team) => ({
  ...team,
  sporti_emri: team.sports?.emertimi ?? null,
});

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
    const sportIdFilter = req.query.sporti_id ? parsePositiveInt(req.query.sporti_id) : null;
    if (req.query.sporti_id && !sportIdFilter) {
      return res.status(400).json({ error: "Invalid sport id" });
    }

    const teams = await prisma.teams.findMany({
      where: sportIdFilter ? { sporti_id: sportIdFilter } : undefined,
      include: teamInclude,
      orderBy: { id: "asc" },
    });
    res.json(teams.map(formatTeam));
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
      include: teamInclude,
    });
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(formatTeam(team));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new team. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  try {
    const { error, value } = teamCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      emertimi,
      logoja,
      trajneri,
      kontakti,
      email,
      qyteti,
      data_themelimit,
      sporti_id,
    } = value;

    const sport = await prisma.sports.findUnique({
      where: { id: sporti_id },
      select: { id: true },
    });
    if (!sport) {
      return res.status(400).json({ error: "Selected sport was not found." });
    }

    const normalizedTeam = {
      emertimi,
      logoja: normalizeOptionalText(logoja),
      trajneri: normalizeOptionalText(trajneri),
      kontakti: normalizeOptionalText(kontakti),
      email: normalizeOptionalText(email),
      qyteti: normalizeOptionalText(qyteti),
      data_themelimit: data_themelimit || null,
      sporti_id,
    };

    const createdTeam = await prisma.teams.create({
      data: normalizedTeam,
      include: teamInclude,
    });
    res.status(201).json(formatTeam(createdTeam));
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

  try {
    const { error, value } = teamUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const existingTeam = await prisma.teams.findUnique({
      where: { id: teamId },
      select: { id: true, sporti_id: true },
    });
    if (!existingTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    const {
      emertimi,
      logoja,
      trajneri,
      kontakti,
      email,
      qyteti,
      data_themelimit,
      sporti_id,
    } = value;

    const finalSportId = sporti_id ?? existingTeam.sporti_id;
    const sport = await prisma.sports.findUnique({
      where: { id: finalSportId },
      select: { id: true },
    });
    if (!sport) {
      return res.status(400).json({ error: "Selected sport was not found." });
    }

    const normalizedTeam = {
      ...(emertimi !== undefined && { emertimi }),
      ...(logoja !== undefined && { logoja: normalizeOptionalText(logoja) }),
      ...(trajneri !== undefined && { trajneri: normalizeOptionalText(trajneri) }),
      ...(kontakti !== undefined && { kontakti: normalizeOptionalText(kontakti) }),
      ...(email !== undefined && { email: normalizeOptionalText(email) }),
      ...(qyteti !== undefined && { qyteti: normalizeOptionalText(qyteti) }),
      ...(data_themelimit !== undefined && { data_themelimit: data_themelimit || null }),
      ...(sporti_id !== undefined && { sporti_id: finalSportId }),
    };

    const updatedTeam = await prisma.teams.update({
      where: { id: teamId },
      data: normalizedTeam,
      include: teamInclude,
    });

    res.json(formatTeam(updatedTeam));
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
