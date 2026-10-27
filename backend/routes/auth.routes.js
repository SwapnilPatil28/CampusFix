import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false });
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, team: user.team, avatarColor: user.avatarColor });
function setCookie(res, user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const production = process.env.NODE_ENV === 'production';
  res.cookie('campusfix_token', token, { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || !password || password.length < 8) return res.status(400).json({ message: 'Enter your name, a valid email, and a password with at least 8 characters.' });
    const user = await User.create({ name: name.trim(), email, password: await bcrypt.hash(password, 12), role: 'student' });
    setCookie(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || '').toLowerCase().trim() }).select('+password');
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    setCookie(res, user);
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/logout', (_req, res) => { const production = process.env.NODE_ENV === 'production'; res.clearCookie('campusfix_token', { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax' }); res.json({ message: 'Signed out.' }); });
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;
