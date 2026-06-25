const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';

async function parseUploadResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể tải học liệu lên.');
  }
  return data.data ?? {};
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

export async function uploadDocMaterial(file) {
  const formData = new FormData();
  formData.append('type', 'DOC');
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/materials/upload`, {
    method: 'POST',
    body: formData,
  });
  return parseUploadResponse(response);
}

export async function uploadAudioMaterial(file) {
  const formData = new FormData();
  formData.append('type', 'AUDIO');
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/materials/upload`, {
    method: 'POST',
    body: formData,
  });
  return parseUploadResponse(response);
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
