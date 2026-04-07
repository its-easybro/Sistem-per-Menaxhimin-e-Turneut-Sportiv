import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      roli: user.roli,
      is_admin: user.roli === "admin",
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" },
  );
};

const buildUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  emri: user.emri,
  mbiemri: user.mbiemri,
  roli: user.roli,
  statusi: user.statusi,
  created_at: user.created_at,
  username: user.emri,
  full_name: [user.emri, user.mbiemri].filter(Boolean).join(" ") || null,
  is_admin: user.roli === "admin",
});

//Register new user
router.post("/register", async (req, res) => {
    try {
        const { email, password, username, full_name, emri: rawEmri, mbiemri: rawMbiemri } = req.body;
        const emri = rawEmri?.trim() || username?.trim() || full_name?.trim()?.split(/\s+/)[0] || "";
        const mbiemri = rawMbiemri?.trim() || full_name?.trim()?.split(/\s+/).slice(1).join(" ") || "";

        if (!email || !password || !emri) {
            return res.status(400).json({ message: "Please provide email, password, and a name or username" });
        }

        const userExists = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            `INSERT INTO users (emri, mbiemri, email, password, roli, statusi)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, emri, mbiemri, roli, statusi, created_at`,
            [emri, mbiemri, email, hashedPassword, "user", "Aktiv"]
        );

        const token = generateToken(newUser.rows[0]);
        res.cookie("token", token, cookieOptions);

        return res.status(201).json({ message: "User created successfully", user: buildUserResponse(newUser.rows[0]) });

    } catch (err) {
        console.error("Error during registration:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

//Login
router.post("/login", async(req, res) => {
    try{
        const { email, password, requireAdmin = false } = req.body;
        
        if(!email || !password){
        return res.status(400).json({ message: "Please provide all required fields "});
        }

        const user = await pool.query(
            `SELECT id, email, emri, mbiemri, password, roli, statusi, created_at
             FROM users
             WHERE email = $1`,
            [email]
        );

        if(user.rows.length === 0){
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const userData = user.rows[0];
        const isMatch = await bcrypt.compare(password, userData.password);

        if (!isMatch){
            return res.status(403).json({ message: "Invalid credentials" });
        }

        const token = generateToken(userData);

        res.cookie("token", token, cookieOptions);

        if (requireAdmin && userData.roli !== "admin") {
             return res.status(403).json({ message: "Admin access required" });
        }

        return res.status(200).json({
            message: "Login successful",
            token,
            userData: buildUserResponse(userData),
        });

    } catch (err){
        console.log("Error during Log In");
        res.status(500).json({ message: "Internal server error" });
    }
});

//Me
router.get("/me", protect, async (req, res) => {
    try {

        res.json(req.user)
        //return info of the logged in user from middleware

    } catch (err) {
        console.error("Error fetching user data:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

//Logout
router.post("/Logout", async(req, res) => {
    res.cookie( "token", "" , { ...cookieOptions, maxAge: 1});
    res.json({ message: "Logged out successfully"});
});

export default router;
