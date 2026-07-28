/**
 * =============================================================================
 * Cloudinary — upload / delivery URL / tải buffer (backend)
 * =============================================================================
 *
 * Thư mục Cloudinary:
 *   learning-path/materials          — DOC, PDF (image/raw)
 *   learning-path/materials/text     — HTML học liệu TEXT (raw)
 *   learning-path/materials/audio    — AUDIO upload qua server (resource_type video)
 *   learning-path/news               — thumbnail tin tức (image)
 *
 * Hàm upload theo loại học liệu:
 *   uploadTextHtml        → raw .html (UTF-8 buffer)
 *   uploadDocumentFile    → DOC khóa: PDF as image/pdf; doc/docx as raw
 *   uploadReadingDocumentFile → bài đọc QB: PDF + q_auto delivery; doc raw
 *   uploadAudioFile       → video upload + buildDeliveryUrl (mp3/mp4)
 *
 * Sau upload: DB/UI lưu url hoặc deliveryUrl trong MaterialUrl.
 *
 * Đọc / tải xuống:
 *   buildDeliveryUrl — chèn /upload/q_auto/ (trừ raw)
 *   fetchCloudinaryAssetBuffer — thử URL gốc, signed, private (download mentor)
 *   deleteCloudinaryAssetByUrl — destroy theo public_id parse từ URL
 */
const cloudinary = require('../config/cloudinary');

const MATERIALS_FOLDER = 'learning-path/materials';
const NEWS_FOLDER = 'learning-path/news';
const TEXT_FOLDER = `${MATERIALS_FOLDER}/text`;
const AUDIO_FOLDER = `${MATERIALS_FOLDER}/audio`;
const AUDIO_EXTENSIONS = new Set(['mp3', 'mp4']);

/** Giới hạn Cloudinary free tier — 10 MB. */
const MATERIAL_MAX_BYTES = 10 * 1024 * 1024;
const NEWS_THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;
const NEWS_THUMBNAIL_MAX_SIZE_MESSAGE = 'Ảnh đại diện không được vượt quá 5MB.';

const DOC_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const READING_DOC_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);

/** MIME hợp lệ theo đuôi file — cho phép octet-stream / rỗng (Windows thường gửi vậy). */
const EXTENSION_MIME_ALLOWLIST = {
  pdf: ['application/pdf'],
  doc: ['application/msword', 'application/vnd.ms-word'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
  ],
  mp3: ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'audio/x-mpeg-3'],
  mp4: ['video/mp4', 'audio/mp4', 'application/mp4'],
};

const MATERIAL_MAX_SIZE_MESSAGE = 'Chỉ chấp nhận tối đa 10MB';

/** Gửi buffer lên Cloudinary qua upload_stream (dùng chung mọi loại file). */
function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(buffer);
  });
}

function sanitizeFileName(name) {
  return String(name ?? 'document')
    .replace(/[^\w.\-()]+/g, '_')
    .slice(0, 120);
}

function getExtensionFromFileName(fileName) {
  const lower = String(fileName ?? '').trim().toLowerCase();
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.doc')) return 'doc';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.mp4')) return 'mp4';
  if (lower.endsWith('.mp3')) return 'mp3';
  if (lower.endsWith('.pptx')) return 'pptx';
  if (lower.endsWith('.ppt')) return 'ppt';
  const match = lower.match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

/** Chèn delivery transformation (q_auto) vào URL Cloudinary. */
function buildDeliveryUrl(secureUrl, transformation = 'q_auto') {
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

function assertMaterialSize(byteSize) {
  const size = Number(byteSize ?? 0);
  if (size > MATERIAL_MAX_BYTES) {
    const error = new Error(MATERIAL_MAX_SIZE_MESSAGE);
    error.statusCode = 400;
    throw error;
  }
}

function assertMimeMatchesExtension(file, ext) {
  const mime = String(file.mimetype ?? '').trim().toLowerCase();
  if (!mime || mime === 'application/octet-stream') return;

  const allowed = EXTENSION_MIME_ALLOWLIST[ext];
  if (!allowed || allowed.includes(mime)) return;

  const error = new Error('Định dạng file không hợp lệ.');
  error.statusCode = 400;
  throw error;
}

function assertAllowedDoc(file) {
  assertMaterialSize(file.size);

  const ext = getExtensionFromFileName(file.originalname);
  if (!ext || !DOC_EXTENSIONS.has(ext)) {
    const error = new Error('Chỉ chấp nhận PDF, DOC, DOCX.');
    error.statusCode = 400;
    throw error;
  }

  assertMimeMatchesExtension(file, ext);
}

function assertAllowedReadingDoc(file) {
  assertMaterialSize(file.size);

  const ext = getExtensionFromFileName(file.originalname);
  if (!ext || !READING_DOC_EXTENSIONS.has(ext)) {
    const error = new Error('Chỉ chấp nhận PDF, DOC, DOCX.');
    error.statusCode = 400;
    throw error;
  }

  assertMimeMatchesExtension(file, ext);
}

/** DOC học liệu khóa (MaterialType DOC): PDF preview được trong trình duyệt. */
async function uploadDocumentFile(file) {
  assertAllowedDoc(file);

  const ext = getExtensionFromFileName(file.originalname);
  const safeName = sanitizeFileName(file.originalname).replace(/\.[^.]+$/, '');
  const publicId = `${safeName}_${Date.now()}`;

  // PDF: upload dạng image/pdf để trình duyệt xem được (raw thường gây "Failed to load PDF").
  if (ext === 'pdf') {
    const result = await uploadBuffer(file.buffer, {
      resource_type: 'image',
      folder: MATERIALS_FOLDER,
      public_id: publicId,
      format: 'pdf',
    });

    const storageUrl = result.secure_url;
    return {
      url: storageUrl,
      deliveryUrl: storageUrl,
      publicId: result.public_id,
      fileName: file.originalname,
      fileSize: result.bytes ?? file.size,
      format: result.format ?? 'pdf',
    };
  }

  const result = await uploadBuffer(file.buffer, {
    resource_type: 'raw',
    folder: MATERIALS_FOLDER,
    public_id: publicId,
    format: ext,
  });

  return {
    url: result.secure_url,
    deliveryUrl: result.secure_url,
    publicId: result.public_id,
    fileName: file.originalname,
    fileSize: file.size,
    format: result.format ?? ext,
  };
}

/** READING_DOC (ngân hàng câu / bài đọc): PDF có q_auto; Word/PDF raw tương tự DOC. */
async function uploadReadingDocumentFile(file) {
  assertAllowedReadingDoc(file);

  const ext = getExtensionFromFileName(file.originalname);
  const safeName = sanitizeFileName(file.originalname).replace(/\.[^.]+$/, '');
  const publicId = `${safeName}_${Date.now()}`;

  if (ext === 'pdf') {
    const result = await uploadBuffer(file.buffer, {
      resource_type: 'image',
      folder: MATERIALS_FOLDER,
      public_id: publicId,
      format: 'pdf',
      transformation: [{ quality: 'auto' }],
      async: true,
    });

    const storageUrl = result.secure_url;
    return {
      url: buildDeliveryUrl(storageUrl),
      deliveryUrl: buildDeliveryUrl(storageUrl),
      storageUrl,
      publicId: result.public_id,
      fileName: file.originalname,
      fileSize: result.bytes ?? file.size,
      format: result.format ?? 'pdf',
    };
  }

  const result = await uploadBuffer(file.buffer, {
    resource_type: 'raw',
    folder: MATERIALS_FOLDER,
    public_id: publicId,
    format: ext,
  });

  const storageUrl = result.secure_url;
  return {
    url: storageUrl,
    deliveryUrl: storageUrl,
    storageUrl,
    publicId: result.public_id,
    fileName: file.originalname,
    fileSize: file.size,
    format: result.format ?? ext,
  };
}

/** AUDIO qua server (ít dùng hơn direct upload FE); folder audio, resource_type video. */
async function uploadAudioFile(file) {
  assertMaterialSize(file.size);
  const ext = getExtensionFromFileName(file.originalname);
  if (!ext || !AUDIO_EXTENSIONS.has(ext)) {
    const error = new Error('Chỉ hỗ trợ file đuôi .mp3 hoặc .mp4.');
    error.statusCode = 400;
    throw error;
  }

  const safeName = sanitizeFileName(file.originalname).replace(/\.[^.]+$/, '');
  const result = await uploadBuffer(file.buffer, {
    resource_type: 'video',
    folder: AUDIO_FOLDER,
    public_id: `${safeName}_${Date.now()}`,
    transformation: [{ quality: 'auto' }],
  });

  const storageUrl = result.secure_url;
  return {
    url: buildDeliveryUrl(storageUrl),
    deliveryUrl: buildDeliveryUrl(storageUrl),
    storageUrl,
    fileName: file.originalname,
    fileSize: result.bytes ?? file.size,
    format: result.format ?? ext,
  };
}

async function deleteCloudinaryAssetByUrl(url) {
  if (!isCloudinaryDeliveryUrl(url)) return;
  try {
    const { publicId, resourceType } = extractPublicIdFromUrl(url);
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (err) {
    console.warn('[Cloudinary delete]', err.message);
  }
}

async function uploadNewsThumbnailBuffer(buffer, { newsId, ext }) {
  const size = Number(buffer?.length ?? 0);
  if (size <= 0) {
    const error = new Error('Dữ liệu ảnh thumbnail không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }
  if (size > NEWS_THUMBNAIL_MAX_BYTES) {
    const error = new Error(NEWS_THUMBNAIL_MAX_SIZE_MESSAGE);
    error.statusCode = 400;
    throw error;
  }

  const format = ext === 'jpeg' ? 'jpg' : ext;
  const publicId = `news_thumb_${newsId}_${Date.now()}`;

  const result = await uploadBuffer(buffer, {
    resource_type: 'image',
    folder: NEWS_FOLDER,
    public_id: publicId,
    format,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });

  return buildDeliveryUrl(result.secure_url);
}

/** HTML từ rich text editor — lưu raw trên Cloudinary, URL gán MaterialUrl (Content có thể rỗng khi lưu DB). */
async function uploadTextHtml(html, title = 'text-material') {
  const trimmed = String(html ?? '').trim();
  if (!trimmed) {
    const error = new Error('Nội dung văn bản trống.');
    error.statusCode = 400;
    throw error;
  }

  const buffer = Buffer.from(trimmed, 'utf8');
  assertMaterialSize(buffer.byteLength);
  const safeName = sanitizeFileName(title).replace(/\.[^.]+$/, '') || 'text-material';
  const result = await uploadBuffer(buffer, {
    resource_type: 'raw',
    folder: TEXT_FOLDER,
    public_id: `${safeName}_${Date.now()}`,
    format: 'html',
  });

  return {
    url: result.secure_url,
    deliveryUrl: result.secure_url,
    publicId: result.public_id,
    fileName: `${safeName}.html`,
    fileSize: buffer.byteLength,
    format: 'html',
  };
}

function isCloudinaryDeliveryUrl(url) {
  try {
    const parsed = new URL(String(url ?? '').trim());
    return parsed.hostname.endsWith('cloudinary.com');
  } catch {
    return false;
  }
}

function detectResourceTypeFromUrl(url) {
  if (/\/raw\//i.test(url)) return 'raw';
  if (/\/video\//i.test(url)) return 'video';
  return 'image';
}

function extractPublicIdFromUrl(secureUrl) {
  const cleanUrl = String(secureUrl ?? '').trim().split('?')[0];
  const resourceType = detectResourceTypeFromUrl(cleanUrl);
  const versionMatch = cleanUrl.match(/\/upload\/v(\d+)\//);
  const version = versionMatch ? Number(versionMatch[1]) : undefined;

  const afterUpload = cleanUrl.split('/upload/')[1];
  if (!afterUpload) {
    throw new Error('Không phân tích được URL Cloudinary.');
  }

  let publicId = decodeURIComponent(afterUpload.replace(/^v\d+\//, ''));
  if (!publicId) {
    throw new Error('Không phân tích được URL Cloudinary.');
  }

  const formatFromPath = getExtensionFromFileName(publicId);
  if (formatFromPath) {
    publicId = publicId.replace(new RegExp(`\\.${formatFromPath}$`, 'i'), '');
  }

  return {
    publicId,
    resourceType,
    version,
    format: formatFromPath || getExtensionFromFileName(cleanUrl),
  };
}

function buildPrivateDownloadUrl(secureUrl, fileName = 'tai-lieu') {
  const { publicId, resourceType, format } = extractPublicIdFromUrl(secureUrl);
  const downloadFormat = format || getExtensionFromFileName(fileName) || undefined;

  return cloudinary.utils.private_download_url(publicId, downloadFormat, {
    resource_type: resourceType,
    type: 'upload',
    attachment: sanitizeFileName(fileName),
  });
}

function buildSignedDownloadUrl(secureUrl, fileName = 'tai-lieu') {
  const { publicId, resourceType, version, format } = extractPublicIdFromUrl(secureUrl);
  const safeName = sanitizeFileName(fileName);

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: 'upload',
    secure: true,
    sign_url: true,
    version,
    format: format || undefined,
    flags: `attachment:${safeName}`,
  });
}

/**
 * Tải bytes từ Cloudinary (mentor download, proxy file).
 * Raw: thử URL trực tiếp trước; image/video: ưu tiên private_download_url.
 */
async function fetchCloudinaryAssetBuffer(secureUrl, fileName = 'tai-lieu') {
  const raw = String(secureUrl ?? '').trim();
  if (!isCloudinaryDeliveryUrl(raw)) {
    const error = new Error('URL tài liệu không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }

  const { resourceType } = extractPublicIdFromUrl(raw);
  const attempts = resourceType === 'raw'
    ? [
        raw,
        buildSignedDownloadUrl(raw, fileName),
        buildPrivateDownloadUrl(raw, fileName),
      ]
    : [
        buildPrivateDownloadUrl(raw, fileName),
        raw,
        buildSignedDownloadUrl(raw, fileName),
      ];

  for (const attemptUrl of attempts) {
    try {
      const response = await fetch(attemptUrl);
      if (!response.ok) continue;

      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get('content-type') || 'application/octet-stream',
      };
    } catch {
      // try next
    }
  }

  const error = new Error('Không thể tải file từ Cloudinary.');
  error.statusCode = 502;
  throw error;
}

module.exports = {
  AUDIO_EXTENSIONS,
  DOC_EXTENSIONS,
  READING_DOC_EXTENSIONS,
  MATERIAL_MAX_BYTES,
  MATERIAL_MAX_SIZE_MESSAGE,
  NEWS_THUMBNAIL_MAX_BYTES,
  NEWS_THUMBNAIL_MAX_SIZE_MESSAGE,
  buildDeliveryUrl,
  deleteCloudinaryAssetByUrl,
  isCloudinaryDeliveryUrl,
  buildPrivateDownloadUrl,
  fetchCloudinaryAssetBuffer,
  uploadAudioFile,
  uploadDocumentFile,
  uploadNewsThumbnailBuffer,
  uploadReadingDocumentFile,
  uploadTextHtml,
};
