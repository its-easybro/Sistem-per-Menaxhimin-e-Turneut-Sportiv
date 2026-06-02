import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import pool from "./config/db.js";
import http from "http";
import { Server } from "socket.io";
import { startMatchCron } from "./services/matchCron.js";

// Import routes
import sportRoutes from "./routes/sportRoutes.js";
import authRoutes from "./routes/auth.js";
import playersRoutes from "./routes/playersRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import venuesRoutes from "./routes/venuesRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import matchesRoutes from "./routes/matchesRoutes.js";
import matchEventsRoutes, {
  matchEventLifecycleRoutes,
} from "./routes/matchEventsRoutes.js";
import tournamentsRoutes from "./routes/tournamentsRoutes.js";
import matchResultsRoutes from "./routes/matchResultsRoutes.js";
import matchRefereesRoutes from "./routes/matchRefereesRoutes.js";
import tournamentRegistrationsRoutes from "./routes/tournamentRegistrationsRoutes.js";
import refereesRoutes from "./routes/refereesRoutes.js";
import standingsRoutes from "./routes/standingsRoutes.js";
import contactUsRoute from "./routes/contactUsRoute.js";
import profileRoutes from "./routes/profileRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import bracketsRoutes from "./routes/bracketsRoutes.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import sessionRoute from "./routes/sessionRoute.js"

// Load environment variables
dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 3005;
const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(
  /\/$/,
  "",
);

const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
    credentials: true,
  }
});

app.set("io", io); // Make io accessible in routes via req.app.get("io")
startMatchCron(io); // Start the match cron job

// Middleware
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);
//app.use(cors());
app.use(apiLimiter);
app.use(express.json());
app.use(cookieParser());
app.use("/sports", sportRoutes);
app.use("/players", playersRoutes);
app.use("/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/venues", venuesRoutes);
app.use("/teams", teamRoutes);
app.use("/matches", matchEventsRoutes);
app.use("/matches", matchesRoutes);
app.use("/match-events", matchEventLifecycleRoutes);
app.use("/tournaments", tournamentsRoutes);
app.use("/match-results", matchResultsRoutes);
app.use("/match-referees", matchRefereesRoutes);
app.use("/tournament-registrations", tournamentRegistrationsRoutes);
app.use("/referees", refereesRoutes);
app.use("/standings", standingsRoutes);
app.use("/brackets", bracketsRoutes);
app.use("/contactUs", contactUsRoute);
app.use("/sessions", sessionRoute);
app.use("/profile", profileRoutes);
app.use("/dashboard", dashboardRoutes);

// Start the server
httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("U lidh me databazen me sukses!");
    client.release();
  } catch (err) {
    console.error("Lidhja deshtoi:", err.message);
  }
}

testConnection();
