import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import crypto, { hash } from "crypto";
import { sendResetEmail } from "../lib/mailer.js";
import Joi from "joi";
import { authLimiter, forgotPwLimiter} from "../middleware/rateLimiter.js"

const router = express.Router();

// Validation Schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email must be valid",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
  username: Joi.string().optional(),
  full_name: Joi.string().optional(),
  emri: Joi.string().optional(),
  mbiemri: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email must be valid",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email must be valid",
    "any.required": "Email is required",
  }),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Token is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
});

// Cookie options for JWT token
const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 minutes
};
// Cookie options for the session identifier used to restore auth state.
const sessionCookieOptions = {
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
    { expiresIn: "1m" },
  );
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
router.post("/register", authLimiter, async (req, res) => {
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
    const session = await prisma.session.create({
      data: {
        userId: newUser.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    res.cookie("token", accessToken, accessCookieOptions);
    res.cookie("sessionId", session.id, sessionCookieOptions);

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
router.post("/login", authLimiter, async (req, res) => {
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

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });

    res.cookie("sessionId", session.id, sessionCookieOptions);
    res.cookie("token", accessToken, accessCookieOptions);

    return res.status(200).json({
      message: "Login successful",
      userData: buildUserResponse(user),
    });
  } catch (err) {
    console.log("Error during Log In");
    res.status(500).json({ message: "Internal server error" });
  }
});
// Route for refreshing the access token using the stored session identifier.
router.post("/refresh", async (req, res) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).json({ message: "No Session" });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({
          where: { id: sessionId }
        })
      }
      return res.status(403).json({ message: "Session expired" });
    }

    const newAccessToken = generateAccessToken(session.user);
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
router.post("/logout", async (req, res) => {
  const sessionId = req.cookies.sessionId;

  if (sessionId) {
    await prisma.session
      .delete({
        where: { id: sessionId },
      })
      .catch(() => null);
  }
  // Clear the token and sessionId cookies by setting them to an empty value and expiring them immediately.
  res.cookie("token", "", { ...sessionCookieOptions, maxAge: 1 });
  res.cookie("sessionId", "", { ...sessionCookieOptions, maxAge: 1 });
  res.json({ message: "Logged out successfully" });
});

// Forgot Password
router.post("/forgot-password", forgotPwLimiter, async (req, res) => {
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
