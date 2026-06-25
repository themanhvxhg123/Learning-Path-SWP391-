const multer = require('multer');
const { AUDIO_EXTENSIONS, DOC_EXTENSIONS, MATERIAL_MAX_BYTES } = require('../services/cloudinaryService');

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
