/**
 * Multer cho POST /api/materials/upload (multipart).
 *
 * • storage: memoryStorage — file nằm trong req.file.buffer (không ghi đĩa server).
 * • limits.fileSize: MATERIAL_MAX_BYTES (10MB, khớp Cloudinary free tier).
 * • fileFilter: chỉ đuôi trong DOC_EXTENSIONS hoặc AUDIO_EXTENSIONS (pdf/doc/docx/mp3/mp4).
 *   READING_DOC dùng cùng đuôi DOC; phân loại thật sự do req.body.type trong controller.
 *
 * Export: materialUploadMiddleware = multer.single('file') — FE phải append field tên "file".
 */
const multer = require('multer');
const {
  AUDIO_EXTENSIONS,
  DOC_EXTENSIONS,
  MATERIAL_MAX_BYTES,
  MATERIAL_MAX_SIZE_MESSAGE,
} = require('../services/cloudinaryService');

const materialUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MATERIAL_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = String(file.originalname ?? '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    const ok = (ext && DOC_EXTENSIONS.has(ext)) || (ext && AUDIO_EXTENSIONS.has(ext));
    if (!ok) cb(new Error('File không được hỗ trợ.'));
    else cb(null, true);
  },
});

module.exports = {
  materialUploadMiddleware: materialUpload.single('file'),
  MATERIAL_MAX_BYTES,
};
