import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Posible registration statuses
const registrationStatusOptions = [
  "Në Pritje",
  "Aprovuar",
  "Refuzuar",
  "Anuluar",
];

// Query base for fetching registration data with tournament and team names
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

// Functions to help with validation and handling of registration data
function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

// Validates the registration ID from route parameters
function validateRouteId(id) {
  const parsedId = parsePositiveInteger(id);
  if (!parsedId) {
    return { error: "The registration ID is invalid." };
  }

  return { value: parsedId };
}

// Validates the registration data from the request body and converts it to the appropriate format for the database
function validateRegistrationPayload(body) {
  const turneuId = parsePositiveInteger(body.turneu_id);
  if (!turneuId) {
    return { error: "The tournament ID is invalid." };
  }

  // EkipiID can be null to allow registrations without a team, but if given it must be valid
  const ekipiId = parsePositiveInteger(body.ekipi_id);
  if (!ekipiId) {
    return { error: "The team ID is invalid." };
  }

  // Status can be empty (will take default value) or one of the allowed options
  const rawStatus = typeof body.statusi === "string" ? body.statusi.trim() : "";
  const statusi = rawStatus || registrationStatusOptions[0];
  if (!registrationStatusOptions.includes(statusi)) {
    return {
      error: `Status must be one of: ${registrationStatusOptions.join(", ")}.`,
    };
  }

  // Paid fee can be empty (will take value 0) or a non-negative number
  const tarifaPaguar =
    body.tarifa_paguar === "" ||
    body.tarifa_paguar === null ||
    body.tarifa_paguar === undefined
      ? 0
      : Number(body.tarifa_paguar);

  if (!Number.isFinite(tarifaPaguar) || tarifaPaguar < 0) {
    return { error: "The paid fee must be a non-negative number." };
  }

  // If all validations pass, return the formatted values for use in the query
  return {
    value: {
      turneu_id: turneuId,
      ekipi_id: ekipiId,
      statusi,
      tarifa_paguar: tarifaPaguar,
    },
  };
}

// Function to handle registration errors and return appropriate responses based on the database error code
function handleRegistrationError(err, res) {
  if (err.code === "23505") {
    return res.status(409).json({
      error: "This team is already registered for this tournament.",
    });
  }

  // Error code 23503 indicates that the given turneu_id or ekipi_id does not exist in the respective tables
  if (err.code === "23503") {
    return res.status(400).json({
      error: "The selected tournament or team does not exist.",
    });
  }
  
  // Error code 23502 indicates that a non-nullable field was given a null value, which should not happen with the current validation but is checked here as a safeguard
  if (err.code === "23514") {
    return res.status(400).json({
      error: "The registration data does not meet the validity criteria.",
    });
  }

  return res.status(500).json({ error: err.message });
}

async function fetchRegistrationById(id) {
  return pool.query(`${registrationSelectQuery} WHERE tr.id = $1`, [id]);
}

// Route for getting all tournament registrations with attached tournament and team names
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(`${registrationSelectQuery} ORDER BY tr.id`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific registration by its ID
router.get("/:id", protect, async (req, res) => {
  const idValidation = validateRouteId(req.params.id);
  if (idValidation.error) {
    return res.status(400).json({ error: idValidation.error });
  }

  try {
    const result = await fetchRegistrationById(idValidation.value);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new tournament registration. This route is protected and only admins can use it.
router.post("/", protect, requireRole("is_admin"), async (req, res) => {
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

// Route for updating an existing registration by its ID. This route is protected and only admins can use it.
router.put("/:id", protect, requireRole("is_admin"), async (req, res) => {
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
      return res.status(404).json({ error: "Registration not found" });
    }

    const result = await fetchRegistrationById(updated.rows[0].id);
    res.json(result.rows[0]);
  } catch (err) {
    handleRegistrationError(err, res);
  }
});


// Route for deleting an existing registration by its ID. This route is protected and only admins can use it.
router.delete("/:id", protect, requireRole("is_admin"), async (req, res) => {
  const idValidation = validateRouteId(req.params.id);
  if (idValidation.error) {
    return res.status(400).json({ error: idValidation.error });
  }

  try {
    const result = await fetchRegistrationById(idValidation.value);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    await pool.query(
      "DELETE FROM TournamentRegistrations WHERE id = $1",
      [idValidation.value],
    );

    res.json({
      message: "Registration deleted successfully",
      deletedRegistration: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exporting the router to be used in server.js
export default router;
