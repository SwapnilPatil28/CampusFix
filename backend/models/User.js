import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  rollNo: { type: String, trim: true, maxlength: 40, default: '' },
  employeeId: { type: String, trim: true, maxlength: 40, default: '' },
  role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' },
  team: { type: String, enum: ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'General'], default: 'General' },
  avatarColor: { type: String, default: '#d8f36a' },
  avatarUrl: { type: String, default: '' },
  avatarPublicId: { type: String, default: '' },
  myComments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
}, { timestamps: true });

userSchema.index({ rollNo: 1 }, { unique: true, partialFilterExpression: { rollNo: { $type: 'string', $gt: '' } } });
userSchema.index({ employeeId: 1 }, { unique: true, partialFilterExpression: { employeeId: { $type: 'string', $gt: '' } } });

export default mongoose.model('User', userSchema);
