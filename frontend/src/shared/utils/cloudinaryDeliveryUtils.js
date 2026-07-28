export {
  MATERIAL_UPLOAD_MAX_BYTES,
  MATERIAL_UPLOAD_MAX_SIZE_MESSAGE,
  READING_DOC_EXTENSION_NAMES,
  READING_DOC_EXTENSIONS,
  READING_DOC_FILE_ACCEPT,
  READING_DOC_INVALID_TYPE_MESSAGE,
  AUDIO_EXTENSION_NAMES,
  LISTENING_AUDIO_FILE_ACCEPT,
  LISTENING_AUDIO_INVALID_TYPE_MESSAGE,
  LISTENING_LINK_INVALID_MESSAGE,
  getFileExtension,
  isAllowedReadingDocExtension,
  isAllowedListeningAudioExtension,
  isAllowedReadingDocFile,
  isAllowedListeningAudioFile,
  validateReadingDocFile,
  validateListeningAudioFile,
  validateListeningAudioUrl,
  isSimpleHttpUrl,
  getMaterialMaxFileSizeLabel,
} from '@/shared/utils/materialUploadValidation';

/** Đồng bộ với backend buildDeliveryUrl — chèn q_auto cho video/image (bỏ qua /raw/upload/). */
export function getCloudinaryDeliveryUrl(secureUrl, transformation = 'q_auto') {
  const url = String(secureUrl ?? '').trim();
  if (!url.includes('cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  if (url.includes(`/upload/${transformation}/`) || /\/upload\/q_auto/.test(url)) {
    return url;
  }
  if (url.includes('/raw/upload/')) {
    return url;
  }
  return url.replace('/upload/', `/upload/${transformation}/`);
}
