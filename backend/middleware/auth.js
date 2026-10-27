import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function optionalAuth(req, _res, next) {
  const token = req.cookies?.campusfix_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch { /* An expired cookie behaves like a signed-out visitor. */ }
  }
  next();
}

export async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {});
  if (!req.user) return res.status(401).json({ message: 'Please sign in to continue.' });
  next();
}

export function requireStaff(req, res, next) {
  if (!['staff', 'admin'].includes(req.user?.role)) return res.status(403).json({ message: 'Operations staff access required.' });
  next();
}
