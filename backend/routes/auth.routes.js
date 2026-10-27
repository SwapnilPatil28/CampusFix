import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Issue, { REPORTED_UNRESOLVED_STATUS } from '../models/Issue.js';
import Comment from '../models/Comment.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { isCloudinaryConfigured, uploadProfileImage, deleteIssueMedia } from '../config/cloudinary.js';
import { uploadImage } from '../middleware/uploadImage.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false });
const profileUploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, team: user.team, rollNo: user.rollNo || '', employeeId: user.employeeId || '', avatarColor: user.avatarColor, avatarUrl: user.avatarUrl || '' });
const visibleIssueStatus = (status, viewer) => status === REPORTED_UNRESOLVED_STATUS && !['staff', 'admin'].includes(viewer?.role) ? 'Resolved' : status;
const allowedEmail = (email) => {
  const normalized = String(email || '').toLowerCase().trim();
  return /^[^\s@]+@(?:sst\.scaler\.com|scaler\.com)$/.test(normalized) ? normalized : '';
};
const validName = (name) => typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 80;
function setCookie(res, user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const production = process.env.NODE_ENV === 'production';
  res.cookie('campusfix_token', token, { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { name, role = 'student', password } = req.body;
    const email = allowedEmail(req.body.email);
    if (!validName(name) || !email || typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Enter your name, an @sst.scaler.com or @scaler.com email, and a password between 8 and 128 characters.' });
    if (!['student', 'ops'].includes(role)) return res.status(400).json({ message: 'Choose Student or Operations.' });
    let userData = { name: name.trim(), email, password: await bcrypt.hash(password, 12), role: role === 'ops' ? 'staff' : 'student' };
    if (role === 'student') {
      const rollNo = String(req.body.rollNo || '').trim().toUpperCase();
      if (!/^[a-zA-Z0-9/-]{2,40}$/.test(rollNo)) return res.status(400).json({ message: 'Enter a valid student roll number.' });
      if (await User.exists({ role: 'student', rollNo })) return res.status(409).json({ message: 'That student roll number is already registered.' });
      userData.rollNo = rollNo;
    } else {
      const team = String(req.body.team || '');
      const employeeId = String(req.body.employeeId || '').trim().toUpperCase();
      if (!['Facilities', 'IT', 'Security', 'Dining', 'Grounds'].includes(team)) return res.status(400).json({ message: 'Choose a valid operations department.' });
      if (!/^[a-zA-Z0-9/-]{2,40}$/.test(employeeId)) return res.status(400).json({ message: 'Enter a valid employee ID.' });
      const expectedCode = String(process.env.OPS_ACCESS_CODE || '').trim();
      const submittedCode = typeof req.body.opsCode === 'string' ? req.body.opsCode.trim() : '';
      if (!expectedCode) return res.status(503).json({ message: 'Operations registration is not configured yet. Contact the campus administrator.' });
      const submitted = Buffer.from(submittedCode);
      const expected = Buffer.from(expectedCode);
      const codeMatches = submitted.length === expected.length && crypto.timingSafeEqual(submitted, expected);
      if (!codeMatches) return res.status(403).json({ message: 'The operations access code is incorrect.' });
      if (await User.exists({ employeeId })) return res.status(409).json({ message: 'That employee ID is already registered.' });
      userData = { ...userData, employeeId, team };
    }
    const user = await User.create(userData);
    setCookie(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = allowedEmail(req.body.email);
    if (!email) return res.status(400).json({ message: 'Use your @sst.scaler.com or @scaler.com campus email.' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    setCookie(res, user);
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/logout', (_req, res) => { const production = process.env.NODE_ENV === 'production'; res.clearCookie('campusfix_token', { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax' }); res.json({ message: 'Signed out.' }); });
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.get('/profile/:id', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Profile not found.' });
    const user = await User.findById(req.params.id);
    if (!user || !allowedEmail(user.email)) return res.status(404).json({ message: 'Profile not found.' });
    const [ownedIssues, followedIssues, rawComments] = await Promise.all([
      Issue.find({ author: user._id }).sort({ createdAt: -1 }).select('title category location status createdAt').lean(),
      Issue.find({ followers: user._id, author: { $ne: user._id } }).sort({ updatedAt: -1 }).select('title category location status createdAt updatedAt').lean(),
      Comment.find({ author: user._id }).sort({ createdAt: -1 }).populate('issue', 'title status category').lean()
    ]);
    const formatIssue = issue => ({ ...issue, status: visibleIssueStatus(issue.status, req.user) });
    const issues = ownedIssues.map(formatIssue);
    const savedIssues = followedIssues.map(formatIssue);
    const comments = rawComments.map(comment => comment.issue ? { ...comment, issue: formatIssue(comment.issue) } : comment);
    const legacy = await Issue.find({ 'comments.author': user._id }).select('title status category comments').lean();
    const legacyComments = legacy.flatMap(issue => issue.comments.filter(comment => comment.author?.toString() === user._id.toString()).map(comment => ({ _id: comment._id, body: comment.body, createdAt: comment.createdAt, issue: { _id: issue._id, title: issue.title, status: visibleIssueStatus(issue.status, req.user), category: issue.category } })));
    const allComments = [...comments, ...legacyComments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ user: publicUser(user), isOwner: Boolean(req.user && req.user._id.toString() === user._id.toString()), issues, savedIssues, comments: allComments });
  } catch (error) { next(error); }
});

router.post('/profile/avatar', requireAuth, profileUploadLimiter, uploadImage.single('image'), async (req, res, next) => {
  let uploadedPublicId = '';
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose an image first.' });
    if (!isCloudinaryConfigured()) return res.status(503).json({ message: 'Profile photo uploads are not configured. Contact the administrator.' });
    const result = await uploadProfileImage(req.file.buffer);
    if (!result?.secure_url || !result?.public_id) return res.status(502).json({ message: 'The image service did not return a usable photo.' });
    uploadedPublicId = result.public_id;
    const oldPublicId = req.user.avatarPublicId;
    req.user.avatarUrl = result.secure_url;
    req.user.avatarPublicId = result.public_id;
    await req.user.save();
    uploadedPublicId = '';
    if (oldPublicId) await deleteIssueMedia(oldPublicId).catch(error => console.error('Could not remove old profile image:', error.message));
    res.json({ user: publicUser(req.user) });
  } catch (error) {
    if (uploadedPublicId) await deleteIssueMedia(uploadedPublicId).catch(cleanupError => console.error('Could not remove failed profile image upload:', cleanupError.message));
    if (error.http_code || error.name === 'UnexpectedResponse') return res.status(502).json({ message: error.http_code === 403 ? 'Cloudinary denied this profile photo. Review upload restrictions in the Cloudinary product environment.' : 'The profile photo service is temporarily unavailable. Try again later.' });
    next(error);
  }
});

export default router;
