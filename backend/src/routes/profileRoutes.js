// Defines authenticated profile routes for account details, sessions, support tickets, and dashboard views.
import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import {
  changePassword,
  getOrganizerDashboard,
  getProfileSummary,
  getRefereeDashboard,
  listSessions,
  listSupportTickets,
  revokeSession,
  updateAccount,
} from "../controllers/profileController.js";

const router = express.Router();

// Returns the user's profile summary.
router.get("/", protect, getProfileSummary);

// Updates account names for the logged-in user.
router.put("/account", protect, updateAccount);

// Changes the logged-in user's password.
router.put("/password", protect, changePassword);

// Lists active login sessions for the current user.
router.get("/sessions", protect, listSessions);

// Revokes a selected login session.
router.delete("/sessions/:id", protect, revokeSession);

// Lists support tickets linked to the user's email.
router.get("/tickets", protect, listSupportTickets);

// Returns organizer-specific profile dashboard data.
router.get("/organizer", protect, requireRole("is_organizer"), getOrganizerDashboard);

// Returns referee-specific profile dashboard data.
router.get("/referee", protect, requireRole("is_referee"), getRefereeDashboard);

export default router;
