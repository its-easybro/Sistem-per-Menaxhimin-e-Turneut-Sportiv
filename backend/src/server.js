import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import pool from "./config/db.js";

import sportRoutes from "./routes/sportRoutes.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 3005;
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use("/sports", sportRoutes);
app.use("/users", usersRoutes);
app.use("/api/auth", authRoutes);

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
