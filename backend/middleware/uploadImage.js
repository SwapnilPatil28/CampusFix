import multer from 'multer';

const storage = multer.memoryStorage();
const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  const error = new Error('Choose an image file.');
  error.statusCode = 400;
  cb(error, false);
};

export const uploadImage = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
