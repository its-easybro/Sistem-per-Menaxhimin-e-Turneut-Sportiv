// Defines player routes for managing player records, filters, profile images, and team relations.
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
const playerCreateSchema = Joi.object({
  emri: Joi.string().trim().required().messages({
    "string.empty": "First name is required.",
    "any.required": "First name is required.",
  }),
  mbiemri: Joi.string().trim().required().messages({
    "string.empty": "Last name is required.",
    "any.required": "Last name is required.",
  }),
  data_lindjes: Joi.date().required().messages({
    "date.base": "Date of birth must be a valid date.",
    "any.required": "Date of birth is required.",
  }),
  pozicioni: Joi.string().trim().required().messages({
    "string.empty": "Position is required.",
    "any.required": "Position is required.",
  }),
  numri: Joi.number().integer().min(1).max(99).required().messages({
    "number.base": "Number must be a valid integer.",
    "number.min": "Number must be between 1 and 99.",
    "number.max": "Number must be between 1 and 99.",
    "any.required": "Number is required.",
  }),
  ekipi_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "Team must be a valid number.",
    "number.positive": "Team ID must be positive.",
  }),
  gjatesia: Joi.number().optional().allow(null).messages({
    "number.base": "Height must be a valid number.",
  }),
  pesha: Joi.number().optional().allow(null).messages({
    "number.base": "Weight must be a valid number.",
  }),
  kombesia: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Nationality must be a string.",
  }),
  foto: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Photo must be a string.",
  }),
});

const playerUpdateSchema = Joi.object({
  emri: Joi.string().trim().optional().messages({
    "string.empty": "First name cannot be empty.",
  }),
  mbiemri: Joi.string().trim().optional().messages({
    "string.empty": "Last name cannot be empty.",
  }),
  data_lindjes: Joi.date().optional().messages({
    "date.base": "Date of birth must be a valid date.",
  }),
  pozicioni: Joi.string().trim().optional().messages({
    "string.empty": "Position cannot be empty.",
  }),
  numri: Joi.number().integer().min(1).max(99).optional().messages({
    "number.base": "Number must be a valid integer.",
    "number.min": "Number must be between 1 and 99.",
    "number.max": "Number must be between 1 and 99.",
  }),
  ekipi_id: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "Team must be a valid number.",
    "number.positive": "Team ID must be positive.",
  }),
  gjatesia: Joi.number().optional().allow(null).messages({
    "number.base": "Height must be a valid number.",
  }),
  pesha: Joi.number().optional().allow(null).messages({
    "number.base": "Weight must be a valid number.",
  }),
  kombesia: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Nationality must be a string.",
  }),
  foto: Joi.string().trim().optional().allow("", null).messages({
    "string.base": "Photo must be a string.",
  }),
});

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return { ok: false, value: null };
  }

  return { ok: true, value: parsed };
};

const parseOptionalDecimal = (value) => {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { ok: false, value: null };
  }

  return { ok: true, value: parsed };
};

const parseOptionalDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, value: null };
  }

  return { ok: true, value: parsed };
};

const normalizePlayerPayload = (payload) => {
  const ekipiId = parseOptionalInt(payload.ekipi_id);
  if (!ekipiId.ok) {
    return { ok: false, error: "Team id must be a valid integer." };
  }

  const numri = parseOptionalInt(payload.numri);
  if (!numri.ok) {
    return { ok: false, error: "Number must be a valid integer." };
  }

  if (numri.value !== null && (numri.value < 1 || numri.value > 99)) {
    return { ok: false, error: "Number must be between 1 and 99." };
  }

  const gjatesia = parseOptionalDecimal(payload.gjatesia);
  if (!gjatesia.ok) {
    return { ok: false, error: "Height must be a valid number." };
  }

  const pesha = parseOptionalDecimal(payload.pesha);
  if (!pesha.ok) {
    return { ok: false, error: "Weight must be a valid number." };
  }

  const dataLindjes = parseOptionalDate(payload.data_lindjes);
  if (!dataLindjes.ok) {
    return { ok: false, error: "Date of birth is invalid." };
  }

  return {
    ok: true,
    data: {
      emri: typeof payload.emri === "string" ? payload.emri.trim() : payload.emri,
      mbiemri: typeof payload.mbiemri === "string" ? payload.mbiemri.trim() : payload.mbiemri,
      data_lindjes: dataLindjes.value,
      ekipi_id: ekipiId.value,
      pozicioni: normalizeOptionalText(payload.pozicioni),
      numri: numri.value,
      gjatesia: gjatesia.value,
      pesha: pesha.value,
      kombesia: normalizeOptionalText(payload.kombesia),
      foto: normalizeOptionalText(payload.foto),
    },
  };
};

router.use("/uploads-players", express.static(path.join(__dirname + "/../uploads/players")));
const uploadDirr = path.join(__dirname, "../uploads/players")
if (!fs.existsSync(uploadDirr)) {
  fs.mkdirSync(uploadDirr, { recursive: true})
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + "/../uploads/players")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const extension = path.extname(file.originalname)
    cb(null, file.fieldname + "-" + uniqueSuffix + extension)
  }
})
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Only JPEG, PNG, or WebP images are allowed"))
    }
  },
  limits: {fileSize: 5 * 1024 * 1024}
})
router.post("/upload-player-foto", protect, requireRole("is_admin", "is_organizer"), (req, res) => {
  upload.single("foto")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Image must be smaller than 5MB" });
      }
      return res.status(400).json({ error: err.message });
    }

    if (err) {
      return res.status(400).json({ error: err.message || "Invalid image upload" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const logoURL = `${req.protocol}://${req.get("host")}/players/uploads-players/${req.file.filename}`;
    return res.json({ message: "File uploaded successfully", file: req.file, url: logoURL });
  });
});
// Route for getting all players publicly, with team and sport information attached.
router.get("/public", async (req, res) => {
  try {
    const players = await prisma.players.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        data_lindjes: true,
        pozicioni: true,
        numri: true,
        gjatesia: true,
        pesha: true,
        kombesia: true,
        foto: true,
        ekipi_id: true,
        teams: {
          select: {
            emertimi: true,
            sports: {
              select: {
                id: true,
                emertimi: true,
              }
            }
          },
        }
      },
    });

    const result = players.map(player => ({
      id: player.id,
      emri: player.emri,
      mbiemri: player.mbiemri,
      data_lindjes: player.data_lindjes,
      pozicioni: player.pozicioni,
      numri: player.numri,
      gjatesia: player.gjatesia,
      pesha: player.pesha,
      kombesia: player.kombesia,
      foto: player.foto,
      team_id: player.ekipi_id,
      ekipi_id: player.teams?.emertimi ?? "No Team",
      ekipi_emri: player.teams?.emertimi ?? "No Team",
      sporti_id: player.teams?.sports?.id ?? null,
      sporti_emri: player.teams?.sports?.emertimi ?? "No Sport",
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting all players with their team information attached. This route is protected.
router.get("/", protect, async (req, res) => {
  const page = req.query.page ? Math.max(1, parseInt(req.query.page) || 1) : null;
  const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit) || 10) : null;
  const skip = page && limit ? (page - 1) * limit : undefined;

  try {
    const { search, ekipi_id, pozicioni, kombesia } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { emri: { contains: search, mode: "insensitive" } },
        { mbiemri: { contains: search, mode: "insensitive" } },
      ];
    }

    if (ekipi_id) {
      where.ekipi_id = parseInt(ekipi_id, 10);
    }

    if (pozicioni) {
      where.pozicioni = { contains: pozicioni, mode: "insensitive" };
    }

    if (kombesia) {
      where.kombesia = { contains: kombesia, mode: "insensitive" };
    }

    const queryOptions = {
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        data_lindjes: true,
        pozicioni: true,
        numri: true,
        gjatesia: true,
        pesha: true,
        kombesia: true,
        foto: true,
        ekipi_id: true,
        teams: {
          select: {
            emertimi: true,
          },
        }
      },
      ...(page && limit ? { skip, take: limit } : {}),
    };

    const players = await prisma.players.findMany(queryOptions);

    const result = players.map(players => ({
      id: players.id,
      emri: players.emri,
      mbiemri: players.mbiemri,
      data_lindjes: players.data_lindjes,
      pozicioni: players.pozicioni,
      numri: players.numri,
      gjatesia: players.gjatesia,
      pesha: players.pesha,
      kombesia: players.kombesia,
      foto: players.foto,
      team_id: players.ekipi_id,
      ekipi_id: players.teams?.emertimi ?? "No Team",
      ekipi_emri: players.teams?.emertimi ?? "No Team",
    }));

    if (page && limit) {
      const total = await prisma.players.count({ where });
      return res.json({
        data: result,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new player. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  try {
    const { error, value } = playerCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      emri,
      mbiemri,
      data_lindjes,
      ekipi_id,
      pozicioni,
      numri,
      gjatesia,
      pesha,
      kombesia,
      foto,
    } = value;

    if (ekipi_id) {
      const team = await prisma.teams.findUnique({
        where: { id: ekipi_id },
        select: { id: true, sporti_id: true },
      });

      if (!team) {
        return res.status(400).json({ error: "Selected team does not exist." });
      }
    }

    const playerData = {
      emri,
      mbiemri,
      data_lindjes,
      pozicioni,
      numri,
      gjatesia: gjatesia || null,
      pesha: pesha || null,
      kombesia: kombesia || null,
      foto: foto || null,
    };

    if (ekipi_id) {
      playerData.ekipi_id = ekipi_id;
    }

    const created = await prisma.players.create({
      data: playerData,
    });

    const result = await prisma.players.findUnique({
      where: { id: created.id },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        data_lindjes: true,
        pozicioni: true,
        numri: true,
        gjatesia: true,
        pesha: true,
        kombesia: true,
        foto: true,
        teams: {
          select: {
            emertimi: true,
          },
        }
      },
    });

    const formattedResult = {
      id: result.id,
      emri: result.emri,
      mbiemri: result.mbiemri,
      data_lindjes: result.data_lindjes,
      pozicioni: result.pozicioni,
      numri: result.numri,
      gjatesia: result.gjatesia,
      pesha: result.pesha,
      kombesia: result.kombesia,
      foto: result.foto,
      ekipi_id: result.teams?.emertimi ?? "No Team",
    };

    res.status(201).json(formattedResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating a single player by their ID with team information attached. This route is protected.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const playerId = parsePositiveInt(req.params.id);
  if (!playerId) {
    return res.status(400).json({ error: "Invalid player id" });
  }

  try {
    const { error, value } = playerUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const existing = await prisma.players.findUnique({
      where: { id: playerId },
      select: { id: true, ekipi_id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Player not found" });
    }

    const {
      emri,
      mbiemri,
      data_lindjes,
      ekipi_id,
      pozicioni,
      numri,
      gjatesia,
      pesha,
      kombesia,
      foto,
    } = value;

    const finalEkipiId = ekipi_id ?? existing.ekipi_id;
    if (finalEkipiId) {
      const team = await prisma.teams.findUnique({
        where: { id: finalEkipiId },
        select: { id: true, sporti_id: true },
      });

      if (!team) {
        return res.status(400).json({ error: "Selected team does not exist." });
      }
    }

    const playerData = {
      ...(emri !== undefined && { emri }),
      ...(mbiemri !== undefined && { mbiemri }),
      ...(data_lindjes !== undefined && { data_lindjes }),
      ...(pozicioni !== undefined && { pozicioni }),
      ...(numri !== undefined && { numri }),
      ...(gjatesia !== undefined && { gjatesia: gjatesia || null }),
      ...(pesha !== undefined && { pesha: pesha || null }),
      ...(kombesia !== undefined && { kombesia: kombesia || null }),
      ...(foto !== undefined && { foto: foto || null }),
      ...(ekipi_id !== undefined && { ekipi_id: finalEkipiId || null }),
    };

    const result = await prisma.players.update({
      where: { id: playerId },
      data: playerData,
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        data_lindjes: true,
        pozicioni: true,
        numri: true,
        gjatesia: true,
        pesha: true,
        kombesia: true,
        foto: true,
        teams: {
          select: {
            emertimi: true,
          },
        },
      },
    });

    const formattedResult = {
      id: result.id,
      emri: result.emri,
      mbiemri: result.mbiemri,
      data_lindjes: result.data_lindjes,
      pozicioni: result.pozicioni,
      numri: result.numri,
      gjatesia: result.gjatesia,
      pesha: result.pesha,
      kombesia: result.kombesia,
      foto: result.foto,
      ekipi_id: result.teams?.emertimi ?? "No Team",
    };

    res.json(formattedResult);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Route for deleting a single player by their ID with team information attached. This route is protected.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const playerId = parsePositiveInt(req.params.id);
  if (!playerId) {
    return res.status(400).json({ error: "Invalid player id" });
  }

  try {
    const existing = await prisma.players.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        data_lindjes: true,
        pozicioni: true,
        numri: true,
        gjatesia: true,
        pesha: true,
        kombesia: true,
        foto: true,
        teams: {
          select: {
            emertimi: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Player not found" });
    }

    await prisma.players.delete({
      where: { id: playerId },
    });

    const deleted = {
      id: existing.id,
      emri: existing.emri,
      mbiemri: existing.mbiemri,
      data_lindjes: existing.data_lindjes,
      pozicioni: existing.pozicioni,
      numri: existing.numri,
      gjatesia: existing.gjatesia,
      pesha: existing.pesha,
      kombesia: existing.kombesia,
      foto: existing.foto,
      ekipi_id: existing.teams?.emertimi ?? "No Team",
    };

    res.json({ message: "Player deleted successfully", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
