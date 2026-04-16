import { protect, requireAdmin } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

const registrationStatusOptions = [
  "Në Pritje",
  "Aprovuar",
  "Refuzuar",
  "Anuluar",
];

const registrationSelectQuery = `
  SELECT
    tr.id,
    tr.turneu_id,
    t.emertimi AS turneu_emri,
    tr.ekipi_id,
    tm.emertimi AS ekipi_emri,
    tr.data_regjistrimit,
    tr.statusi,
    tr.tarifa_paguar,
    tr.created_at
  FROM TournamentRegistrations tr
  LEFT JOIN Tournaments t ON tr.turneu_id = t.id
  LEFT JOIN Teams tm ON tr.ekipi_id = tm.id
`;

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function validateRouteId(id) {
  const parsedId = parsePositiveInteger(id);
  if (!parsedId) {
    return { error: "ID-ja e regjistrimit eshte e pavlefshme." };
  }

  return { value: parsedId };
}

function validateRegistrationPayload(body) {
  const turneuId = parsePositiveInteger(body.turneu_id);
  if (!turneuId) {
    return { error: "Turneu eshte i pavlefshem." };
  }

  const ekipiId = parsePositiveInteger(body.ekipi_id);
  if (!ekipiId) {
    return { error: "Ekipi eshte i pavlefshem." };
  }

  const rawStatus = typeof body.statusi === "string" ? body.statusi.trim() : "";
  const statusi = rawStatus || registrationStatusOptions[0];
  if (!registrationStatusOptions.includes(statusi)) {
    return {
      error: `Statusi duhet te jete nje nga: ${registrationStatusOptions.join(", ")}.`,
    };
  }

  const tarifaPaguar =
    body.tarifa_paguar === "" ||
    body.tarifa_paguar === null ||
    body.tarifa_paguar === undefined
      ? 0
      : Number(body.tarifa_paguar);

  if (!Number.isFinite(tarifaPaguar) || tarifaPaguar < 0) {
    return { error: "Tarifa e paguar duhet te jete numer jo-negativ." };
  }

  return {
    value: {
      turneu_id: turneuId,
      ekipi_id: ekipiId,
      statusi,
      tarifa_paguar: tarifaPaguar,
    },
  };
}

function handleRegistrationError(err, res) {
  if (err.code === "23505") {
    return res.status(409).json({
      error: "Ky ekip eshte regjistruar tashme ne kete turne.",
    });
  }

  if (err.code === "23503") {
    return res.status(400).json({
      error: "Turneu ose ekipi i zgjedhur nuk ekziston.",
    });
  }

  if (err.code === "23514") {
    return res.status(400).json({
      error: "Te dhenat e regjistrimit nuk kaluan rregullat e vlefshmerise.",
    });
  }

  return res.status(500).json({ error: err.message });
}

async function fetchRegistrationById(id) {
  return pool.query(`${registrationSelectQuery} WHERE tr.id = $1`, [id]);
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`${registrationSelectQuery} ORDER BY tr.id`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  const idValidation = validateRouteId(req.params.id);
  if (idValidation.error) {
    return res.status(400).json({ error: idValidation.error });
  }

  try {
    const result = await fetchRegistrationById(idValidation.value);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Regjistrimi nuk u gjet" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", protect, requireAdmin, async (req, res) => {
  const validation = validateRegistrationPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { turneu_id, ekipi_id, statusi, tarifa_paguar } = validation.value;

  try {
    const created = await pool.query(
      `INSERT INTO TournamentRegistrations (turneu_id, ekipi_id, statusi, tarifa_paguar)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [turneu_id, ekipi_id, statusi, tarifa_paguar],
    );

    const result = await fetchRegistrationById(created.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleRegistrationError(err, res);
  }
});

router.put("/:id", protect, requireAdmin, async (req, res) => {
  const idValidation = validateRouteId(req.params.id);
  if (idValidation.error) {
    return res.status(400).json({ error: idValidation.error });
  }

  const validation = validateRegistrationPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { turneu_id, ekipi_id, statusi, tarifa_paguar } = validation.value;

  try {
    const updated = await pool.query(
      `UPDATE TournamentRegistrations
       SET turneu_id = $1, ekipi_id = $2, statusi = $3, tarifa_paguar = $4
       WHERE id = $5
       RETURNING id`,
      [turneu_id, ekipi_id, statusi, tarifa_paguar, idValidation.value],
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Regjistrimi nuk u gjet" });
    }

    const result = await fetchRegistrationById(updated.rows[0].id);
    res.json(result.rows[0]);
  } catch (err) {
    handleRegistrationError(err, res);
  }
});

router.delete("/:id", protect, requireAdmin, async (req, res) => {
  const idValidation = validateRouteId(req.params.id);
  if (idValidation.error) {
    return res.status(400).json({ error: idValidation.error });
  }

  try {
    const result = await fetchRegistrationById(idValidation.value);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Regjistrimi nuk u gjet" });
    }

    await pool.query(
      "DELETE FROM TournamentRegistrations WHERE id = $1",
      [idValidation.value],
    );

    res.json({
      message: "Regjistrimi u fshi me sukses",
      deletedRegistration: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
