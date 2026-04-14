import jwt from 'jsonwebtoken';
import pool from "../config/db.js";

export const protect = async (req, res, next) => {
  try{
    const token = req.cookies.token;

    if(!token){
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

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
    };
    next();

  } catch (err){
    console.error(err);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
}
export function requireAdmin(req, res, next) {
  if (!req.user || (!req.user.is_admin && req.user.roli !== "admin")) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
