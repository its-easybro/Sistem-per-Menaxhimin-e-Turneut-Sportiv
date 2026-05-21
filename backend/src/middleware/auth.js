import jwt from 'jsonwebtoken';
import pool from "../config/db.js";
import prisma from "../lib/prisma.js";

// Middleware to protect routes and ensure that only authenticated users can access them. It checks for the presence of a JWT token in the cookies, verifies it, and then fetches the user's details from the database to attach to the request object for use in subsequent middleware or route handlers.
export const protect = async (req, res, next) => {
  try{
    const token = req.cookies.token;

    if(!token){
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
    // Verify the token and extract the user ID from it. Then, fetch the user's details from the database and attach them to the request object for use in subsequent middleware or route handlers.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ 
      where: { id: decoded.id } 
    })

    if(!user){
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    // Attaching the user's details to the request object, including computed properties for each role for easy role checking in subsequent middleware or route handlers.
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

// Middleware to restrict access to certain routes based on user roles. It checks if the authenticated user has at least one of the specified roles and allows access if they do, otherwise it returns a 403 Forbidden response.
export const requireRole = (...roles) => (req, res, next) => {
  const hasRole = roles.some(role => req.user?.[role] === true);
  if (!hasRole){
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}