import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import crypto, { hash } from "crypto";
import { sendResetEmail } from "../lib/mailer.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation/authValidation.js";

const router = express.Router();

// Cookie options for JWT token
const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 minutes
};
// Cookie options for refresh token
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
// Helper function to generate JWT access token with user information and role-based claims
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      roli: user.roli,
      is_admin: user.roli === "admin",
      is_organizer: user.roli === "organizator",
      is_referee: user.roli === "gjyqtar",
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
};
// Helper function to generate JWT refresh token with user ID
const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
};

// Helper function to build user response object
const buildUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  emri: user.emri,
  mbiemri: user.mbiemri,
  roli: user.roli,
  statusi: user.statusi,
  createdAt: user.createdAt,
  username: user.emri,
  full_name: [user.emri, user.mbiemri].filter(Boolean).join(" ") || null,
  is_admin: user.roli === "admin",
  is_organizer: user.roli === "organizator",
  is_referee: user.roli === "gjyqtar",
});

//Register new user
router.post("/register", async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      email,
      password,
      username,
      full_name,
      emri: rawEmri,
      mbiemri: rawMbiemri,
    } = value;
    const emri =
      rawEmri?.trim() ||
      username?.trim() ||
      full_name?.trim()?.split(/\s+/)[0] ||
      "";
    const mbiemri =
      rawMbiemri?.trim() ||
      full_name?.trim()?.split(/\s+/).slice(1).join(" ") ||
      "";

    if (!emri) {
      return res
        .status(400)
        .json({ message: "Please provide a name or username" });
    }

    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        emri,
        mbiemri,
        email,
        password: hashedPassword,
        roli: "user",
        statusi: "Aktiv",
      },
    });

    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    res.cookie("token", accessToken, accessCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(201).json({
      message: "User created successfully",
      user: buildUserResponse(newUser),
    });
  } catch (err) {
    console.error("Error during registration:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

//Login
router.post("/login", async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = value;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    res.cookie("token", accessToken, accessCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(200).json({
      message: "Login successful",
      userData: buildUserResponse(user),
    });
  } catch (err) {
    console.log("Error during Log In");
    res.status(500).json({ message: "Internal server error" });
  }
});
// Route for refreshing JWT access token using the refresh token. It verifies the refresh token, generates a new access token if valid, and sets it in the cookie.
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    // Verify the refresh token and extract the user ID from it. Then, fetch the user's details from the database to ensure they still exist and are valid before generating a new access token.
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    // Generate a new access token and set it in the cookie with appropriate options for security and expiration. If the refresh token is valid and the user exists, the client will receive a new access token without needing to log in again.
    const newAccessToken = generateAccessToken(user);
    res.cookie("token", newAccessToken, accessCookieOptions);
    res.json({ message: "Token refreshed" });
  } catch (err) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
});

//Me
router.get("/me", protect, async (req, res) => {
  try {
    res.json(req.user);
    //return info of the logged in user from middleware
  } catch (err) {
    console.error("Error fetching user data:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

//Logout
router.post("/Logout", async (req, res) => {
  // Clear the token cookie by setting it to an empty value and expiring it immediately
  res.cookie("token", "", { ...refreshCookieOptions, maxAge: 1 });
  // Clear the refresh token cookie by setting it to an empty value and expiring it immediately
  res.cookie("refreshToken", "", { ...refreshCookieOptions, maxAge: 1 });
  res.json({ message: "Logged out successfully" });
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email } = value;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res
        .status(200)
        .json({ message: "If that email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: {
        reset_token: token,
        reset_token_expiry: expiry,
      },
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    void sendResetEmail(user.email, resetLink).catch((mailErr) => {
      console.error("Forgot password email error:", mailErr.message);
    });

    res
      .status(200)
      .json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reset Password (for email)
router.post("/reset-password", async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { token, password } = value;
    const user = await prisma.user.findFirst({
      where: {
        reset_token: token,
        reset_token_expiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      },
    });
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});
export default router;
