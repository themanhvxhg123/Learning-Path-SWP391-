export const MAX_THUMBNAIL_FILE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const THUMBNAIL_DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i;
const THUMBNAIL_SIZE_ERROR = 'Ảnh không được lớn hơn 5MB.';
const THUMBNAIL_FORMAT_ERROR = 'Ảnh không đúng định dạng (JPG, PNG hoặc WEBP).';

/** Ước lượng kích thước binary từ chuỗi data URL base64. */
export function getDataUrlByteSize(dataUrl) {
  const trimmed = String(dataUrl ?? '').trim();
  const match = trimmed.match(THUMBNAIL_DATA_URL_PATTERN);
  if (!match) return null;

  const base64Data = match[2];
  const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
  return Math.floor((base64Data.length * 3) / 4) - padding;
}

export function validateImageFile(file) {
  if (!file) return 'Không tìm thấy file ảnh.';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.';
  }
  if (file.size > MAX_THUMBNAIL_FILE_SIZE) {
    return THUMBNAIL_SIZE_ERROR;
  }
  return null;
}

/** Validate thumbnail data URL (sau crop hoặc trước submit). */
export function validateThumbnailDataUrl(dataUrl) {
  const trimmed = String(dataUrl ?? '').trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith('data:image/')) {
    try {
      const url = new URL(trimmed);
      if (url.protocol === 'http:' || url.protocol === 'https:') return null;
    } catch {
      // fall through
    }
    if (trimmed.startsWith('/assets/')) return null;
    return THUMBNAIL_FORMAT_ERROR;
  }

  if (!THUMBNAIL_DATA_URL_PATTERN.test(trimmed)) {
    return THUMBNAIL_FORMAT_ERROR;
  }

  const byteSize = getDataUrlByteSize(trimmed);
  if (byteSize != null && byteSize > MAX_THUMBNAIL_FILE_SIZE) {
    return THUMBNAIL_SIZE_ERROR;
  }

  return null;
}

export function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function getBaseCoverScale(naturalWidth, naturalHeight, cropWidth, cropHeight) {
  return Math.max(cropWidth / naturalWidth, cropHeight / naturalHeight);
}

export function getRenderedSize(naturalWidth, naturalHeight, cropWidth, cropHeight, zoom) {
  const baseScale = getBaseCoverScale(naturalWidth, naturalHeight, cropWidth, cropHeight);

  return {
    width: naturalWidth * baseScale * zoom,
    height: naturalHeight * baseScale * zoom,
    baseScale,
  };
}

export function clampCropOffset(offset, renderedWidth, renderedHeight, cropWidth, cropHeight) {
  const maxX = Math.max(0, (renderedWidth - cropWidth) / 2);
  const maxY = Math.max(0, (renderedHeight - cropHeight) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

export async function getCroppedImageDataUrl(
  imageSrc,
  { cropWidth, cropHeight, zoom, offset, outputWidth = 640 },
) {
  const image = await loadImage(imageSrc);
  const baseScale = getBaseCoverScale(
    image.naturalWidth,
    image.naturalHeight,
    cropWidth,
    cropHeight,
  );

  const renderedWidth = image.naturalWidth * baseScale * zoom;
  const renderedHeight = image.naturalHeight * baseScale * zoom;

  const cropXOnRendered = (renderedWidth - cropWidth) / 2 - offset.x;
  const cropYOnRendered = (renderedHeight - cropHeight) / 2 - offset.y;

  const scaleToNatural = image.naturalWidth / renderedWidth;

  const sourceX = cropXOnRendered * scaleToNatural;
  const sourceY = cropYOnRendered * scaleToNatural;
  const sourceWidth = cropWidth * scaleToNatural;
  const sourceHeight = cropHeight * scaleToNatural;

  const outputHeight = Math.round(outputWidth / (cropWidth / cropHeight));
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function isValidThumbnailValue(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return true;
  return validateThumbnailDataUrl(trimmed) == null;
}

export function isThumbnailDataUrl(value) {
  return typeof value === 'string' && value.trim().startsWith('data:image/');
}

export {
  sanitizeThumbnail,
  resolveThumbnailUrl as resolveCourseThumbnailUrl,
} from '@/shared/utils/thumbnailUtils';
