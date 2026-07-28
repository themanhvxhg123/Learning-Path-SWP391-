/**
 * Upload VIDEO / AUDIO thẳng từ trình duyệt lên Cloudinary (unsigned preset).
 *
 * Cần .env frontend:
 *   VITE_CLOUDINARY_CLOUD_NAME
 *   VITE_CLOUDINARY_UPLOAD_PRESET  (preset unsigned, cho phép video upload)
 *
 * Luồng:
 *   1. validate file (materialUploadValidation — max 10MB, đuôi hợp lệ)
 *   2. FormData: file + upload_preset
 *   3. POST https://api.cloudinary.com/v1_1/{cloud}/video/upload
 *      (Cloudinary gom cả audio vào endpoint video/upload)
 *   4. secure_url → getCloudinaryDeliveryUrl (q_auto) → trả { url, deliveryUrl, storageUrl }
 *
 * Không gửi API secret qua FE — chỉ preset public.
 */
import { getCloudinaryDeliveryUrl } from '@/shared/utils/cloudinaryDeliveryUtils';
import {
  LISTENING_UPLOAD_FAILED_MESSAGE,
  MATERIAL_UPLOAD_MAX_BYTES,
  MATERIAL_UPLOAD_MAX_SIZE_MESSAGE,
  getFileExtension,
  isAllowedListeningAudioExtension,
  validateVideoFile,
} from '@/shared/utils/materialUploadValidation';

function getCloudinaryConfig() {
  const cloudName = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '').trim();
  const uploadPreset = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '').trim();
  return { cloudName, uploadPreset };
}

function assertDirectUploadConfig() {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary chưa được cấu hình trên frontend.');
  }
  return { cloudName, uploadPreset };
}

function assertAudioFileForCloudinary(file) {
  if (!file) {
    throw new Error('Vui lòng chọn file .mp3 hoặc .mp4.');
  }
  const ext = getFileExtension(file.name);
  if (!isAllowedListeningAudioExtension(ext)) {
    throw new Error('Chỉ hỗ trợ file đuôi .mp3 hoặc .mp4.');
  }
  if (Number(file.size) > MATERIAL_UPLOAD_MAX_BYTES) {
    throw new Error(MATERIAL_UPLOAD_MAX_SIZE_MESSAGE);
  }
}

function postFormWithProgress(url, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress(percent);
    });

    xhr.addEventListener('load', () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      reject(new Error(data.error?.message || LISTENING_UPLOAD_FAILED_MESSAGE));
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Không thể kết nối Cloudinary. Kiểm tra mạng và thử lại.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error(LISTENING_UPLOAD_FAILED_MESSAGE));
    });

    xhr.send(formData);
  });
}

async function uploadMediaFileToCloudinary(file, { onProgress } = {}) {
  const { cloudName, uploadPreset } = assertDirectUploadConfig();

  onProgress?.(0);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const data = await postFormWithProgress(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`,
    formData,
    { onProgress },
  );

  onProgress?.(100);

  const storageUrl = String(data.secure_url ?? '').trim();
  if (!storageUrl) {
    throw new Error(LISTENING_UPLOAD_FAILED_MESSAGE);
  }

  const deliveryUrl = getCloudinaryDeliveryUrl(storageUrl);
  return {
    url: deliveryUrl,
    deliveryUrl,
    storageUrl,
    fileName: file.name,
    fileSize: data.bytes ?? file.size,
    format: data.format ?? getFileExtension(file.name),
  };
}

/**
 * Upload audio trực tiếp lên Cloudinary (unsigned preset).
 * Cần VITE_CLOUDINARY_CLOUD_NAME và VITE_CLOUDINARY_UPLOAD_PRESET.
 */
export async function uploadListeningAudioToCloudinary(file, { onProgress } = {}) {
  assertAudioFileForCloudinary(file);
  return uploadMediaFileToCloudinary(file, { onProgress });
}

/**
 * Upload video học liệu trực tiếp lên Cloudinary (≤10MB).
 */
export async function uploadVideoToCloudinary(file, { onProgress } = {}) {
  const validation = validateVideoFile(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  return uploadMediaFileToCloudinary(file, { onProgress });
}
