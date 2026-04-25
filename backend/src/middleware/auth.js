import jwt from 'jsonwebtoken';
import pool from "../config/db.js";

// Middleware to protect routes and ensure that only authenticated users can access them. It checks for the presence of a JWT token in the cookies, verifies it, and then fetches the user's details from the database to attach to the request object for use in subsequent middleware or route handlers.
export const protect = async (req, res, next) => {
  try{
    const token = req.cookies.token;

    if(!token){
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
    // Verify the token and extract the user ID from it. Then, fetch the user's details from the database and attach them to the request object for use in subsequent middleware or route handlers.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await pool.query(
      `SELECT id, email, emri, mbiemri, roli, statusi, created_at
       FROM users
       WHERE id = $1`,
      [decoded.id],
    );

    if(!user.rows[0]){
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    // Attaching the user's details to the request object, including computed properties for each role for easy role checking in subsequent middleware or route handlers.
    req.user = {
      id: user.rows[0].id,
      email: user.rows[0].email,
      emri: user.rows[0].emri,
      mbiemri: user.rows[0].mbiemri,
      roli: user.rows[0].roli,
      statusi: user.rows[0].statusi,
      created_at: user.rows[0].created_at,
      username: user.rows[0].emri,
      full_name: [user.rows[0].emri, user.rows[0].mbiemri].filter(Boolean).join(" ") || null,
      is_admin: user.rows[0].roli === "admin",
      is_organizer: user.rows[0].roli === "organizator",
      is_referee: user.rows[0].roli === "gjyqtar",
    };
    next();

  } catch (err){
    console.error(err);
    res.status(401).json({ message: "Not authorized, token failed" });
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