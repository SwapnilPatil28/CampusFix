import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' },
  team: { type: String, enum: ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'General'], default: 'General' },
  avatarColor: { type: String, default: '#d8f36a' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
