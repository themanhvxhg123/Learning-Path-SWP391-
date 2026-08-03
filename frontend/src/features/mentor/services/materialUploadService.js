/**
 * =============================================================================
 * Facade upload / hydrate học liệu (mentor UI → API hoặc Cloudinary)
 * =============================================================================
 *
 * | Loại        | Hàm export              | Đường đi |
 * |-------------|-------------------------|----------|
 * | TEXT        | uploadTextMaterial      | POST /api/materials/upload JSON type=TEXT |
 * | DOC         | uploadDocMaterial       | POST multipart qua XHR (progress) |
 * | READING_DOC | uploadReadingDocMaterial| POST multipart (QB reading file) |
 * | AUDIO       | uploadAudioMaterial     | cloudinaryDirectUpload (browser → Cloudinary) |
 * | VIDEO       | uploadVideoMaterial     | cloudinaryDirectUpload |
 *
 * Sau upload: component gán MaterialUrl, FileName, FileSize; xóa File local.
 *
 * fetchTextMaterialHtml: GET /api/materials/text-content?url= — hydrate editor TEXT.
 * getMentorMaterialDownloadHref: link GET /api/mentor/materials/download (backend fetch buffer).
 *
 * Orchestration trước lưu khóa: mentorMaterialUploadUtils.uploadPendingMaterialsInPaths.
 */
import { uploadListeningAudioToCloudinary, uploadVideoToCloudinary } from '@/shared/services/cloudinaryDirectUpload';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';

async function parseUploadResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể tải học liệu lên.');
  }
  return data.data ?? {};
}

/** Multipart lên backend — dùng XHR để báo % upload (DOC). */
function postMultipartUpload(path, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}${path}`);

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });

    xhr.addEventListener('load', () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.success) {
        resolve(data.data ?? {});
        return;
      }

      reject(new Error(data.message || 'Không thể tải học liệu lên.'));
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Đã hủy tải lên.'));
    });

    xhr.send(formData);
  });
}

export async function uploadTextMaterial({ html, title }) {
  const response = await fetch(`${API_BASE}/materials/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'TEXT',
      html,
      title: title || 'text-material',
    }),
  });
  return parseUploadResponse(response);
}

export async function uploadReadingDocMaterial(file) {
  const formData = new FormData();
  formData.append('type', 'READING_DOC');
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/materials/upload`, {
    method: 'POST',
    body: formData,
  });
  return parseUploadResponse(response);
}

export async function uploadDocMaterial(file, { onProgress } = {}) {
  const formData = new FormData();
  formData.append('type', 'DOC');
  formData.append('file', file);

  onProgress?.(0);
  const result = await postMultipartUpload('/materials/upload', formData, { onProgress });
  onProgress?.(100);
  return result;
}

export async function uploadAudioMaterial(file, { onProgress } = {}) {
  return uploadListeningAudioToCloudinary(file, { onProgress });
}

export async function uploadVideoMaterial(file, { onProgress } = {}) {
  return uploadVideoToCloudinary(file, { onProgress });
}

export function getMentorMaterialDownloadHref({ url, fileName = 'tai-lieu' }) {
  const params = new URLSearchParams({
    url: String(url ?? '').trim(),
    fileName: String(fileName ?? '').trim() || 'tai-lieu',
  });
  return `${API_BASE}/mentor/materials/download?${params}`;
}

export async function fetchTextMaterialHtml(materialUrl) {
  const url = String(materialUrl ?? '').trim();
  if (!url) return '';

  const response = await fetch(
    `${API_BASE}/materials/text-content?url=${encodeURIComponent(url)}`,
  );
  const data = await parseUploadResponse(response);
  return String(data.html ?? '').trim();
}
