import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import issueRoutes from './routes/issue.routes.js';
import issueCommentRoutes from './routes/comment.routes.js';
import { errorHandler, notFound } from './middleware/errors.js';

const app = express();
const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && req.headers.origin && req.headers.origin !== frontendOrigin) {
    return res.status(403).json({ message: 'Requests from this website are not allowed.' });
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'CampusFix API' }));
app.use('/api/auth', authRoutes);
app.use('/api/issues/:id/comments', issueCommentRoutes);
app.use('/api/issues', issueRoutes);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
if (!process.env.MONGODB_URL || !process.env.JWT_SECRET) {
  console.error('Set MONGODB_URL and JWT_SECRET in backend/.env');
  process.exit(1);
}
mongoose.connect(process.env.MONGODB_URL)
  .then(() => app.listen(port, () => console.log(`CampusFix API listening on ${port}`)))
  .catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
