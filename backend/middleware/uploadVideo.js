import multer from 'multer';

const storage = multer.memoryStorage();
const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('video/')) return cb(null, true);
  const error = new Error('Choose a video file.');
  error.statusCode = 400;
  cb(error, false);
};

export const uploadVideo = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
