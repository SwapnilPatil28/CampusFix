import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import Issue from '../models/Issue.js';
import { optionalAuth, requireAuth, requireStaff } from '../middleware/auth.js';
import { isCloudinaryConfigured, uploadIssueImage } from '../config/cloudinary.js';

const router = Router();
const teams = ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'General'];
const categories = ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'Other'];
const statuses = ['Open', 'Acknowledged', 'In progress', 'Resolved', 'Reopened'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
});
const populated = (query) => query.populate('author', 'name role team avatarColor').populate('comments.author', 'name role team avatarColor').populate('updates.author', 'name role team avatarColor');
const issueJson = (issue, user) => {
  const raw = issue.toObject ? issue.toObject() : issue;
  const { votes, followers, ...publicIssue } = raw;
  const uid = user?._id?.toString();
  return { ...publicIssue, affectedCount: votes.filter(v => v.response === 'affected').length, notAffectedCount: votes.filter(v => v.response === 'not-affected').length, myVote: votes.find(v => v.user?._id?.toString() === uid || v.user?.toString() === uid)?.response || null, isFollowing: followers.some(f => f._id?.toString() === uid || f.toString() === uid), commentsCount: raw.comments.length };
};

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { q, status, team, category, sort = 'recent', page = '1', following } = req.query;
    const filter = {};
    if (following === '1') {
      if (!req.user) return res.json({ issues: [], total: 0, page: 1, pages: 0, summary: {} });
      filter.followers = req.user._id;
    }
    if (status && statuses.includes(status)) filter.status = status;
    if (team && teams.includes(team)) filter.team = team;
    if (category && categories.includes(category)) filter.category = category;
    if (q?.trim()) filter.$text = { $search: String(q).trim() };
    const pageNum = Math.max(1, Math.min(1000, Number.parseInt(page, 10) || 1));
    const order = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    const [issues, total, counts] = await Promise.all([
      populated(Issue.find(filter).sort(order).skip((pageNum - 1) * 20).limit(20)),
      Issue.countDocuments(filter),
      Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);
    const orderedIssues = sort === 'trending' ? issues.sort((a, b) => b.votes.length - a.votes.length) : issues;
    res.json({ issues: orderedIssues.map(i => issueJson(i, req.user)), total, page: pageNum, pages: Math.ceil(total / 20), summary: counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}) });
  } catch (error) { next(error); }
});

router.post('/upload', requireAuth, (req, res, next) => upload.single('image')(req, res, async (error) => {
  if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : 'Upload a JPG, PNG, GIF, or WebP image.' });
  if (!req.file) return res.status(400).json({ message: 'Choose an image to upload.' });
  if (!isCloudinaryConfigured()) return res.status(503).json({ message: 'Photo uploads are not configured yet. Add Cloudinary credentials to the backend environment.' });
  try {
    const uploaded = await uploadIssueImage(req.file.buffer);
    res.status(201).json(uploaded);
  } catch (uploadError) { next(uploadError); }
}));

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, description, category, location, team, imageUrl, imagePublicId } = req.body;
    if (!title?.trim() || title.trim().length > 120 || !description?.trim() || description.trim().length > 3000 || !location?.trim() || location.trim().length > 120 || !categories.includes(category) || !teams.includes(team)) return res.status(400).json({ message: 'Add a title, description, campus location, category, and operations team.' });
    const issue = await Issue.create({ title: title.trim(), description: description.trim(), category, location: location.trim(), team, imageUrl: typeof imageUrl === 'string' ? imageUrl.slice(0, 1000) : '', imagePublicId: typeof imagePublicId === 'string' ? imagePublicId.slice(0, 200) : '', author: req.user._id, followers: [req.user._id], updates: [{ author: req.user._id, status: 'Open', note: 'Issue reported' }] });
    res.status(201).json({ issue: issueJson(await populated(Issue.findById(issue._id)), req.user) });
  } catch (error) { next(error); }
});

router.get('/staff/queue', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { team: req.user.team };
    const issues = await populated(Issue.find({ ...filter, status: { $nin: ['Resolved'] } }).sort({ createdAt: 1 }).limit(100));
    res.json({ issues: issues.map(i => issueJson(i, req.user)) });
  } catch (error) { next(error); }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Issue not found.' });
    const issue = await populated(Issue.findById(req.params.id));
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    res.json({ issue: issueJson(issue, req.user) });
  } catch (error) { next(error); }
});

router.post('/:id/vote', requireAuth, async (req, res, next) => {
  try {
    const { response } = req.body;
    if (!['affected', 'not-affected', 'clear'].includes(response)) return res.status(400).json({ message: 'Choose affected, not affected, or clear your response.' });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    issue.votes = issue.votes.filter(v => v.user.toString() !== req.user._id.toString());
    if (response !== 'clear') issue.votes.push({ user: req.user._id, response });
    await issue.save();
    res.json({ issue: issueJson(await populated(Issue.findById(issue._id)), req.user) });
  } catch (error) { next(error); }
});

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const body = String(req.body.body || '').trim();
    if (!body || body.length > 1200) return res.status(400).json({ message: 'Comment must be between 1 and 1,200 characters.' });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    issue.comments.push({ author: req.user._id, body, staffReply: ['staff', 'admin'].includes(req.user.role) });
    if (!issue.followers.some(id => id.toString() === req.user._id.toString())) issue.followers.push(req.user._id);
    await issue.save();
    res.status(201).json({ issue: issueJson(await populated(Issue.findById(issue._id)), req.user) });
  } catch (error) { next(error); }
});

router.post('/:id/follow', requireAuth, async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    const index = issue.followers.findIndex(id => id.toString() === req.user._id.toString());
    if (index >= 0) issue.followers.splice(index, 1); else issue.followers.push(req.user._id);
    await issue.save();
    res.json({ issue: issueJson(await populated(Issue.findById(issue._id)), req.user) });
  } catch (error) { next(error); }
});

router.patch('/:id/status', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!statuses.includes(status)) return res.status(400).json({ message: 'Choose a valid issue status.' });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    if (req.user.role !== 'admin' && req.user.team !== issue.team && req.user.team !== 'General') return res.status(403).json({ message: 'This issue is routed to another operations team.' });
    issue.status = status;
    issue.resolvedAt = status === 'Resolved' ? new Date() : null;
    issue.updates.push({ author: req.user._id, status, note: String(note || '').trim().slice(0, 500) });
    await issue.save();
    res.json({ issue: issueJson(await populated(Issue.findById(issue._id)), req.user) });
  } catch (error) { next(error); }
});

export default router;
