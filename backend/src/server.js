import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import pool from "./config/db.js";

import sportRoutes from "./routes/sportRoutes.js";
import authRoutes from "./routes/auth.js";
import playersRoutes from "./routes/playersRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import venuesRoutes from "./routes/venuesRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import matchesRoutes from "./routes/matchesRoutes.js";
import tournamentsRoutes from "./routes/tournamentsRoutes.js";
import matchResultsRoutes from "./routes/matchResultsRoutes.js";
import matchRefereesRoutes from "./routes/matchRefereesRoutes.js";
import tournamentRegistrationsRoutes from "./routes/tournamentRegistrationsRoutes.js";
import refereesRoutes from "./routes/refereesRoutes.js";
dotenv.config();
const app = express();
const port = process.env.PORT || 3005;
const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(
  /\/$/,
  "",
);

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use("/sports", sportRoutes);
app.use("/players", playersRoutes);
app.use("/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/venues", venuesRoutes);
app.use("/teams", teamRoutes);
app.use("/matches", matchesRoutes);
app.use("/tournaments", tournamentsRoutes);
app.use("/match-results", matchResultsRoutes);
app.use("/match-referees", matchRefereesRoutes);
app.use("/tournament-registrations", tournamentRegistrationsRoutes);
app.use("/referees", refereesRoutes);
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

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
