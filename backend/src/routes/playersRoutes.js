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
// Route for getting all players with their team information attached. This route is protected.
router.get("/", protect, async (req, res) => {
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
        teams: {
          select: {
            emertimi: true,
          },
        }
      },
    });  

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
      ekipi_id: players.teams?.emertimi ?? "No Team",
    }))
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new player. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
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
  } = req.body;

  // Validates required fields
  if (!emri || !mbiemri || !data_lindjes || !pozicioni || !numri) {
    return res.status(400).json({
      error: "The following fields are required: emri, mbiemri, data_lindjes, pozicioni, numri",
    });
  }

  const normalized = normalizePlayerPayload(req.body);
  if (!normalized.ok) {
    return res.status(400).json({ error: normalized.error });
  }

  try {
    const created = await prisma.players.create({
      data: normalized.data,
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
  } = req.body;

  const normalized = normalizePlayerPayload(req.body);
  if (!normalized.ok) {
    return res.status(400).json({ error: normalized.error });
  }

  try {
    const existing = await prisma.players.findUnique({
      where: { id: playerId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Player not found" });
    }

    const result = await prisma.players.update({
      where: { id: playerId },
      data: normalized.data,
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
