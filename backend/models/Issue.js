import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  category: { type: String, enum: ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'Other'], required: true },
  location: { type: String, required: true, trim: true, maxlength: 120 },
  team: { type: String, enum: ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'General'], required: true },
  imageUrl: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Open', 'Acknowledged', 'In progress', 'Resolved', 'Reopened'], default: 'Open' },
  votes: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, response: { type: String, enum: ['affected', 'not-affected'] } }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 1200 },
    staffReply: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  updates: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, required: true },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

issueSchema.index({ title: 'text', description: 'text', location: 'text' });
issueSchema.index({ status: 1, team: 1, createdAt: -1 });
export default mongoose.model('Issue', issueSchema);
