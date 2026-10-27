import { Router } from 'express';
import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Issue from '../models/Issue.js';
import User from '../models/User.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Issue not found.' });
    if (!await Issue.exists({ _id: id })) return res.status(404).json({ message: 'Issue not found.' });
    const comments = await Comment.find({ issue: id }).sort({ createdAt: 1 }).populate('author', 'name role team avatarColor avatarUrl').lean();
    res.json({ comments });
  } catch (error) { next(error); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Issue not found.' });
    if (!body || body.length > 1200) return res.status(400).json({ message: 'Comment must be between 1 and 1,200 characters.' });
    const issue = await Issue.findById(id).select('_id');
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    const comment = await Comment.create({ issue: id, author: req.user._id, body, staffReply: ['staff', 'admin'].includes(req.user.role) });
    try {
      await Promise.all([
        User.updateOne({ _id: req.user._id }, { $addToSet: { myComments: comment._id } }),
        Issue.updateOne({ _id: id }, { $addToSet: { commentIds: comment._id, followers: req.user._id } })
      ]);
    } catch (error) {
      await Promise.all([
        Comment.deleteOne({ _id: comment._id }),
        User.updateOne({ _id: req.user._id }, { $pull: { myComments: comment._id } }),
        Issue.updateOne({ _id: id }, { $pull: { commentIds: comment._id } })
      ]);
      throw error;
    }
    const savedComment = await Comment.findById(comment._id).populate('author', 'name role team avatarColor avatarUrl').lean();
    res.status(201).json({ comment: savedComment });
  } catch (error) { next(error); }
});

router.delete('/:commentId', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) return res.status(404).json({ message: 'Comment not found.' });
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.issue.toString() !== req.params.id) return res.status(404).json({ message: 'Comment not found.' });
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ message: 'You can only delete your own comment.' });
    await Promise.all([
      Comment.deleteOne({ _id: comment._id }),
      User.updateOne({ _id: comment.author }, { $pull: { myComments: comment._id } }),
      Issue.updateOne({ _id: comment.issue }, { $pull: { commentIds: comment._id } })
    ]);
    res.json({ message: 'Comment deleted.' });
  } catch (error) { next(error); }
});

router.post('/:commentId/like', requireAuth, async (req, res, next) => {
  try {
    const filter = { _id: req.params.commentId, issue: req.params.id };
    const updated = await Comment.findOneAndUpdate({ ...filter, likedBy: { $ne: req.user._id } }, { $addToSet: { likedBy: req.user._id }, $inc: { likes: 1 } }, { new: true }).populate('author', 'name role team avatarColor avatarUrl').lean();
    const comment = updated || await Comment.findOne(filter).populate('author', 'name role team avatarColor avatarUrl').lean();
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });
    res.json({ comment });
  } catch (error) { next(error); }
});

router.delete('/:commentId/like', requireAuth, async (req, res, next) => {
  try {
    const filter = { _id: req.params.commentId, issue: req.params.id };
    const updated = await Comment.findOneAndUpdate({ ...filter, likedBy: req.user._id }, { $pull: { likedBy: req.user._id }, $inc: { likes: -1 } }, { new: true }).populate('author', 'name role team avatarColor avatarUrl').lean();
    const comment = updated || await Comment.findOne(filter).populate('author', 'name role team avatarColor avatarUrl').lean();
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });
    res.json({ comment });
  } catch (error) { next(error); }
});

export default router;
