import { v2 as cloudinary } from 'cloudinary';

export function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export function uploadIssueImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'campusfix/issues', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result?.public_id) return reject(new Error('Cloudinary did not return an image URL.'));
        resolve({ imageUrl: result.secure_url, imagePublicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export default cloudinary;
