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

router.get("/", protect, getProfileSummary);
router.put("/account", protect, updateAccount);
router.put("/password", protect, changePassword);
router.get("/sessions", protect, listSessions);
router.delete("/sessions/:id", protect, revokeSession);
router.get("/tickets", protect, listSupportTickets);
router.get("/organizer", protect, requireRole("is_organizer"), getOrganizerDashboard);
router.get("/referee", protect, requireRole("is_referee"), getRefereeDashboard);

export default router;