import { Router } from 'express';
import mongoose from 'mongoose';
import Issue from '../models/Issue.js';
import { optionalAuth, requireAuth, requireStaff } from '../middleware/auth.js';
import { deleteIssueMedia, isCloudinaryConfigured, uploadIssueImage, uploadIssueVideo } from '../config/cloudinary.js';
import { uploadImage } from '../middleware/uploadImage.js';
import { uploadVideo } from '../middleware/uploadVideo.js';

const router = Router();
const teams = ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'General'];
const categories = ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'Other'];
const teamForCategory = { Facilities: 'Facilities', IT: 'IT', Security: 'Security', Dining: 'Dining', Grounds: 'Grounds', Other: 'General' };
const statuses = ['Open', 'Acknowledged', 'In progress', 'Resolved', 'Reopened'];
const populated = (query) => query
  .populate('author', 'name role team avatarColor')
  .populate('comments.author', 'name role team avatarColor')
  .populate({ path: 'commentIds', populate: { path: 'author', select: 'name role team avatarColor' } })
  .populate('updates.author', 'name role team avatarColor');
const issueJson = (issue, user) => {
  const raw = issue.toObject ? issue.toObject() : issue;
  const { votes, followers, commentIds = [], comments: legacyComments = [], ...publicIssue } = raw;
  const uid = user?._id?.toString();
  const comments = [...legacyComments.map(comment => ({ ...comment, legacy: true })), ...commentIds.map(comment => ({ _id: comment._id, author: comment.author, body: comment.body, staffReply: comment.staffReply, likes: comment.likes || 0, likedBy: comment.likedBy || [], createdAt: comment.createdAt }))].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { ...publicIssue, comments, affectedCount: votes.filter(v => v.response === 'affected').length, notAffectedCount: votes.filter(v => v.response === 'not-affected').length, myVote: votes.find(v => v.user?._id?.toString() === uid || v.user?.toString() === uid)?.response || null, isFollowing: followers.some(f => f._id?.toString() === uid || f.toString() === uid), commentsCount: comments.length };
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

const createIssue = async (req, res, next) => {
  let uploadedMedia = null;
  let createdIssueId = null;
  try {
    const { title, description, category, location } = req.body;
    const file = req.file;
    const mediaType = req.path === '/video' ? 'video' : 'image';
    if (!title?.trim() || title.trim().length > 120 || !description?.trim() || description.trim().length > 3000 || !location?.trim() || location.trim().length > 120 || !categories.includes(category)) return res.status(400).json({ message: 'Add a title, description, campus location, and issue type.' });
    if (file && !isCloudinaryConfigured()) return res.status(503).json({ message: 'Photo and video uploads are not configured. Add Cloudinary credentials to the backend environment.' });
    if (file) {
      const result = mediaType === 'video' ? await uploadIssueVideo(file.buffer) : await uploadIssueImage(file.buffer);
      if (!result?.secure_url || !result?.public_id) throw new Error('Cloudinary did not return a media URL.');
      uploadedMedia = { url: result.secure_url, publicId: result.public_id, mediaType };
    }
    const team = teamForCategory[category];
    const issue = await Issue.create({
      title: title.trim(), description: description.trim(), category, location: location.trim(), team,
      imageUrl: uploadedMedia?.mediaType === 'image' ? uploadedMedia.url : '',
      imagePublicId: uploadedMedia?.mediaType === 'image' ? uploadedMedia.publicId : '',
      videoUrl: uploadedMedia?.mediaType === 'video' ? uploadedMedia.url : '',
      videoPublicId: uploadedMedia?.mediaType === 'video' ? uploadedMedia.publicId : '',
      author: req.user._id, followers: [req.user._id], updates: [{ author: req.user._id, status: 'Open', note: 'Issue reported' }]
    });
    createdIssueId = issue._id;
    res.status(201).json({ issue: issueJson(await populated(Issue.findById(issue._id)), req.user) });
  } catch (error) {
    if (createdIssueId) await Issue.deleteOne({ _id: createdIssueId }).catch(cleanupError => console.error('Could not clean up failed issue creation:', cleanupError.message));
    if (uploadedMedia?.publicId) await deleteIssueMedia(uploadedMedia.publicId, uploadedMedia.mediaType).catch(cleanupError => console.error('Could not clean up failed issue media upload:', cleanupError.message));
    const cloudinaryStatus = error.http_code || error.error?.http_code || error.statusCode;
    if (cloudinaryStatus === 403) {
      console.error('Cloudinary denied this signed upload (HTTP 403). Check Cloudinary upload restrictions and the product environment settings.');
      return res.status(502).json({ message: 'Cloudinary denied this upload. Review upload restrictions in the Cloudinary product environment; HTTP 403 means the request was disallowed.' });
    }
    if (cloudinaryStatus || error.name === 'UnexpectedResponse') console.error('Cloudinary issue media upload failed:', { status: cloudinaryStatus || null, message: error.message });
    next(error);
  }
};

router.post('/video', requireAuth, uploadVideo.single('video'), createIssue);
router.post('/', requireAuth, uploadImage.single('image'), createIssue);

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
