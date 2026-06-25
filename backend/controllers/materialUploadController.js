const { uploadAudioFile, uploadDocumentFile, uploadTextHtml } = require('../services/cloudinaryService');

function mapUploadErrorMessage(error) {
  if (error?.statusCode === 400) return error.message;

  const message = String(error?.message ?? '');
  if (message.includes('File size too large')) {
    return 'File quá lớn. Dung lượng tối đa là 10 MB.';
  }

  return 'Lỗi khi tải học liệu lên.';
}

async function uploadMaterial(req, res) {  try {
    const type = String(req.body?.type ?? '').trim().toUpperCase();

    if (type === 'DOC') {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không nhận được file tài liệu.',
        });
      }

      const data = await uploadDocumentFile(req.file);
      return res.status(200).json({
        success: true,
        message: 'Tải tài liệu lên thành công.',
        data: { ...data, materialType: 'DOC' },
      });
    }

    if (type === 'AUDIO') {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Không nhận được file audio.' });
      }
      const data = await uploadAudioFile(req.file);
      return res.json({ success: true, data: { ...data, materialType: 'AUDIO' } });
    }

    if (type === 'TEXT') {
      const html = req.body?.html ?? req.body?.content;
      const title = req.body?.title;

      const data = await uploadTextHtml(html, title);
      return res.status(200).json({
        success: true,
        message: 'Tải nội dung văn bản lên thành công.',
        data: { ...data, materialType: 'TEXT' },
      });
    }

    return res.status(400).json({
      success: false,
      message: 'type phải là TEXT, DOC hoặc AUDIO.',
    });
  } catch (error) {
    console.error('[uploadMaterial]', error.message);
    const statusCode = error.statusCode === 400 ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: mapUploadErrorMessage(error),
    });
  }
}
function isAllowedTextMaterialUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl ?? '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return parsed.hostname.endsWith('cloudinary.com');
  } catch {
    return false;
  }
}

async function fetchTextMaterialContent(req, res) {
  try {
    const rawUrl = String(req.query?.url ?? '').trim();
    if (!rawUrl) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu url.',
      });
    }

    if (!isAllowedTextMaterialUrl(rawUrl)) {
      return res.status(400).json({
        success: false,
        message: 'URL nội dung văn bản không hợp lệ.',
      });
    }

    const response = await fetch(rawUrl);
    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: 'Không thể tải nội dung văn bản từ Cloudinary.',
      });
    }

    const html = await response.text();
    return res.status(200).json({
      success: true,
      message: 'Lấy nội dung văn bản thành công.',
      data: { html },
    });
  } catch (error) {
    console.error('[fetchTextMaterialContent]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy nội dung văn bản.',
    });
  }
}

module.exports = {
  uploadMaterial,
  fetchTextMaterialContent,
};
