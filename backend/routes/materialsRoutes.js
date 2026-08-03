/**
 * =============================================================================
 * Routes học liệu — upload Cloudinary & đọc nội dung TEXT
 * =============================================================================
 *
 * Mount: app.use('/api/materials', materialsRoutes) trong server.js
 *
 * LUỒNG UPLOAD (mentor → lưu URL vào Node_Materials.MaterialUrl):
 *
 *   [A] Qua BACKEND (API key bí mật trên server)
 *       FE materialUploadService → POST /api/materials/upload
 *         • JSON body: type=TEXT (html, title)
 *         • multipart: type=DOC | READING_DOC | AUDIO + field "file"
 *       → materialUploadMiddleware (multer RAM, max 10MB) nếu multipart
 *       → materialUploadController.uploadMaterial
 *       → cloudinaryService (uploadBuffer → Cloudinary)
 *
 *   [B] Trực tiếp từ BROWSER (unsigned upload preset)
 *       FE cloudinaryDirectUpload → POST https://api.cloudinary.com/.../video/upload
 *       Dùng cho VIDEO học liệu + AUDIO Listening (uploadAudioMaterial / uploadVideoMaterial).
 *       Trả secure_url → getCloudinaryDeliveryUrl (q_auto) → gán MaterialUrl trên UI.
 *
 * LUỒNG ĐỌC TEXT (editor không giữ HTML trong state lâu dài):
 *   GET /api/materials/text-content?url=<cloudinary raw html url>
 *   → proxy fetch HTML từ Cloudinary (chỉ hostname *.cloudinary.com)
 *
 * Tải file đính kèm (DOC): GET /api/mentor/materials/download (mentorRoutes, không file này).
 */
const express = require('express');

const router = express.Router();

const { uploadMaterial, fetchTextMaterialContent } = require('../controllers/materialUploadController');
const { materialUploadMiddleware } = require('../middlewares/materialUploadMiddleware');
const { MATERIAL_MAX_SIZE_MESSAGE } = require('../services/cloudinaryService');

router.get('/text-content', fetchTextMaterialContent);

router.post('/upload', (req, res, next) => {
  const contentType = String(req.headers['content-type'] ?? '');

  // TEXT gửi application/json — không qua multer, vào thẳng controller.
  if (!contentType.includes('multipart/form-data')) {
    return uploadMaterial(req, res);
  }

  // DOC / READING_DOC / AUDIO: parse multipart, gắn req.file (buffer trong RAM).
  materialUploadMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: MATERIAL_MAX_SIZE_MESSAGE,
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'Không thể tải file lên.',
      });
    }
    return uploadMaterial(req, res);
  });
});

module.exports = router;
