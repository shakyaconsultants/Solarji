const multer = require('multer');
const sharp = require('sharp');
const streamifier = require('streamifier');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Hold images in memory so we can pipe them through sharp before sending to Cloudinary.
// Limits keep abusive uploads out of RAM; sharp compression brings real payloads down.
const MAX_FILE_SIZE_MB = Number(process.env.UPLOAD_MAX_FILE_MB || 10);
const MAX_FILES_PER_REQUEST = Number(process.env.UPLOAD_MAX_FILES || 6);
const MAX_DIMENSION = Number(process.env.UPLOAD_MAX_DIMENSION || 1600);
const COMPRESSION_QUALITY = Number(process.env.UPLOAD_COMPRESSION_QUALITY || 75);

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: MAX_FILES_PER_REQUEST,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// Compresses with sharp (resize-to-fit + WebP), then streams to Cloudinary.
async function compressAndUpload(file, { folder = 'solarji/leads' } = {}) {
  const compressed = await sharp(file.buffer, { failOn: 'none' })
    .rotate() // honor EXIF orientation
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: COMPRESSION_QUALITY, effort: 4 })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp',
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          originalBytes: file.size,
        });
      },
    );
    streamifier.createReadStream(compressed).pipe(stream);
  });
}

async function uploadMany(files, opts) {
  if (!files || files.length === 0) return [];
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not configured on the server');
  }
  return Promise.all(files.map((f) => compressAndUpload(f, opts)));
}

async function destroyMany(publicIds = []) {
  if (!publicIds.length || !isCloudinaryConfigured()) return;
  await Promise.all(
    publicIds.map((id) =>
      cloudinary.uploader.destroy(id).catch(() => null),
    ),
  );
}

module.exports = {
  upload,
  uploadMany,
  destroyMany,
  compressAndUpload,
};
