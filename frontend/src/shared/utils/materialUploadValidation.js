/** Giới hạn & validate file trước upload (FE) — khớp backend MATERIAL_MAX_BYTES 10MB. */
export const MATERIAL_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const MATERIAL_UPLOAD_MAX_SIZE_MESSAGE = 'Chỉ chấp nhận tối đa 10MB';

export const READING_DOC_EXTENSION_NAMES = ['pdf', 'doc', 'docx'];

export const READING_DOC_EXTENSIONS = ['.pdf', '.doc', '.docx'];

export const READING_DOC_FILE_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const READING_DOC_INVALID_TYPE_MESSAGE = 'Chỉ chấp nhận PDF, DOC, DOCX.';

export const AUDIO_EXTENSION_NAMES = ['mp3', 'mp4'];

export const VIDEO_EXTENSION_NAMES = ['mp4', 'webm', 'mov'];

export const VIDEO_FILE_ACCEPT =
  'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';

export const VIDEO_INVALID_TYPE_MESSAGE =
  'Chỉ hỗ trợ file video .mp4, .webm hoặc .mov.';

export const LISTENING_AUDIO_FILE_ACCEPT =
  'audio/mpeg,audio/mp3,audio/mp4,video/mp4,.mp3,.mp4';

export const LISTENING_AUDIO_INVALID_TYPE_MESSAGE =
  'Chỉ hỗ trợ file đuôi .mp3 hoặc .mp4.';

export const LISTENING_LINK_INVALID_MESSAGE =
  'Vui lòng nhập link audio hoặc video nghe hợp lệ.';

export const LISTENING_UPLOAD_FAILED_MESSAGE =
  'Lỗi trong quá trình tải file, hãy thử lại';

/** Lấy đuôi file — ưu tiên docx trước doc. Hỗ trợ URL (bỏ query/hash). */
export function getFileExtension(fileName = '') {
  let lower = String(fileName ?? '').trim().toLowerCase();
  if (!lower) return null;

  try {
    if (/^https?:\/\//i.test(lower)) {
      lower = decodeURIComponent(new URL(lower).pathname);
    } else {
      lower = lower.split(/[?#]/)[0];
    }
  } catch {
    lower = lower.split(/[?#]/)[0];
  }

  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.doc')) return 'doc';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.mp4')) return 'mp4';
  if (lower.endsWith('.mp3')) return 'mp3';
  if (lower.endsWith('.webm')) return 'webm';
  if (lower.endsWith('.mov')) return 'mov';
  if (lower.endsWith('.pptx')) return 'pptx';
  if (lower.endsWith('.ppt')) return 'ppt';
  const match = lower.match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

export function isAllowedReadingDocExtension(ext) {
  return READING_DOC_EXTENSION_NAMES.includes(String(ext ?? '').trim().toLowerCase());
}

export function isAllowedListeningAudioExtension(ext) {
  return AUDIO_EXTENSION_NAMES.includes(String(ext ?? '').trim().toLowerCase());
}

export function isAllowedVideoExtension(ext) {
  return VIDEO_EXTENSION_NAMES.includes(String(ext ?? '').trim().toLowerCase());
}

export function isAllowedReadingDocFile(file) {
  if (!file?.name) return false;
  return isAllowedReadingDocExtension(getFileExtension(file.name));
}

export function isAllowedListeningAudioFile(file) {
  if (!file?.name) return false;
  if (isAllowedListeningAudioExtension(getFileExtension(file.name))) return true;
  const mime = String(file.type ?? '').toLowerCase();
  return (
    mime === 'audio/mpeg'
    || mime === 'audio/mp3'
    || mime === 'audio/mp4'
    || mime === 'video/mp4'
  );
}

export function isAllowedVideoFile(file) {
  if (!file?.name) return false;
  if (isAllowedVideoExtension(getFileExtension(file.name))) return true;
  const mime = String(file.type ?? '').toLowerCase();
  return (
    mime === 'video/mp4'
    || mime === 'video/webm'
    || mime === 'video/quicktime'
  );
}

export function validateReadingDocFile(file) {
  if (!file) {
    return { ok: false, message: 'Vui lòng chọn file bài đọc.' };
  }
  if (!isAllowedReadingDocFile(file)) {
    return { ok: false, message: READING_DOC_INVALID_TYPE_MESSAGE };
  }
  if (Number(file.size) > MATERIAL_UPLOAD_MAX_BYTES) {
    return { ok: false, message: MATERIAL_UPLOAD_MAX_SIZE_MESSAGE };
  }
  return { ok: true };
}

export function validateListeningAudioFile(file) {
  if (!file) {
    return { ok: false, message: 'Vui lòng chọn file .mp3 hoặc .mp4.' };
  }
  if (!isAllowedListeningAudioFile(file)) {
    return { ok: false, message: LISTENING_AUDIO_INVALID_TYPE_MESSAGE };
  }
  if (Number(file.size) > MATERIAL_UPLOAD_MAX_BYTES) {
    return { ok: false, message: MATERIAL_UPLOAD_MAX_SIZE_MESSAGE };
  }
  return { ok: true };
}

export function validateVideoFile(file) {
  if (!file) {
    return { ok: false, message: 'Vui lòng chọn file video.' };
  }
  if (!isAllowedVideoFile(file)) {
    return { ok: false, message: VIDEO_INVALID_TYPE_MESSAGE };
  }
  if (Number(file.size) > MATERIAL_UPLOAD_MAX_BYTES) {
    return { ok: false, message: MATERIAL_UPLOAD_MAX_SIZE_MESSAGE };
  }
  return { ok: true };
}

export function isSimpleHttpUrl(value) {
  const trimmed = String(value ?? '').trim();
  return /^https?:\/\/.+/i.test(trimmed);
}

/** Link nghe: http(s) hoặc có đuôi mp3/mp4. */
export function validateListeningAudioUrl(rawUrl) {
  const url = String(rawUrl ?? '').trim();
  if (!url) {
    return { ok: false, message: 'Vui lòng nhập link audio hoặc video nghe.' };
  }
  if (!isSimpleHttpUrl(url)) {
    return { ok: false, message: LISTENING_LINK_INVALID_MESSAGE };
  }
  const ext = getFileExtension(url);
  if (ext && !isAllowedListeningAudioExtension(ext)) {
    return { ok: false, message: LISTENING_AUDIO_INVALID_TYPE_MESSAGE };
  }
  return { ok: true };
}

export function getMaterialMaxFileSizeLabel() {
  return '10MB';
}
