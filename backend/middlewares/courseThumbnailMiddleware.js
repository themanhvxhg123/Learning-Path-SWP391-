const fs = require('fs');
const path = require('path');

const MAX_THUMBNAIL_FILE_SIZE = 5 * 1024 * 1024;
const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i;

function createThumbnailError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseThumbnailDataUrl(dataUrl) {
  const match = String(dataUrl).trim().match(DATA_URL_PATTERN);
  if (!match) return null;

  const rawExt = match[1].toLowerCase();
  return {
    ext: rawExt === 'jpeg' ? 'jpg' : rawExt,
    base64Data: match[2],
  };
}

/** Validate data URL thumbnail; skip nếu đã là path trên server. */
function validateCourseThumbnailDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }

  const trimmed = dataUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/assets/')) {
    return { existingPath: trimmed };
  }

  const parsed = parseThumbnailDataUrl(trimmed);
  if (!parsed) {
    throw createThumbnailError('Thumbnail không đúng định dạng ảnh base64.');
  }

  const buffer = Buffer.from(parsed.base64Data, 'base64');

  if (buffer.length > MAX_THUMBNAIL_FILE_SIZE) {
    throw createThumbnailError('Ảnh đại diện không được vượt quá 5MB.');
  }

  return { buffer, ext: parsed.ext };
}

function deleteOldCourseAvatars(uploadDir, courseId) {
  if (!fs.existsSync(uploadDir)) return;
  const prefix = `course_avt_${courseId}`;
  for (const file of fs.readdirSync(uploadDir)) {
    if (file === prefix || file.startsWith(`${prefix}.`) || file.startsWith(`${prefix}_`)) {
      fs.unlinkSync(path.join(uploadDir, file));
    }
  }
}

const saveCourseThumbnailFromDataUrl = (dataUrl, courseId, options = {}) => {
  const { replaceExisting = false } = options;
  const validated = validateCourseThumbnailDataUrl(dataUrl);
  if (!validated) return null;
  if (validated.existingPath && !replaceExisting) {
    return validated.existingPath;
  }

  const { buffer, ext } = validated;
  const uploadDir = path.join(__dirname, '../public/assets/avatars/courses');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  if (replaceExisting) {
    deleteOldCourseAvatars(uploadDir, courseId);
  }

  const fileName = replaceExisting
    ? `course_avt_${courseId}_${Date.now()}.${ext}`
    : `course_avt_${courseId}.${ext}`;

  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);

  return `/assets/avatars/courses/${fileName}`;
};

module.exports = {
  MAX_THUMBNAIL_FILE_SIZE,
  validateCourseThumbnailDataUrl,
  saveCourseThumbnailFromDataUrl,
};
