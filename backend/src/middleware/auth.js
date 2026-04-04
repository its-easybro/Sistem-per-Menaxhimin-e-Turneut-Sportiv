import jwt from 'jsonwebtoken';
import pool from "../config/db.js";

export const protect = async (req, res, next) => {
  try{
    const token = req.cookies.token;

    if(!token){
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await pool.query("SELECT id, email, username, full_name, is_admin FROM users WHERE id = $1", [decoded.id]);

    if(!user.rows[0]){
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    req.user = user.rows[0];
    next();

  } catch (err){
    console.error(err);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}