// Defines protected dashboard routes that return role-specific dashboard data.
import express from "express";
import { getDashboardData, searchDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

// Returns dashboard cards, live matches, standings, and recent activity.
router.get("/home", getDashboardData);

// Searches dashboard entities from a shared search box.
router.get("/search", searchDashboard);

export default router;
