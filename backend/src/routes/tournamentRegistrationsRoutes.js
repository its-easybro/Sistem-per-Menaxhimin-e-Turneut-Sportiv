// Defines tournament registration routes for registering teams and managing registration records.
import { protect, requireRole } from "../middleware/auth.js";
import express from "express";
import prisma from "../lib/prisma.js";
import Joi from "joi";

const router = express.Router();

// Posible registration statuses
const registrationStatusOptions = [
  "Në Pritje",
  "Aprovuar",
  "Refuzuar",
  "Anuluar",
];

const registrationParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Registration ID must be a valid number.",
    "number.positive": "Registration ID must be a positive integer.",
    "any.required": "Registration ID is required.",
  }),
});

const registrationCreateSchema = Joi.object({
  turneu_id: Joi.number().integer().positive().required().messages({
    "number.base": "Tournament ID must be a valid number.",
    "number.positive": "Tournament ID must be a positive integer.",
    "any.required": "Tournament ID is required.",
  }),
  ekipi_id: Joi.number().integer().positive().required().messages({
    "number.base": "Team ID must be a valid number.",
    "number.positive": "Team ID must be a positive integer.",
    "any.required": "Team ID is required.",
  }),
  statusi: Joi.string()
    .valid(...registrationStatusOptions)
    .optional()
    .default("Në Pritje")
    .messages({
      "any.only": `Status must be one of: ${registrationStatusOptions.join(", ")}.`,
    }),
  tarifa_paguar: Joi.number().min(0).optional().default(0).messages({
    "number.base": "Paid fee must be a valid number.",
    "number.min": "Paid fee cannot be negative.",
  }),
});

const registrationUpdateSchema = Joi.object({
  turneu_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Tournament ID must be a valid number.",
    "number.positive": "Tournament ID must be a positive integer.",
  }),
  ekipi_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Team ID must be a valid number.",
    "number.positive": "Team ID must be a positive integer.",
  }),
  statusi: Joi.string()
    .valid(...registrationStatusOptions)
    .optional()
    .messages({
      "any.only": `Status must be one of: ${registrationStatusOptions.join(", ")}.`,
    }),
  tarifa_paguar: Joi.number().min(0).optional().messages({
    "number.base": "Paid fee must be a valid number.",
    "number.min": "Paid fee cannot be negative.",
  }),
});

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

  const ekipiId = parsePositiveInteger(body.ekipi_id);
  if (!ekipiId) {
    return { error: "The team ID is invalid." };
  }

  const rawStatus = typeof body.statusi === "string" ? body.statusi.trim() : "";
  const statusi = rawStatus || registrationStatusOptions[0];
  if (!registrationStatusOptions.includes(statusi)) {
    return {
      error: `Status must be one of: ${registrationStatusOptions.join(", ")}.`,
    };
  }

  const tarifaPaguar =
    body.tarifa_paguar === "" ||
    body.tarifa_paguar === null ||
    body.tarifa_paguar === undefined
      ? 0
      : Number(body.tarifa_paguar);

  if (!Number.isFinite(tarifaPaguar) || tarifaPaguar < 0) {
    return { error: "The paid fee must be a non-negative number." };
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

function formatRegistration(registration) {
  return {
    id: registration.id,
    turneu_id: registration.turneu_id,
    turneu_emri: registration.tournaments?.emertimi || null,
    ekipi_id: registration.ekipi_id,
    ekipi_emri: registration.teams?.emertimi || null,
    data_regjistrimit: registration.data_regjistrimit,
    statusi: registration.statusi,
    tarifa_paguar: registration.tarifa_paguar,
    created_at: registration.created_at,
  };
}

async function ensureTeamMatchesTournamentSport(turneu_id, ekipi_id) {
  const [tournament, team] = await Promise.all([
    prisma.tournaments.findUnique({
      where: { id: turneu_id },
      select: { id: true, sporti_id: true },
    }),
    prisma.teams.findUnique({
      where: { id: ekipi_id },
      select: { id: true, sporti_id: true },
    }),
  ]);

  if (!tournament || !team) {
    return {
      ok: false,
      status: 400,
      error: "The selected tournament or team does not exist.",
    };
  }

  if (team.sporti_id !== tournament.sporti_id) {
    return {
      ok: false,
      status: 400,
      error: "This team does not belong to the same sport as the tournament.",
    };
  }

  return { ok: true };
}

// Function to handle registration errors and return appropriate responses based on the database error code
function handleRegistrationError(err, res) {
  if (err?.code === "P2002") {
    return res.status(409).json({
      error: "This team is already registered for this tournament.",
    });
  }

  if (err?.code === "P2003") {
    return res.status(400).json({
      error: "The selected tournament or team does not exist.",
    });
  }

  if (err?.code === "P2004") {
    return res.status(400).json({
      error: "The registration data does not meet the validity criteria.",
    });
  }

  return res.status(500).json({ error: err.message });
}

async function fetchRegistrationById(id) {
  return prisma.tournamentregistrations.findUnique({
    where: { id },
    include: {
      tournaments: {
        select: { emertimi: true },
      },
      teams: {
        select: { emertimi: true },
      },
    },
  });
}

// Checks that the organizer owns the tournament where teams are being registered.
async function organizerOwnsTournament(tournamentId, organizerId) {
  const result = await prisma.tournaments.findFirst({
    where: {
      id: tournamentId,
      organizatori_id: organizerId,
    },
    select: { id: true },
  });

  return Boolean(result);
}

// Checks that an existing registration belongs to one of the organizer's tournaments.
async function organizerOwnsRegistration(registrationId, organizerId) {
  const result = await prisma.tournamentregistrations.findFirst({
    where: {
      id: registrationId,
      tournaments: {
        organizatori_id: organizerId,
      },
    },
    select: { id: true },
  });

  return Boolean(result);
}

// Route for getting all tournament registrations with attached tournament and team names
router.get("/", protect, async (req, res) => {
  try {
    let result;

    if (req.user.is_admin) {
      result = await prisma.tournamentregistrations.findMany({
        include: {
          tournaments: {
            select: { emertimi: true },
          },
          teams: {
            select: { emertimi: true },
          },
        },
        orderBy: { id: "asc" },
      });
    } else if (req.user.is_organizer) {
      // Organizers only see team registrations for tournaments assigned to them.
      result = await prisma.tournamentregistrations.findMany({
        where: {
          tournaments: {
            organizatori_id: req.user.id,
          },
        },
        include: {
          tournaments: {
            select: { emertimi: true },
          },
          teams: {
            select: { emertimi: true },
          },
        },
        orderBy: { id: "asc" },
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(result.map(formatRegistration));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for getting a specific registration by its ID
router.get("/:id", protect, async (req, res) => {
  const { error, value } = registrationParamSchema.validate({
    id: req.params.id,
  });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    let result;

    if (req.user.is_admin) {
      result = await fetchRegistrationById(value.id);
    } else if (req.user.is_organizer) {
      // Protects direct access by id so organizers cannot inspect another tournament's registration.
      const ownsRegistration = await organizerOwnsRegistration(
        value.id,
        req.user.id,
      );
      if (!ownsRegistration) {
        return res.status(403).json({ error: "Forbidden" });
      }
      result = await fetchRegistrationById(value.id);
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!result) {
      return res.status(404).json({ error: "Registration not found" });
    }
    res.json(formatRegistration(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for creating a new tournament registration. This route is protected and available to admins or the assigned organizer.
router.post(
  "/",
  protect,
  requireRole("is_admin", "is_organizer"),
  async (req, res) => {
    const { error, value } = registrationCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { turneu_id, ekipi_id, statusi, tarifa_paguar } = value;

    try {
      if (req.user.is_organizer) {
        // Organizers can add teams only inside their own tournaments.
        const ownsTournament = await organizerOwnsTournament(
          turneu_id,
          req.user.id,
        );
        if (!ownsTournament) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      const sportValidation = await ensureTeamMatchesTournamentSport(
        turneu_id,
        ekipi_id,
      );
      if (!sportValidation.ok) {
        return res
          .status(sportValidation.status)
          .json({ error: sportValidation.error });
      }

      const created = await prisma.tournamentregistrations.create({
        data: {
          turneu_id,
          ekipi_id,
          statusi,
          tarifa_paguar,
        },
        include: {
          tournaments: {
            select: { emertimi: true },
          },
          teams: {
            select: { emertimi: true },
          },
        },
      });

      res.status(201).json(formatRegistration(created));
    } catch (err) {
      handleRegistrationError(err, res);
    }
  },
);

// Route for updating an existing registration by its ID. This route is protected and available to admins or the assigned organizer.
router.put(
  "/:id",
  protect,
  requireRole("is_admin", "is_organizer"),
  async (req, res) => {
    const { error: paramError, value: paramValue } = registrationParamSchema.validate(
      { id: req.params.id },
    );
    if (paramError) {
      return res.status(400).json({ error: paramError.details[0].message });
    }

    const { error: bodyError, value: bodyValue } = registrationUpdateSchema.validate(
      req.body,
    );
    if (bodyError) {
      return res.status(400).json({ error: bodyError.details[0].message });
    }

    const { turneu_id, ekipi_id, statusi, tarifa_paguar } = bodyValue;

    try {
      if (req.user.is_organizer) {
        // Organizers can edit only registrations that belong to their own tournament space.
        const ownsRegistration = await organizerOwnsRegistration(
          paramValue.id,
          req.user.id,
        );
        const ownsTournament = await organizerOwnsTournament(
          turneu_id,
          req.user.id,
        );

        if (!ownsRegistration || !ownsTournament) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      const sportValidation = await ensureTeamMatchesTournamentSport(
        turneu_id,
        ekipi_id,
      );
      if (!sportValidation.ok) {
        return res
          .status(sportValidation.status)
          .json({ error: sportValidation.error });
      }

      const existingRegistration =
        await prisma.tournamentregistrations.findUnique({
          where: { id: paramValue.id },
          select: { id: true },
        });
      if (!existingRegistration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      const updated = await prisma.tournamentregistrations.update({
        where: { id: paramValue.id },
        data: {
          turneu_id,
          ekipi_id,
          statusi,
          tarifa_paguar,
        },
        include: {
          tournaments: {
            select: { emertimi: true },
          },
          teams: {
            select: { emertimi: true },
          },
        },
      });

      res.json(formatRegistration(updated));
    } catch (err) {
      handleRegistrationError(err, res);
    }
  },
);

// Route for deleting an existing registration by its ID. This route is protected and available to admins or the assigned organizer.
router.delete(
  "/:id",
  protect,
  requireRole("is_admin", "is_organizer"),
  async (req, res) => {
    const idValidation = validateRouteId(req.params.id);
    if (idValidation.error) {
      return res.status(400).json({ error: idValidation.error });
    }

    try {
      if (req.user.is_organizer) {
        // Organizers can remove only team registrations from their own tournaments.
        const ownsRegistration = await organizerOwnsRegistration(
          idValidation.value,
          req.user.id,
        );
        if (!ownsRegistration) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      const result = await fetchRegistrationById(idValidation.value);
      if (!result) {
        return res.status(404).json({ error: "Registration not found" });
      }

      await prisma.tournamentregistrations.delete({
        where: { id: idValidation.value },
      });

      res.json({
        message: "Registration deleted successfully",
        deletedRegistration: formatRegistration(result),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Exporting the router to be used in server.js
export default router;
