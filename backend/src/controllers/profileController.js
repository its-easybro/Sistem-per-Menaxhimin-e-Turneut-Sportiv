// Handles profile details, account updates, session management, support tickets, and user dashboard data.
import bcrypt from "bcrypt";
import Joi from "joi";
import prisma from "../lib/prisma.js";

const accountUpdateSchema = Joi.object({
  emri: Joi.string().trim().min(1).required().messages({
    "string.empty": "First name is required.",
    "any.required": "First name is required.",
  }),
  mbiemri: Joi.string().trim().allow("", null).default("").messages({
    "string.base": "Last name must be a string.",
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required.",
  }),
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "New password must be at least 6 characters.",
    "any.required": "New password is required.",
  }),
});

function parseCurrentSessionId(req) {
  return req.cookies?.sessionId || null;
}

function getBrowserLabel(userAgent) {
  if (!userAgent) {
    return "Unknown browser";
  }

  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/") && userAgent.includes("Version/")) return "Safari";
  if (userAgent.includes("OPR/") || userAgent.includes("Opera/")) return "Opera";
  return "Browser";
}

function getDeviceLabel(userAgent) {
  if (!userAgent) {
    return "Unknown device";
  }

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
    return "Mobile";
  }

  return "Desktop";
}

function formatSession(session, currentSessionId) {
  const userAgent = session.userAgent || null;

  return {
    id: session.id,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    ipAddress: session.ipAddress || null,
    userAgent,
    browserLabel: getBrowserLabel(userAgent),
    deviceLabel: getDeviceLabel(userAgent),
    isCurrent: session.id === currentSessionId,
  };
}

function formatTournament(tournament) {
  return {
    id: tournament.id,
    emertimi: tournament.emertimi,
    statusi: tournament.statusi,
    data_fillimit: tournament.data_fillimit,
    data_perfundimit: tournament.data_perfundimit,
    lokacioni: tournament.lokacioni,
    cmimi_regjistrimit: tournament.cmimi_regjistrimit,
    created_at: tournament.created_at,
  };
}

function formatMatchAssignment(matchReferee) {
  const match = matchReferee.matches;
  return {
    id: matchReferee.id,
    role: matchReferee.roli,
    matchId: match.id,
    tournamentName: match.tournaments?.emertimi || null,
    matchDate: match.data_ndeshjes,
    matchTime: match.ora_fillimit,
    statusi: match.statusi,
    homeTeam: match.teams_matches_ekipi_shtepiak_idToteams?.emertimi || null,
    awayTeam: match.teams_matches_ekipi_mysafir_idToteams?.emertimi || null,
    hasResult: Boolean(match.matchresults),
    result: match.matchresults
      ? {
          homeGoals: match.matchresults.golat_shtepiak,
          awayGoals: match.matchresults.golat_mysafir,
        }
      : null,
  };
}

export async function getProfileSummary(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        email: true,
        roli: true,
        statusi: true,
        createdAt: true,
        referee: {
          select: {
            id: true,
            nr_licences: true,
            kategoria: true,
            pervoja_vitesh: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      emri: user.emri,
      mbiemri: user.mbiemri,
      email: user.email,
      roli: user.roli,
      statusi: user.statusi,
      createdAt: user.createdAt,
      fullName: [user.emri, user.mbiemri].filter(Boolean).join(" "),
      initials: [user.emri, user.mbiemri]
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2),
      referee: user.referee,
      currentSessionId: parseCurrentSessionId(req),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateAccount(req, res) {
  try {
    const { error, value } = accountUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        emri: value.emri,
        mbiemri: value.mbiemri || "",
      },
    });

    if (req.user.is_referee) {
      await prisma.referees.updateMany({
        where: { user_id: req.user.id },
        data: {
          emri: updatedUser.emri,
          mbiemri: updatedUser.mbiemri,
          email: updatedUser.email,
        },
      });
    }

    res.json({
      id: updatedUser.id,
      emri: updatedUser.emri,
      mbiemri: updatedUser.mbiemri,
      email: updatedUser.email,
      fullName: [updatedUser.emri, updatedUser.mbiemri].filter(Boolean).join(" "),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function changePassword(req, res) {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(value.currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(value.newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listSessions(req, res) {
  try {
    const currentSessionId = parseCurrentSessionId(req);
    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        expiresAt: true,
        createdAt: true,
        userAgent: true,
        ipAddress: true,
        lastSeenAt: true,
      },
    });

    res.json({
      currentSessionId,
      sessions: sessions.map((session) => formatSession(session, currentSessionId)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function revokeSession(req, res) {
  try {
    const sessionId = req.params.id;
    const currentSessionId = parseCurrentSessionId(req);

    if (!sessionId) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    if (sessionId === currentSessionId) {
      return res.status(400).json({ error: "You cannot revoke the current session" });
    }

    const existingSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: req.user.id,
      },
      select: { id: true },
    });

    if (!existingSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    await prisma.session.delete({ where: { id: sessionId } });
    res.json({ message: "Session revoked successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listSupportTickets(req, res) {
  try {
    const tickets = await prisma.contactMessages.findMany({
      where: { email: req.user.email },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        subjekti: true,
        mesazhi: true,
        lexuar: true,
        kategoria: true,
        created_at: true,
      },
    });

    res.json({ tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getOrganizerDashboard(req, res) {
  try {
    const [totalTournaments, activeTournaments, completedTournaments, tournaments] =
      await Promise.all([
        prisma.tournaments.count({
          where: { organizatori_id: req.user.id },
        }),
        prisma.tournaments.count({
          where: { organizatori_id: req.user.id, statusi: "Aktiv" },
        }),
        prisma.tournaments.count({
          where: { organizatori_id: req.user.id, statusi: "Përfunduar" },
        }),
        prisma.tournaments.findMany({
          where: { organizatori_id: req.user.id },
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            emertimi: true,
            data_fillimit: true,
            data_perfundimit: true,
            lokacioni: true,
            cmimi_regjistrimit: true,
            statusi: true,
            created_at: true,
          },
        }),
      ]);

    res.json({
      stats: {
        totalTournaments,
        activeTournaments,
        completedTournaments,
      },
      tournaments: tournaments.map(formatTournament),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getRefereeDashboard(req, res) {
  try {
    const referee = await prisma.referees.findUnique({
      where: { user_id: req.user.id },
      select: {
        id: true,
        emri: true,
        mbiemri: true,
        email: true,
        telefoni: true,
        nr_licences: true,
        kategoria: true,
        pervoja_vitesh: true,
        created_at: true,
      },
    });

    if (!referee) {
      return res.status(404).json({ error: "Referee profile not found" });
    }

    const assignments = await prisma.matchreferees.findMany({
      where: { gjyqtari_id: referee.id },
      orderBy: { created_at: "desc" },
      include: {
        matches: {
          include: {
            tournaments: { select: { emertimi: true } },
            teams_matches_ekipi_shtepiak_idToteams: {
              select: { id: true, emertimi: true },
            },
            teams_matches_ekipi_mysafir_idToteams: {
              select: { id: true, emertimi: true },
            },
            matchresults: {
              select: { id: true, golat_shtepiak: true, golat_mysafir: true },
            },
          },
        },
      },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const mappedAssignments = assignments.map(formatMatchAssignment);
    const upcomingMatches = mappedAssignments
      .filter((item) => new Date(item.matchDate) >= now)
      .sort((left, right) => new Date(left.matchDate) - new Date(right.matchDate));
    const pendingReports = mappedAssignments
      .filter((item) => new Date(item.matchDate) < now && !item.hasResult)
      .sort((left, right) => new Date(right.matchDate) - new Date(left.matchDate));

    res.json({
      referee: {
        id: referee.id,
        fullName: [referee.emri, referee.mbiemri].filter(Boolean).join(" "),
        email: referee.email,
        telefoni: referee.telefoni,
        nr_licences: referee.nr_licences,
        kategoria: referee.kategoria,
        pervoja_vitesh: referee.pervoja_vitesh,
        created_at: referee.created_at,
      },
      upcomingMatches,
      pendingReports,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
