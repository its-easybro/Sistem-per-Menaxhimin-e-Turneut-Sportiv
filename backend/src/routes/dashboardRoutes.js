import express from "express";
import { getDashboardData, searchDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/home", getDashboardData);
router.get("/search", searchDashboard);

export default router;