// Verifies JWT cookies, loads the authenticated user, and enforces role-based route access.
import jwt from 'jsonwebtoken';
import pool from "../config/db.js";
import prisma from "../lib/prisma.js";

// Protects routes by verifying the JWT cookie and loading the logged-in user.
export const protect = async (req, res, next) => {
  try{
    const token = req.cookies.token;

    // Stop the request early when no login token is present.
    if(!token){
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

    // Decode the token to get the user id stored during login.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load fresh user data so role checks use the current database state.
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.id } 
    })

    if(!user){
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    // Attach user fields and role booleans for later middleware and routes.
    req.user = {
      id: user.id,
      email: user.email,
      emri: user.emri,
      mbiemri: user.mbiemri,
      roli: user.roli,
      statusi: user.statusi,
      created_at: user.createdAt,
      username: user.emri,
      full_name: [user.emri, user.mbiemri].filter(Boolean).join(" ") || null,
      is_admin: user.roli === "admin",
      is_organizer: user.roli === "organizator",
      is_referee: user.roli === "gjyqtar",
    };
    next();

  } catch (err){
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
}

// Restricts routes to users that have at least one allowed role.
export const requireRole = (...roles) => (req, res, next) => {
  // Roles are stored as booleans on req.user by the protect middleware.
  const hasRole = roles.some(role => req.user?.[role] === true);
  if (!hasRole){
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
