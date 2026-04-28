import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

const matchResultInclude = {
  matches: {
    select: {
      ekipi_shtepiak_id: true,
      ekipi_mysafir_id: true,
      data_ndeshjes: true,
      ora_fillimit: true,
      statusi: true,
      faza: true,
      teams_matches_ekipi_shtepiak_idToteams: { select: { emertimi: true } },
      teams_matches_ekipi_mysafir_idToteams: { select: { emertimi: true } },
      tournaments: { select: { emertimi: true } },
    },
  },
  teams: { select: { emertimi: true } },
  players: { select: { emri: true, mbiemri: true } },
};

// Route for getting all match results with detailed data. This route is protected.
router.get("/", protect, async (req, res) => {
  try {
    const results = await prisma.matchresults.findMany({
      include: matchResultInclude,
    });

    const formattedResult = results
      .sort((a, b) => {
        const dateA = a.matches?.data_ndeshjes
          ? new Date(a.matches.data_ndeshjes).getTime()
          : 0;
        const dateB = b.matches?.data_ndeshjes
          ? new Date(b.matches.data_ndeshjes).getTime()
          : 0;
        return dateB - dateA;
      })
      .map((result) => ({
        id: result.id,
        ndeshja_id: result.ndeshja_id,
        golat_shtepiak: result.golat_shtepiak,
        golat_mysafir: result.golat_mysafir,
        fitues_id: result.fitues_id,
        fitues_emri: result.teams?.emertimi ?? null,
        shenime: result.shenime,
        mvp_id: result.mvp_id,
        mvp_emr_mbiemr: result.players
          ? `${result.players.emri} ${result.players.mbiemri}`
          : null,
        ekipi_shtepiak_id: result.matches?.ekipi_shtepiak_id ?? null,
        ekipi_shtepiak:
          result.matches?.teams_matches_ekipi_shtepiak_idToteams?.emertimi ??
          null,
        ekipi_mysafir_id: result.matches?.ekipi_mysafir_id ?? null,
        ekipi_mysafir:
          result.matches?.teams_matches_ekipi_mysafir_idToteams?.emertimi ??
          null,
        data_ndeshjes: result.matches?.data_ndeshjes ?? null,
        ora_fillimit: result.matches?.ora_fillimit ?? null,
        statusi: result.matches?.statusi ?? null,
        faza: result.matches?.faza ?? null,
        turneu_emri: result.matches?.tournaments?.emertimi ?? null,
      }));

    res.json(formattedResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to format a matchresult record (with includes) into the API shape.
function formatMatchResult(result) {
  return {
    id: result.id,
    ndeshja_id: result.ndeshja_id,
    golat_shtepiak: result.golat_shtepiak,
    golat_mysafir: result.golat_mysafir,
    fitues_id: result.fitues_id,
    fitues_emri: result.teams?.emertimi ?? null,
    shenime: result.shenime,
    mvp_id: result.mvp_id,
    mvp_emr_mbiemr: result.players
      ? `${result.players.emri} ${result.players.mbiemri}`
      : null,
    ekipi_shtepiak_id: result.matches?.ekipi_shtepiak_id ?? null,
    ekipi_shtepiak:
      result.matches?.teams_matches_ekipi_shtepiak_idToteams?.emertimi ?? null,
    ekipi_mysafir_id: result.matches?.ekipi_mysafir_id ?? null,
    ekipi_mysafir:
      result.matches?.teams_matches_ekipi_mysafir_idToteams?.emertimi ?? null,
    data_ndeshjes: result.matches?.data_ndeshjes ?? null,
    ora_fillimit: result.matches?.ora_fillimit ?? null,
    statusi: result.matches?.statusi ?? null,
    faza: result.matches?.faza ?? null,
    turneu_emri: result.matches?.tournaments?.emertimi ?? null,
  };
}

// Route for creating a new match result. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
  const {
    ndeshja_id,
    golat_shtepiak,
    golat_mysafir,
    fitues_id,
    shenime,
    mvp_id,
  } = req.body;

  if (!ndeshja_id) {
    return res.status(400).json({
      error: "The following fields are required: ndeshja_id",
    });
  }

  try {
    const created = await prisma.matchresults.create({
      data: {
        ndeshja_id,
        golat_shtepiak: golat_shtepiak ?? 0,
        golat_mysafir: golat_mysafir ?? 0,
        fitues_id: fitues_id ?? null,
        shenime: shenime ?? null,
        mvp_id: mvp_id ?? null,
      },
      include: matchResultInclude,
    });

    res.status(201).json(formatMatchResult(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for updating an existing match result by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const { id } = req.params;
  const {
    ndeshja_id,
    golat_shtepiak,
    golat_mysafir,
    fitues_id,
    shenime,
    mvp_id,
  } = req.body;

  try {
    const existing = await prisma.matchresults.findUnique({
      where: { id: Number(id) },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Match result not found." });
    }

    const updated = await prisma.matchresults.update({
      where: { id: Number(id) },
      data: {
        ndeshja_id,
        golat_shtepiak,
        golat_mysafir,
        fitues_id,
        shenime,
        mvp_id,
      },
      include: matchResultInclude,
    });

    res.json(formatMatchResult(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for deleting an existing match result by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.matchresults.findUnique({
      where: { id: Number(id) },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Match result not found." });
    }

    await prisma.matchresults.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Match result deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export router for use in server.js
export default router;
