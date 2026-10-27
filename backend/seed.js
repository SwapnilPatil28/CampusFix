import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Issue from './models/Issue.js';

if (!process.env.MONGODB_URL) throw new Error('Set MONGODB_URL in backend/.env');
await mongoose.connect(process.env.MONGODB_URL);
const password = await bcrypt.hash('CampusFix2026!', 12);
const people = await User.create([
  { name: 'Aarav Mehta', email: 'student@campusfix.demo', password, role: 'student', team: 'General' },
  { name: 'Maya Operations', email: 'facilities@campusfix.demo', password, role: 'staff', team: 'Facilities' },
  { name: 'IT Helpdesk', email: 'it@campusfix.demo', password, role: 'staff', team: 'IT' },
  { name: 'Campus Admin', email: 'admin@campusfix.demo', password, role: 'admin', team: 'General' }
]);
const communityStudents = await User.insertMany(Array.from({ length: 60 }, (_, index) => ({ name: `Campus Student ${index + 1}`, email: `student${index + 1}@campusfix.demo`, password, role: 'student', team: 'General' })));
const [student, facilities, it] = people;
const entries = [
  { title: 'Water fountain on the 2nd floor is leaking', description: 'There is a steady leak around the fountain outside the south stairwell. The floor is getting slippery, especially during class changes. I put a paper towel down for now.', category: 'Facilities', location: 'Library · 2nd floor', team: 'Facilities', status: 'Acknowledged', author: student, voters: 18, notVoters: 2 },
  { title: 'Wi-Fi drops in the east lecture hall', description: 'The campus Wi-Fi disconnects every few minutes in this room. It has been happening during lectures all week and affects access to course materials.', category: 'IT', location: 'Engineering · Hall E204', team: 'IT', status: 'In progress', author: student, voters: 31, notVoters: 1 },
  { title: 'Broken light near the north parking path', description: 'The lamp by the north lot entrance has been out since Monday. The path is very dark after evening classes.', category: 'Security', location: 'North parking · Main path', team: 'Security', status: 'Open', author: student, voters: 24, notVoters: 0 },
  { title: 'More vegetarian options at lunch', description: 'The dining hall runs out of vegetarian entrees before the later lunch period. Could the kitchen prepare a few more servings?', category: 'Dining', location: 'Main dining hall', team: 'Dining', status: 'Open', author: student, voters: 13, notVoters: 4 },
  { title: 'Projector remote missing in Room 3B', description: 'The projector works, but there is no remote in the room to change input sources or adjust settings. The podium drawer is empty.', category: 'IT', location: 'Science block · Room 3B', team: 'IT', status: 'Resolved', author: student, voters: 8, notVoters: 0 }
];
for (const entry of entries) {
  const { voters, notVoters, ...data } = entry;
  const issue = await Issue.create({ ...data, followers: [student._id], votes: [
    { user: student._id, response: 'affected' },
    ...communityStudents.slice(0, Math.max(voters - 1, 0)).map(person => ({ user: person._id, response: 'affected' })),
    ...communityStudents.slice(45, 45 + notVoters).map(person => ({ user: person._id, response: 'not-affected' }))
  ], comments: [{ author: student._id, body: 'Thanks for flagging this. I have noticed it too.', createdAt: new Date(Date.now() - 60 * 60 * 1000) }], updates: [{ author: data.status === 'Open' ? student._id : data.team === 'IT' ? it._id : facilities._id, status: 'Open', note: 'Issue reported' }, ...(data.status !== 'Open' ? [{ author: data.team === 'IT' ? it._id : facilities._id, status: data.status, note: data.status === 'Resolved' ? 'The team has fixed this issue.' : 'The team is looking into it.' }] : [])] });
  if (data.status === 'Resolved') { issue.resolvedAt = new Date(); await issue.save(); }
}
console.log('Demo data added. Sign in with student@campusfix.demo, facilities@campusfix.demo, it@campusfix.demo, or admin@campusfix.demo. Password: CampusFix2026!');
await mongoose.disconnect();
