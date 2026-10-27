import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 1200 },
  staffReply: { type: Boolean, default: false },
  likes: { type: Number, default: 0, min: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

commentSchema.index({ issue: 1, createdAt: 1 });
export default mongoose.model('Comment', commentSchema);
