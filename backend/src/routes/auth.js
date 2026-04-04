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
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

//Register new user
router.post("/register", async (req, res) => {
    try {
        const { email, username, password, full_name } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ message: "Please fill in all required fields" });
        }

        const userExists = await pool.query(
            "SELECT id FROM users WHERE email = $1 OR username = $2",
            [email, username]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: "Email or username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            "INSERT INTO users (username, email, password, full_name) VALUES ($1, $2, $3, $4) RETURNING id, email, username, full_name, is_admin, created_at",
            [username, email, hashedPassword, full_name || null]
        );

        const token = generateToken(newUser.rows[0].id);
        res.cookie("token", token, cookieOptions);

        return res.status(201).json({ message: "User created successfully", user: newUser.rows[0] });

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

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if(user.rows.length === 0){
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const userData = user.rows[0];
        const isMatch = await bcrypt.compare(password, userData.password);

        if (!isMatch){
            return res.status(403).json({ message: "Invalid credentials" });
        }

        const generateToken = (user) => {
            return jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin },
            process.env.JWT_SECRET, { expiresIn: "30d" }
            );
        }

        const token = generateToken(userData);

        res.cookie("token", token, cookieOptions);

        if (requireAdmin && !userData.is_admin) {
             return res.status(404).json({ message: "Admin access required" });
        }

        return res.status(200).json({
            message: "Login successful",
            token,
            userData: {
                id: userData.id,
                email: userData.email,
                username: userData.username,
                full_name: userData.full_name,
                is_admin: userData.is_admin,
            },
        });

    } catch (err){
        console.log("Error durig Log In");
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