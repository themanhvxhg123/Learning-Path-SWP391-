// TODO: update backend/DB MaterialType to support TEXT
import {
  getFileExtension,
  MATERIAL_UPLOAD_MAX_BYTES,
  MATERIAL_UPLOAD_MAX_SIZE_MESSAGE,
  validateVideoFile as sharedValidateVideoFile,
  READING_DOC_EXTENSIONS,
  READING_DOC_EXTENSION_NAMES,
  READING_DOC_INVALID_TYPE_MESSAGE,
} from '@/shared/utils/materialUploadValidation';
import { getTestDefaultFields } from './mentorTestContentUtils';

export { getTestDefaultFields } from './mentorTestContentUtils';

export const MATERIAL_TYPES = ['VIDEO', 'TEXT', 'DOC'];

/** Học liệu thực tế trong bài học — không gồm bài kiểm tra (quản lý riêng qua ngân hàng câu hỏi). */
export const LEARNING_MATERIAL_TYPES = MATERIAL_TYPES;

export function normalizeMaterialType(type) {
  return String(type ?? '').trim().toUpperCase();
}

/** ID học liệu đã lưu DB (Pascal/camel). Dùng để phân biệt UPDATE vs INSERT. */
export function getMaterialPersistentId(material = {}) {
  const raw = material.MaterialId ?? material.materialId;
  if (raw == null || raw === '') return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function normalizeMaterialForDisplay(material = {}) {
  const MaterialType = normalizeMaterialType(material.MaterialType ?? material.materialType);

  return {
    ...material,
    MaterialType,
    Title: material.Title ?? material.title ?? '',
    MaterialUrl: material.MaterialUrl ?? material.materialUrl ?? '',
    Content: material.Content ?? material.content ?? '',
    FileName: material.FileName ?? material.fileName ?? '',
    FileSize: material.FileSize ?? material.fileSize ?? null,
    SourceType: material.SourceType ?? material.sourceType ?? null,
    MaterialId: getMaterialPersistentId(material),
  };
}

export function getPathNodes(path = {}) {
  return path.nodes ?? path.Nodes ?? [];
}

export function getNodeMaterials(node = {}, { learningOnly = false } = {}) {
  const raw = (node.materials ?? node.Materials ?? []).map(normalizeMaterialForDisplay);
  return learningOnly ? filterLearningMaterials(raw) : raw;
}

export function getCoursePaths(course = {}) {
  return course.paths ?? course.Paths ?? [];
}

export function isLearningMaterial(material) {
  return LEARNING_MATERIAL_TYPES.includes(
    normalizeMaterialType(material?.MaterialType ?? material?.materialType),
  );
}

export function filterLearningMaterials(materials = []) {
  return (materials ?? []).filter(isLearningMaterial);
}

export function countLearningMaterials(materials = []) {
  return filterLearningMaterials(materials).length;
}

export function countMaterialsInPath(path = {}) {
  return getPathNodes(path).reduce(
    (sum, node) => sum + countLearningMaterials(getNodeMaterials(node)),
    0,
  );
}

/** Chương đã có nội dung học (bài học hoặc học liệu). */
export function chapterHasContent(path = {}) {
  const nodes = getPathNodes(path);
  if (nodes.length === 0) return false;
  if (countMaterialsInPath(path) > 0) return true;
  return nodes.some((node) => String(node.NodeName ?? node.nodeName ?? '').trim().length > 0);
}

/** Chương đủ điều kiện xuất bản: ≥1 bài học, ≥1 học liệu, ≥1 bài học đã xuất bản. */
export function chapterCanPublish(path = {}) {
  const nodes = getPathNodes(path);
  if (nodes.length === 0) return false;
  if (countMaterialsInPath(path) === 0) return false;
  return nodes.some(isNodeActive);
}

export function getChapterPublishBlockReason(path = {}) {
  const nodes = getPathNodes(path);
  if (nodes.length === 0) {
    return 'Chương cần ít nhất 1 bài học trước khi xuất bản.';
  }
  if (countMaterialsInPath(path) === 0) {
    return 'Chương cần ít nhất 1 học liệu trước khi xuất bản.';
  }
  if (!nodes.some(isNodeActive)) {
    return 'Chương cần ít nhất 1 bài học được xuất bản trước khi xuất bản chương.';
  }
  return null;
}

/** Chương đã có bài kiểm tra cuối chương (theo PathId). */
export function pathHasChapterQuizTest(pathId, chapterQuizPathIds = null) {
  if (pathId == null || pathId === '') return false;
  const ids = chapterQuizPathIds instanceof Set
    ? chapterQuizPathIds
    : new Set((chapterQuizPathIds ?? []).map(String));
  return ids.has(String(pathId));
}

/** Lý do không cho ẩn/hủy xuất bản chương đang hiển thị. */
export function getChapterUnpublishBlockReason(path = {}, { chapterQuizPathIds = null } = {}) {
  if (!isPathActive(path)) return null;
  const pathId = path.PathId ?? path.pathId;
  if (!pathHasChapterQuizTest(pathId, chapterQuizPathIds)) return null;
  return 'Không thể ẩn chương đã có bài kiểm tra.';
}

/** Lý do không cho ẩn bài học khi chương có bài kiểm tra và đây là bài học xuất bản cuối cùng. */
export function getLessonUnpublishBlockReason(node = {}, path = {}, { chapterQuizPathIds = null } = {}) {
  if (!isNodeActive(node)) return null;
  const pathId = path.PathId ?? path.pathId;
  if (!pathHasChapterQuizTest(pathId, chapterQuizPathIds)) return null;

  const otherActiveNodes = getPathNodes(path).filter(
    (item) => item.tempId !== node.tempId && isNodeActive(item),
  ).length;

  if (otherActiveNodes >= 1) return null;
  return 'Chương có bài kiểm tra cần ít nhất 1 bài học được xuất bản.';
}

/** Hủy xuất bản chương khi không còn bài học nào được xuất bản. */
export function normalizeChapterPublishState(path = {}) {
  if (!isPathActive(path)) return path;
  if (getPathNodes(path).some(isNodeActive)) return path;
  return { ...path, IsActive: 0 };
}

export function syncPathsChapterPublishState(paths, pathTempId = null) {
  return (paths ?? []).map((path) => {
    if (pathTempId && path.tempId !== pathTempId) return path;
    return normalizeChapterPublishState(path);
  });
}

export function wasChapterAutoUnpublished(beforePath, afterPath) {
  return Boolean(
    beforePath
    && afterPath
    && isPathActive(beforePath)
    && !isPathActive(afterPath),
  );
}

/** Chương đang xuất bản nhưng mọi bài học (state UI) đều tắt xuất bản. */
export function shouldUnpublishChapterBecauseAllLessonsOff(path = {}) {
  if (!isPathActive(path)) return false;
  const nodes = getPathNodes(path);
  if (nodes.length === 0) return false;
  return !nodes.some(isNodeActive);
}

/** Bài học đã có nội dung (tên hoặc học liệu). */
export function lessonHasContent(node = {}) {
  if (countLearningMaterials(getNodeMaterials(node)) > 0) return true;
  return String(node.NodeName ?? node.nodeName ?? '').trim().length > 0;
}

/** Bài học đủ điều kiện xuất bản: ≥1 học liệu (VIDEO/TEXT/DOC). */
export function lessonCanPublish(node = {}) {
  return countLearningMaterials(getNodeMaterials(node)) > 0;
}

export function getLessonPublishBlockReason(node = {}) {
  if (countLearningMaterials(getNodeMaterials(node)) === 0) {
    return 'Bài học cần ít nhất 1 học liệu trước khi xuất bản.';
  }
  return null;
}

/** Học liệu đã có nội dung (tiêu đề, link, file hoặc văn bản). */
export function materialHasContent(material = {}) {
  if (String(material.Title ?? '').trim()) return true;
  if (String(material.MaterialUrl ?? '').trim()) return true;
  if (String(material.Content ?? '').trim()) return true;
  if (material.File || material.FileName) return true;
  return false;
}

/** File DOC/VIDEO đang upload (đã chọn file, chưa có URL). */
export function isMaterialFileUploadPending(material) {
  if (!material) return false;
  const type = normalizeMaterialType(material.MaterialType ?? material.materialType);
  if (type !== 'DOC' && type !== 'VIDEO') return false;
  return Boolean(material.File) && !String(material.MaterialUrl ?? material.materialUrl ?? '').trim();
}

export const CONTENT_SHORT_DESCRIPTION_MAX = 150;

export function trimShortDescription(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, CONTENT_SHORT_DESCRIPTION_MAX);
}

/** Trích plain text từ HTML — dùng DOM khi có, hỗ trợ tiếng Việt & entity. */
export function extractPlainTextFromHtml(html) {
  const raw = String(html ?? '');
  if (!raw.trim()) return '';

  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = raw;
    return (el.textContent || el.innerText || '')
      .replace(/\u200B|\uFEFF/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/<[^>]+>/g, '')
    .replace(/\u200B|\uFEFF/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isHtmlContentEmpty(html) {
  return extractPlainTextFromHtml(html).length === 0;
}

export const MATERIAL_TYPE_LABELS = {
  VIDEO: 'Video',
  TEXT: 'Văn bản',
  DOC: 'Tài liệu',
  TEST: 'Bài kiểm tra',
};

export const MATERIAL_URL_PLACEHOLDERS = {
  VIDEO: 'Ví dụ: https://youtube.com/watch?v=...',
  TEXT: 'Link văn bản',
  DOC: 'Ví dụ: https://drive.google.com/file/...',
  TEST: 'Ví dụ: https://forms.google.com/...',
};

export const MATERIAL_URL_LABELS = {
  VIDEO: 'Link video',
  TEST: 'Link bài kiểm tra',
};

export const DOC_SOURCE_UPLOAD = 'UPLOAD';
export const DOC_SOURCE_LINK = 'LINK';

export function resolveDocSourceType(material = {}) {
  if (material.SourceType === DOC_SOURCE_LINK) return DOC_SOURCE_LINK;
  if (material.SourceType === DOC_SOURCE_UPLOAD) return DOC_SOURCE_UPLOAD;
  const hasUrl = Boolean(String(material.MaterialUrl ?? '').trim());
  const hasFileMeta = Boolean(material.File || material.FileName);
  if (hasUrl && !hasFileMeta) return DOC_SOURCE_LINK;
  return DOC_SOURCE_UPLOAD;
}

export const VIDEO_SOURCE_UPLOAD = 'UPLOAD';
export const VIDEO_SOURCE_LINK = 'LINK';

export const VIDEO_ALLOWED_EXTENSIONS = ['.mp4', '.webm', '.mov'];

export function resolveVideoSourceType(material = {}) {
  if (material.SourceType === VIDEO_SOURCE_LINK) return VIDEO_SOURCE_LINK;
  if (material.SourceType === VIDEO_SOURCE_UPLOAD) return VIDEO_SOURCE_UPLOAD;
  const hasUrl = Boolean(String(material.MaterialUrl ?? '').trim());
  const hasFileMeta = Boolean(material.File || material.FileName);
  if (hasUrl && !hasFileMeta) return VIDEO_SOURCE_LINK;
  return VIDEO_SOURCE_UPLOAD;
}

export function getVideoDefaultFields() {
  return {
    SourceType: VIDEO_SOURCE_UPLOAD,
    File: null,
    FileName: null,
    FileSize: null,
    MaterialUrl: '',
  };
}

export function validateVideoFile(file) {
  return sharedValidateVideoFile(file);
}

export function getVideoFileTypeLabel(fileName) {
  const ext = getFileExtension(fileName);
  if (ext === 'mp4') return 'MP4';
  if (ext === 'webm') return 'WEBM';
  if (ext === 'mov') return 'MOV';
  return 'Video';
}

export const DOC_ALLOWED_EXTENSIONS = READING_DOC_EXTENSIONS;

/** Khớp giới hạn Cloudinary free tier. */
export const DOC_MAX_BYTES = MATERIAL_UPLOAD_MAX_BYTES;
export const TEXT_MAX_BYTES = MATERIAL_UPLOAD_MAX_BYTES;

export function getMaterialMaxFileSizeLabel() {
  return '10MB';
}

export function isAllowedDocFile(file) {
  if (!file?.name) return false;
  const ext = getFileExtension(file.name);
  return READING_DOC_EXTENSION_NAMES.includes(ext ?? '');
}

export function validateDocFile(file) {
  if (!file) {
    return { ok: false, message: 'Vui lòng chọn file tài liệu.' };
  }
  if (!isAllowedDocFile(file)) {
    return { ok: false, message: READING_DOC_INVALID_TYPE_MESSAGE };
  }
  if (file.size > DOC_MAX_BYTES) {
    return {
      ok: false,
      message: MATERIAL_UPLOAD_MAX_SIZE_MESSAGE,
    };
  }
  return { ok: true };
}

export function getDocDefaultFields() {
  return {
    SourceType: DOC_SOURCE_UPLOAD,
    File: null,
    FileName: null,
    FileSize: null,
    MaterialUrl: '',
  };
}

export function getDocFileTypeLabel(fileName) {
  const lower = String(fileName ?? '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.doc')) return 'DOC';
  if (lower.endsWith('.docx')) return 'DOCX';
  return 'Tài liệu';
}

function getDocExtension(fileNameOrUrl = '') {
  return getFileExtension(fileNameOrUrl);
}

/** URL nhúng iframe xem trước tài liệu (PDF trực tiếp, Office qua Google Docs viewer). */
export function getDocumentPreviewEmbedUrl(materialUrl, fileName = '') {
  const url = String(materialUrl ?? '').trim();
  if (!url) return null;

  const ext = getDocExtension(fileName) || getDocExtension(url);
  if (ext === 'pdf') return url;

  return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
}

export function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return '';
  const size = Number(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function serializePathSnapshot(path) {
  const [normalized] = withNormalizedOrders([path]);
  return JSON.stringify(normalized, (key, value) => (
    key === 'File' || key === '_restoreAt' || key === 'UploadedContentHash'
      ? undefined
      : value
  ));
}

export function restorePathFromSnapshot(path, savedSnapshot) {
  if (!path?.tempId || !savedSnapshot) return path;
  try {
    const restored = JSON.parse(savedSnapshot);
    return withNormalizedOrders([{ ...restored, tempId: path.tempId }])[0];
  } catch {
    return path;
  }
}

export function isPathSnapshotSaved(path, savedSnapshot) {
  if (!savedSnapshot) return false;
  return serializePathSnapshot(path) === savedSnapshot;
}

function normalizePathFieldsForCompare(path = {}) {
  return {
    PathId: path.PathId ?? null,
    PathName: String(path.PathName ?? '').trim(),
    Description: trimShortDescription(path.Description),
    IsActive: toPathIsActiveValue(path.IsActive ?? path.isActive, 1),
  };
}

function getNodeFromSnapshot(savedSnapshot, nodeTempId) {
  if (!savedSnapshot || !nodeTempId) return null;
  try {
    const baseline = JSON.parse(savedSnapshot);
    const [normalized] = withNormalizedOrders([baseline]);
    const node = (normalized.nodes ?? []).find((item) => item.tempId === nodeTempId);
    if (!node) return null;
    return {
      ...node,
      materials: filterLearningMaterials(node.materials ?? node.Materials ?? []),
    };
  } catch {
    return null;
  }
}

function serializeNodeSnapshot(node) {
  if (!node) return null;
  return JSON.stringify({
    NodeId: node.NodeId ?? null,
    NodeName: String(node.NodeName ?? node.nodeName ?? '').trim(),
    Description: trimShortDescription(node.Description),
    NodeOrder: Number(node.NodeOrder ?? 1),
    IsActive: toPathIsActiveValue(node.IsActive ?? node.isActive, 1),
    materials: filterLearningMaterials(node.materials ?? node.Materials ?? []).map((material) => ({
      MaterialId: material.MaterialId ?? null,
      tempId: material.tempId ?? null,
      MaterialType: material.MaterialType ?? null,
      Title: String(material.Title ?? '').trim(),
      MaterialOrder: Number(material.MaterialOrder ?? 1),
      SourceType: material.SourceType ?? null,
      MaterialUrl: String(material.MaterialUrl ?? '').trim() || null,
      FileName: material.FileName ?? null,
      FileSize: material.FileSize ?? null,
      Content: material.Content ?? null,
    })),
  });
}

/** Chỉ so sánh metadata path (tên, mô tả, xuất bản) — bỏ qua nodes/materials. */
export function isPathFieldsSnapshotSaved(path, savedSnapshot) {
  if (!savedSnapshot) return false;

  let baseline;
  try {
    baseline = JSON.parse(savedSnapshot);
  } catch {
    return false;
  }

  return JSON.stringify(normalizePathFieldsForCompare(path))
    === JSON.stringify(normalizePathFieldsForCompare(baseline));
}

function serializeNodeFieldsSnapshot(node) {
  if (!node) return null;
  return JSON.stringify({
    NodeId: node.NodeId ?? null,
    NodeName: String(node.NodeName ?? node.nodeName ?? '').trim(),
    Description: trimShortDescription(node.Description),
    NodeOrder: Number(node.NodeOrder ?? 1),
    IsActive: toPathIsActiveValue(node.IsActive ?? node.isActive, 1),
  });
}

function serializeMaterialFieldsSnapshot(material) {
  if (!material) return null;
  return JSON.stringify({
    MaterialId: material.MaterialId ?? null,
    MaterialType: material.MaterialType ?? null,
    Title: String(material.Title ?? '').trim(),
    MaterialOrder: Number(material.MaterialOrder ?? 1),
    SourceType: material.SourceType ?? null,
    MaterialUrl: String(material.MaterialUrl ?? '').trim() || null,
    FileName: material.FileName ?? null,
    FileSize: material.FileSize ?? null,
    Content: material.Content ?? null,
  });
}

/** Chỉ so sánh metadata bài học (tên, mô tả, thứ tự, xuất bản) — bỏ qua học liệu. */
export function isNodeFieldsSnapshotSaved(path, nodeTempId, savedSnapshot) {
  if (!savedSnapshot || !nodeTempId) return false;

  const [normalizedPath] = withNormalizedOrders([path]);
  const node = (normalizedPath.nodes ?? []).find((item) => item.tempId === nodeTempId);
  if (!node) return true;

  const baselineNode = getNodeFromSnapshot(savedSnapshot, nodeTempId);
  if (!baselineNode) {
    return serializeNodeFieldsSnapshot(node) === serializeNodeFieldsSnapshot({
      ...node,
      NodeId: null,
      NodeName: '',
      Description: '',
    });
  }

  return serializeNodeFieldsSnapshot(node) === serializeNodeFieldsSnapshot(baselineNode);
}

/** Khôi phục metadata chương về snapshot đã lưu (không đụng nodes/materials). */
export function restorePathFieldsFromSnapshot(path, savedSnapshot) {
  if (!path?.tempId || !savedSnapshot) return path;
  try {
    const baseline = JSON.parse(savedSnapshot);
    return {
      ...path,
      PathName: baseline.PathName ?? '',
      Description: baseline.Description ?? null,
      IsActive: baseline.IsActive ?? baseline.isActive ?? path.IsActive,
      PathOrder: baseline.PathOrder ?? path.PathOrder,
    };
  } catch {
    return path;
  }
}

/** Khôi phục metadata bài học về snapshot (không đụng materials). */
export function restoreNodeFieldsFromSnapshot(path, nodeTempId, savedSnapshot) {
  if (!path?.tempId || !nodeTempId || !savedSnapshot) return path;
  const baselineNode = getNodeFromSnapshot(savedSnapshot, nodeTempId);
  if (!baselineNode) return path;

  return {
    ...path,
    nodes: (path.nodes ?? path.Nodes ?? []).map((node) => {
      if (node.tempId !== nodeTempId) return node;
      return {
        ...node,
        NodeName: baselineNode.NodeName ?? baselineNode.nodeName ?? '',
        Description: baselineNode.Description ?? null,
        IsActive: baselineNode.IsActive ?? baselineNode.isActive ?? node.IsActive,
        NodeOrder: baselineNode.NodeOrder ?? node.NodeOrder,
      };
    }),
  };
}

/** Áp dụng dữ liệu học liệu từ API vào path (giữ tempId hiện tại). */
export function applyFetchedMaterialToPath(path, nodeTempId, materialTempId, apiMaterial) {
  if (!path?.tempId || !nodeTempId || !materialTempId || !apiMaterial) return path;

  return {
    ...path,
    nodes: (path.nodes ?? path.Nodes ?? []).map((item) => {
      if (item.tempId !== nodeTempId) return item;
      return {
        ...item,
        materials: filterLearningMaterials(item.materials ?? item.Materials ?? []).map((entry) => {
          if (entry.tempId !== materialTempId) return entry;
          return {
            ...entry,
            MaterialId: getMaterialPersistentId(apiMaterial) ?? getMaterialPersistentId(entry),
            MaterialType: apiMaterial.MaterialType ?? apiMaterial.materialType ?? entry.MaterialType,
            Title: apiMaterial.Title ?? apiMaterial.title ?? '',
            MaterialUrl: apiMaterial.MaterialUrl ?? apiMaterial.materialUrl ?? '',
            MaterialOrder: apiMaterial.MaterialOrder ?? apiMaterial.materialOrder ?? entry.MaterialOrder ?? 1,
            SourceType: apiMaterial.SourceType ?? apiMaterial.sourceType ?? null,
            FileName: apiMaterial.FileName ?? apiMaterial.fileName ?? null,
            FileSize: apiMaterial.FileSize ?? apiMaterial.fileSize ?? null,
            Content: apiMaterial.Content ?? apiMaterial.content ?? '',
            File: null,
            _restoreAt: Date.now(),
            tempId: entry.tempId,
          };
        }),
      };
    }),
  };
}

/** So sánh một học liệu với snapshot đã lưu của path. */
export function isMaterialSnapshotSaved(path, nodeTempId, materialTempId, savedSnapshot) {
  if (!savedSnapshot || !nodeTempId || !materialTempId) return false;

  const [normalizedPath] = withNormalizedOrders([path]);
  const node = (normalizedPath.nodes ?? []).find((item) => item.tempId === nodeTempId);
  if (!node) return true;

  const materials = filterLearningMaterials(node.materials ?? node.Materials ?? []);
  const material = materials.find((item) => item.tempId === materialTempId);
  if (!material) return true;

  const baselineNode = getNodeFromSnapshot(savedSnapshot, nodeTempId);
  const baselineMaterial = filterLearningMaterials(baselineNode?.materials ?? [])
    .find((item) => item.tempId === materialTempId
      || (material.MaterialId && item.MaterialId === material.MaterialId));

  if (!baselineMaterial) {
    return serializeMaterialFieldsSnapshot(material) === serializeMaterialFieldsSnapshot({
      ...material,
      MaterialId: null,
      Title: '',
      MaterialUrl: null,
      Content: null,
    });
  }

  return serializeMaterialFieldsSnapshot(material) === serializeMaterialFieldsSnapshot(baselineMaterial);
}

/** So sánh một bài học (kèm học liệu) với snapshot đã lưu của path. */
export function isNodeSnapshotSaved(path, nodeTempId, savedSnapshot) {
  if (!savedSnapshot || !nodeTempId) return false;

  const [normalizedPath] = withNormalizedOrders([path]);
  const node = (normalizedPath.nodes ?? []).find((item) => item.tempId === nodeTempId);
  if (!node) return true;

  const currentNode = {
    ...node,
    materials: filterLearningMaterials(node.materials ?? node.Materials ?? []),
  };
  const baselineNode = getNodeFromSnapshot(savedSnapshot, nodeTempId);

  if (!baselineNode) {
    return serializeNodeSnapshot(currentNode) === serializeNodeSnapshot({
      ...currentNode,
      NodeId: null,
      NodeName: '',
      Description: '',
      materials: [],
    });
  }

  return serializeNodeSnapshot(currentNode) === serializeNodeSnapshot(baselineNode);
}

/** Có thay đổi chưa lưu trong phạm vi đang chỉnh sửa (path / node / material). */
export function hasUnsavedEditScopeChanges(path, savedSnapshot, focusTarget) {
  if (!path) return false;

  const focusPathId = focusTarget?.pathTempId;
  if (focusPathId && focusPathId !== path.tempId) {
    return !isPathSnapshotSaved(path, savedSnapshot);
  }

  if (focusTarget?.type === 'material' && focusTarget.nodeTempId && focusTarget.materialTempId) {
    return !isMaterialSnapshotSaved(
      path,
      focusTarget.nodeTempId,
      focusTarget.materialTempId,
      savedSnapshot,
    );
  }

  if (focusTarget?.type === 'lesson' && focusTarget.nodeTempId) {
    return !isNodeFieldsSnapshotSaved(path, focusTarget.nodeTempId, savedSnapshot);
  }

  if (focusTarget?.type === 'chapter-edit') {
    return !isPathFieldsSnapshotSaved(path, savedSnapshot);
  }

  return false;
}

export function makePathDirtyKey(pathTempId) {
  return `path:${pathTempId}`;
}

export function makeNodeDirtyKey(pathTempId, nodeTempId) {
  return `node:${pathTempId}:${nodeTempId}`;
}

export function makeMaterialDirtyKey(pathTempId, nodeTempId, materialTempId) {
  return `material:${pathTempId}:${nodeTempId}:${materialTempId}`;
}

export function isEditDirty(dirtyKeys, key) {
  return Boolean(key && dirtyKeys?.[key]);
}

export function hasUnsavedEditScopeDirty(dirtyKeys, focusTarget, activePathTempId) {
  if (!focusTarget) {
    return activePathTempId ? pathHasAnyDirty(dirtyKeys, activePathTempId) : false;
  }

  if (focusTarget.type === 'material' && focusTarget.pathTempId && focusTarget.nodeTempId && focusTarget.materialTempId) {
    return isEditDirty(
      dirtyKeys,
      makeMaterialDirtyKey(focusTarget.pathTempId, focusTarget.nodeTempId, focusTarget.materialTempId),
    );
  }

  if (focusTarget.type === 'lesson' && focusTarget.pathTempId && focusTarget.nodeTempId) {
    return isEditDirty(dirtyKeys, makeNodeDirtyKey(focusTarget.pathTempId, focusTarget.nodeTempId));
  }

  if (focusTarget.type === 'chapter-edit' && focusTarget.pathTempId) {
    return isEditDirty(dirtyKeys, makePathDirtyKey(focusTarget.pathTempId));
  }

  if (focusTarget.pathTempId) {
    return pathHasAnyDirty(dirtyKeys, focusTarget.pathTempId);
  }

  return false;
}

/** Focus đang trỏ tới chương/bài/học liệu mới tạo nhưng chưa lưu DB. */
export function hasPendingNewUnsavedFocus(focusTarget, paths = []) {
  if (!focusTarget?.pathTempId) return false;

  const path = (paths ?? []).find((item) => item.tempId === focusTarget.pathTempId);
  if (!path) return false;

  if (
    focusTarget.type === 'material'
    && focusTarget.nodeTempId
    && focusTarget.materialTempId
  ) {
    const node = (path.nodes ?? path.Nodes ?? []).find(
      (item) => item.tempId === focusTarget.nodeTempId,
    );
    const material = filterLearningMaterials(node?.materials ?? node?.Materials ?? [])
      .find((item) => item.tempId === focusTarget.materialTempId);
    return isNewUnsavedMaterial(material);
  }

  if (focusTarget.type === 'lesson' && focusTarget.nodeTempId) {
    const node = (path.nodes ?? path.Nodes ?? []).find(
      (item) => item.tempId === focusTarget.nodeTempId,
    );
    return isNewUnsavedNode(node);
  }

  if (focusTarget.type === 'chapter-edit') {
    return isNewUnsavedPath(path);
  }

  return false;
}

export function pathHasAnyDirty(dirtyKeys = {}, pathTempId) {
  if (!pathTempId) return false;
  return Object.keys(dirtyKeys).some((key) => (
    key === makePathDirtyKey(pathTempId)
    || key.startsWith(`node:${pathTempId}:`)
    || key.startsWith(`material:${pathTempId}:`)
  ));
}

export function clearDirtyKeysForPath(dirtyKeys = {}, pathTempId) {
  const next = { ...dirtyKeys };
  Object.keys(next).forEach((key) => {
    if (
      key === makePathDirtyKey(pathTempId)
      || key.startsWith(`node:${pathTempId}:`)
      || key.startsWith(`material:${pathTempId}:`)
    ) {
      delete next[key];
    }
  });
  return next;
}

export function hasOtherUnsavedDirtyPaths(pathTempId, paths = [], dirtyKeys = {}) {
  return paths.some(
    (path) => path.tempId !== pathTempId && pathHasAnyDirty(dirtyKeys, path.tempId),
  );
}

function normalizeUniqueNameKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Khóa trùng học liệu trong cùng bài: loại + tiêu đề (chuẩn hóa). */
function normalizeMaterialDuplicateKey(material) {
  const type = normalizeMaterialType(material?.MaterialType ?? material?.materialType);
  const titleKey = normalizeUniqueNameKey(material?.Title ?? material?.title);
  if (!type || !titleKey) return null;
  return `${type}::${titleKey}`;
}

function buildMaterialDuplicateTitleGroups(materials = []) {
  const groups = new Map();
  filterLearningMaterials(materials).forEach((material) => {
    const key = normalizeMaterialDuplicateKey(material);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(material.tempId);
  });
  return groups;
}

/** Đánh dấu lỗi trùng tên theo nhóm (key → danh sách tempId). */
function applyDuplicateNameErrors(groups, assignError) {
  groups.forEach((tempIds) => {
    if (tempIds.length < 2) return;
    tempIds.forEach((tempId) => assignError(tempId));
  });
}

export function validatePathFieldsForSave(path, allPaths = [], options = {}) {
  const errors = {};

  if (!String(path.PathName ?? '').trim()) {
    errors.PathName = 'Vui lòng nhập tên chương trước khi lưu.';
    return errors;
  }

  const nameKey = normalizeUniqueNameKey(path.PathName);
  const hasDuplicate = (allPaths.length > 0 ? allPaths : [path]).some(
    (item) => item.tempId !== path.tempId && normalizeUniqueNameKey(item.PathName) === nameKey,
  );
  if (hasDuplicate) {
    errors.PathName = 'Tên chương bị trùng.';
  }

  if (!isPathActive(path) && pathHasChapterQuizTest(path.PathId ?? path.pathId, options.chapterQuizPathIds)) {
    errors._publish = 'Không thể ẩn chương đã có bài kiểm tra.';
  }

  if (isPathActive(path) && !chapterCanPublish(path)) {
    errors._publish = getChapterPublishBlockReason(path);
  }

  return errors;
}

export function validateNodeFieldsForSave(node, siblingNodes = [], options = {}) {
  const errors = {};

  if (!String(node.NodeName ?? node.nodeName ?? '').trim()) {
    errors.NodeName = 'Vui lòng nhập tên bài học.';
    return errors;
  }

  const nameKey = normalizeUniqueNameKey(node.NodeName ?? node.nodeName);
  const hasDuplicate = (siblingNodes.length > 0 ? siblingNodes : [node]).some(
    (item) => item.tempId !== node.tempId
      && normalizeUniqueNameKey(item.NodeName ?? item.nodeName) === nameKey,
  );
  if (hasDuplicate) {
    errors.NodeName = 'Tên bài học bị trùng.';
  }

  const path = options.path ?? null;
  if (
    path
    && !isNodeActive(node)
    && pathHasChapterQuizTest(path.PathId ?? path.pathId, options.chapterQuizPathIds)
  ) {
    const siblings = siblingNodes.length > 0 ? siblingNodes : getPathNodes(path);
    const otherActiveNodes = siblings.filter(
      (item) => item.tempId !== node.tempId && isNodeActive(item),
    ).length;
    if (otherActiveNodes < 1) {
      errors._publish = 'Chương có bài kiểm tra cần ít nhất 1 bài học được xuất bản.';
    }
  }

  if (isNodeActive(node) && !lessonCanPublish(node)) {
    errors._publish = getLessonPublishBlockReason(node);
  }

  return errors;
}

export function validateNodeForSave(node) {
  const fakePath = {
    tempId: '_validate_node',
    PathName: 'placeholder',
    nodes: [node],
  };
  const errors = validateCourseContent([fakePath]);
  return errors.paths?.['_validate_node']?.nodes?.[node.tempId] ?? {};
}

export function validateMaterialForSave(material, siblingMaterials = []) {
  const fakeNode = {
    tempId: '_validate_material',
    NodeName: 'placeholder',
    materials: siblingMaterials.length > 0 ? siblingMaterials : [material],
  };
  const fakePath = {
    tempId: '_validate_material_path',
    PathName: 'placeholder',
    nodes: [fakeNode],
  };
  const errors = validateCourseContent([fakePath]);
  return errors.paths?.['_validate_material_path']?.nodes?.['_validate_material']?.materials?.[material.tempId] ?? {};
}

export function getMaterialContentValidationToast(materialErrors = {}) {
  if (!materialErrors || Object.keys(materialErrors).length === 0) return null;
  return Object.values(materialErrors).find(Boolean) ?? 'Vui lòng kiểm tra lại học liệu.';
}

export function getNodeContentValidationToast(nodeErrors = {}, node) {
  if (!node || !nodeErrors || Object.keys(nodeErrors).length === 0) return null;

  if (nodeErrors.NodeName) return nodeErrors.NodeName;
  if (nodeErrors._publish) return nodeErrors._publish;
  if (nodeErrors._materials) return nodeErrors._materials;

  for (const material of node.materials ?? node.Materials ?? []) {
    const materialErrors = nodeErrors.materials?.[material.tempId];
    if (!materialErrors) continue;
    const firstError = Object.values(materialErrors).find(Boolean);
    if (firstError) return firstError;
  }

  return 'Vui lòng kiểm tra lại thông tin bài học.';
}

export function validatePathForSave(path, allPaths = []) {
  const errors = {};

  if (!String(path.PathName ?? '').trim()) {
    errors.PathName = 'Vui lòng nhập tên chương trước khi lưu.';
  } else {
    const nameKey = normalizeUniqueNameKey(path.PathName);
    const pathsToCompare = allPaths.length > 0 ? allPaths : [path];
    const hasDuplicateChapter = pathsToCompare.some(
      (item) => item.tempId !== path.tempId && normalizeUniqueNameKey(item.PathName) === nameKey,
    );
    if (hasDuplicateChapter) {
      errors.PathName = 'Tên chương bị trùng.';
    }
  }

  const nodes = path.nodes ?? path.Nodes ?? [];
  if (nodes.length === 0) {
    errors._nodes = 'Mỗi chương cần ít nhất 1 bài học.';
  }

  const nodeNameGroups = new Map();
  nodes.forEach((node) => {
    const key = normalizeUniqueNameKey(node.NodeName ?? node.nodeName);
    if (!key) return;
    if (!nodeNameGroups.has(key)) nodeNameGroups.set(key, []);
    nodeNameGroups.get(key).push(node.tempId);
  });

  const nodeErrors = {};
  nodes.forEach((node) => {
    const currentNodeErrors = {};

    if (!String(node.NodeName ?? node.nodeName ?? '').trim()) {
      currentNodeErrors.NodeName = 'Vui lòng nhập tên bài học.';
    }

    if (countLearningMaterials(node.materials ?? node.Materials ?? []) === 0) {
      currentNodeErrors._materials = 'Mỗi bài học cần ít nhất 1 học liệu.';
    }

    if (isNodeActive(node) && !lessonCanPublish(node)) {
      currentNodeErrors._publish = getLessonPublishBlockReason(node);
    }

    const materials = filterLearningMaterials(node.materials ?? node.Materials ?? []);
    const materialErrorsMap = {};
    applyDuplicateNameErrors(buildMaterialDuplicateTitleGroups(materials), (materialTempId) => {
      materialErrorsMap[materialTempId] = {
        ...(materialErrorsMap[materialTempId] ?? {}),
        Title: 'Tiêu đề học liệu bị trùng với học liệu cùng loại.',
      };
    });

    if (Object.keys(materialErrorsMap).length > 0) {
      currentNodeErrors.materials = materialErrorsMap;
    }

    if (Object.keys(currentNodeErrors).length > 0) {
      nodeErrors[node.tempId] = currentNodeErrors;
    }
  });

  applyDuplicateNameErrors(nodeNameGroups, (nodeTempId) => {
    nodeErrors[nodeTempId] = {
      ...(nodeErrors[nodeTempId] ?? {}),
      NodeName: 'Tên bài học bị trùng.',
    };
  });

  if (Object.keys(nodeErrors).length > 0) {
    errors.nodes = nodeErrors;
  }

  if (isPathActive(path) && !chapterCanPublish(path)) {
    errors._publish = getChapterPublishBlockReason(path);
  }

  return errors;
}

export function stripNonLearningMaterials(paths) {
  return withNormalizedOrders(paths).map((path) => ({
    ...path,
    nodes: (path.nodes ?? []).map((node) => ({
      ...node,
      materials: filterLearningMaterials(node.materials ?? node.Materials),
    })),
  }));
}

export function sanitizePathsForStorage(paths) {
  return stripNonLearningMaterials(paths).map((path) => ({
    ...path,
    nodes: (path.nodes ?? []).map((node) => ({
      ...node,
      materials: (node.materials ?? []).map(({ File: _file, ...material }) => material),
    })),
  }));
}

let tempIdCounter = 0;

export function createTempId(prefix = 'tmp') {
  tempIdCounter += 1;
  return `${prefix}_${Date.now()}_${tempIdCounter}`;
}

export function toPathIsActiveValue(value, defaultValue = 1) {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  return defaultValue;
}

export function isNewUnsavedPath(path = {}) {
  return path.PathId == null;
}

export function isNewUnsavedNode(node = {}) {
  return node.NodeId == null;
}

export function isNewUnsavedMaterial(material = {}) {
  return !getMaterialPersistentId(material);
}

/** Bài học có học liệu mới chưa lưu DB. */
export function nodeHasNewUnsavedMaterials(node = {}) {
  return filterLearningMaterials(getNodeMaterials(node)).some(isNewUnsavedMaterial);
}

export function removeMaterialFromPath(paths, pathTempId, nodeTempId, materialTempId) {
  return withNormalizedOrders(
    (paths ?? []).map((path) => {
      if (path.tempId !== pathTempId) return path;
      return {
        ...path,
        nodes: (path.nodes ?? path.Nodes ?? []).map((node) => {
          if (node.tempId !== nodeTempId) return node;
          return {
            ...node,
            materials: filterLearningMaterials(node.materials ?? node.Materials ?? [])
              .filter((material) => material.tempId !== materialTempId),
          };
        }),
      };
    }),
  );
}

export function removeNodeFromPath(paths, pathTempId, nodeTempId) {
  return withNormalizedOrders(
    (paths ?? []).map((path) => {
      if (path.tempId !== pathTempId) return path;
      return {
        ...path,
        nodes: (path.nodes ?? path.Nodes ?? []).filter((node) => node.tempId !== nodeTempId),
      };
    }),
  );
}

export function removePathFromList(paths, pathTempId) {
  return withNormalizedOrders((paths ?? []).filter((path) => path.tempId !== pathTempId));
}

export function isPathActive(path = {}) {
  return toPathIsActiveValue(path.IsActive ?? path.isActive, 1) === 1;
}

export function isNodeActive(node = {}) {
  return toPathIsActiveValue(node.IsActive ?? node.isActive, 1) === 1;
}

export function createEmptyPath() {
  return {
    tempId: createTempId('path'),
    PathName: '',
    Description: '',
    IsActive: 0,
    nodes: [],
  };
}

/** PathId từ server, hoặc thứ tự chương (1-based) khi chưa lưu. */
export function resolveChapterId(path, pathIndex = 0) {
  return path?.PathId ?? pathIndex + 1;
}

export function createEmptyNode() {
  return {
    tempId: createTempId('node'),
    NodeName: '',
    NodeOrder: 1,
    Description: '',
    IsActive: 0,
    materials: [],
  };
}

export function createEmptyMaterial() {
  return {
    tempId: createTempId('material'),
    MaterialId: null,
    MaterialType: 'VIDEO',
    Title: '',
    Content: '',
    MaterialOrder: 1,
    ...getVideoDefaultFields(),
  };
}

export function isSimpleUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function withNormalizedOrders(paths) {
  return (paths ?? []).map((path) => {
    const rawNodes = path.nodes ?? path.Nodes ?? [];
    const normalizedNodes = rawNodes.map((node, nodeIndex) => {
      const rawMaterials = node.materials ?? node.Materials ?? [];
      const { Materials: _materials, ...nodeRest } = node;
      return {
        ...nodeRest,
        NodeOrder: nodeIndex + 1,
        materials: filterLearningMaterials(rawMaterials).map((material, materialIndex) => ({
          ...material,
          MaterialOrder: materialIndex + 1,
        })),
      };
    });
    const { Nodes: _nodes, ...pathRest } = path;
    return {
      ...pathRest,
      nodes: normalizedNodes,
    };
  });
}

export function reorderMaterials(materials, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= materials.length ||
    toIndex >= materials.length
  ) {
    return materials;
  }
  const next = [...materials];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function countContentStats(paths) {
  const normalized = withNormalizedOrders(paths);
  const pathCount = normalized.length;
  const nodeCount = normalized.reduce((sum, path) => sum + (path.nodes?.length ?? 0), 0);
  const materialCount = normalized.reduce(
    (sum, path) =>
      sum +
      (path.nodes ?? []).reduce(
        (nodeSum, node) => nodeSum + countLearningMaterials(node.materials),
        0,
      ),
    0,
  );

  return { pathCount, nodeCount, materialCount };
}

export function validateCourseContent(paths, options = {}) {
  const errors = { root: [], paths: {} };
  const normalized = withNormalizedOrders(paths);

  if (normalized.length === 0) {
    errors.root.push('Cần ít nhất 1 chương.');
    return errors;
  }

  normalized.forEach((path) => {
    const pathErrors = { nodes: {} };

    if (!String(path.PathName ?? '').trim()) {
      pathErrors.PathName = 'Vui lòng nhập tên chương.';
    }

    if ((path.nodes ?? []).length === 0) {
      pathErrors._nodes = 'Mỗi chương cần ít nhất 1 bài học.';
    }

    (path.nodes ?? []).forEach((node) => {
      const nodeErrors = { materials: {} };

      if (!String(node.NodeName ?? node.nodeName ?? '').trim()) {
        nodeErrors.NodeName = 'Vui lòng nhập tên bài học.';
      }

      if (countLearningMaterials(node.materials ?? node.Materials ?? []) === 0) {
        nodeErrors._materials = 'Mỗi bài học cần ít nhất 1 học liệu.';
      }

      (node.materials ?? []).forEach((material) => {
        if (!isLearningMaterial(material)) return;

        const materialErrors = {};

        if (!material.MaterialType) {
          materialErrors.MaterialType = 'Vui lòng chọn loại học liệu.';
        }

        if (material.MaterialType === 'TEXT') {
          const hasContent = !isHtmlContentEmpty(material.Content);
          const hasUploadedUrl = Boolean(String(material.MaterialUrl ?? '').trim());
          if (!hasContent && !hasUploadedUrl) {
            materialErrors.Content = 'Vui lòng nhập nội dung văn bản';
          } else if (
            hasContent
            && new Blob([String(material.Content ?? '')]).size > TEXT_MAX_BYTES
          ) {
            materialErrors.Content = `Nội dung văn bản quá lớn. Dung lượng tối đa là ${getMaterialMaxFileSizeLabel()}.`;
          }
        } else if (material.MaterialType === 'DOC') {
          if (!String(material.Title ?? '').trim()) {
            materialErrors.Title = 'Vui lòng nhập tiêu đề tài liệu';
          }

          const sourceType = resolveDocSourceType(material);

          if (sourceType === DOC_SOURCE_UPLOAD) {
            const hasUrl = Boolean(String(material.MaterialUrl ?? '').trim());
            if (!hasUrl) {
              materialErrors.File = material.File
                ? 'Đang tải file lên, vui lòng đợi hoàn tất.'
                : 'Vui lòng chọn file tài liệu';
            }
          } else {
            const materialUrl = String(material.MaterialUrl ?? '').trim();
            if (!materialUrl || !isSimpleUrl(materialUrl)) {
              materialErrors.MaterialUrl = 'Vui lòng nhập link tài liệu hợp lệ';
            }
          }
        } else if (material.MaterialType === 'VIDEO') {
          if (!String(material.Title ?? '').trim()) {
            materialErrors.Title = 'Vui lòng nhập tiêu đề học liệu.';
          }

          const sourceType = resolveVideoSourceType(material);

          if (sourceType === VIDEO_SOURCE_UPLOAD) {
            const hasUrl = Boolean(String(material.MaterialUrl ?? '').trim());
            if (!hasUrl) {
              materialErrors.File = material.File
                ? 'Đang tải video lên, vui lòng đợi hoàn tất.'
                : 'Vui lòng chọn file video';
            }
          } else {
            const materialUrl = String(material.MaterialUrl ?? '').trim();
            if (!materialUrl) {
              materialErrors.MaterialUrl = 'Vui lòng nhập link video';
            } else if (!isSimpleUrl(materialUrl)) {
              materialErrors.MaterialUrl = 'Link không hợp lệ. Vui lòng dùng http:// hoặc https://';
            }
          }
        } else {
          if (!String(material.Title ?? '').trim()) {
            materialErrors.Title = 'Vui lòng nhập tiêu đề học liệu.';
          }

          const materialUrl = String(material.MaterialUrl ?? '').trim();
          if (materialUrl && !isSimpleUrl(materialUrl)) {
            materialErrors.MaterialUrl = 'Link không hợp lệ. Vui lòng dùng http:// hoặc https://';
          }
        }

        if (Object.keys(materialErrors).length > 0) {
          nodeErrors.materials[material.tempId] = materialErrors;
        }
      });

      if (Object.keys(nodeErrors.materials).length > 0 || nodeErrors.NodeName || nodeErrors._materials) {
        pathErrors.nodes[node.tempId] = nodeErrors;
      }
    });

    if (
      pathErrors.PathName ||
      pathErrors._nodes ||
      Object.keys(pathErrors.nodes).length > 0
    ) {
      errors.paths[path.tempId] = pathErrors;
    }
  });

  // Trùng tên chương trong khóa học
  const chapterNameGroups = new Map();
  normalized.forEach((path) => {
    const key = normalizeUniqueNameKey(path.PathName);
    if (!key) return;
    if (!chapterNameGroups.has(key)) chapterNameGroups.set(key, []);
    chapterNameGroups.get(key).push(path.tempId);
  });
  applyDuplicateNameErrors(chapterNameGroups, (pathTempId) => {
    if (!errors.paths[pathTempId]) errors.paths[pathTempId] = { nodes: {} };
    errors.paths[pathTempId].PathName = 'Tên chương bị trùng.';
  });

  // Trùng tên bài học trong từng chương + trùng tiêu đề học liệu trong từng bài
  normalized.forEach((path) => {
    const nodes = path.nodes ?? [];
    const nodeNameGroups = new Map();
    nodes.forEach((node) => {
      const key = normalizeUniqueNameKey(node.NodeName ?? node.nodeName);
      if (!key) return;
      if (!nodeNameGroups.has(key)) nodeNameGroups.set(key, []);
      nodeNameGroups.get(key).push(node.tempId);
    });

    applyDuplicateNameErrors(nodeNameGroups, (nodeTempId) => {
      if (!errors.paths[path.tempId]) errors.paths[path.tempId] = { nodes: {} };
      const pathErrors = errors.paths[path.tempId];
      if (!pathErrors.nodes) pathErrors.nodes = {};
      pathErrors.nodes[nodeTempId] = {
        ...(pathErrors.nodes[nodeTempId] ?? {}),
        materials: pathErrors.nodes[nodeTempId]?.materials ?? {},
        NodeName: 'Tên bài học bị trùng.',
      };
    });

    nodes.forEach((node) => {
      applyDuplicateNameErrors(buildMaterialDuplicateTitleGroups(node.materials ?? node.Materials ?? []), (materialTempId) => {
        if (!errors.paths[path.tempId]) errors.paths[path.tempId] = { nodes: {} };
        const pathErrors = errors.paths[path.tempId];
        if (!pathErrors.nodes) pathErrors.nodes = {};
        if (!pathErrors.nodes[node.tempId]) {
          pathErrors.nodes[node.tempId] = { materials: {} };
        }
        if (!pathErrors.nodes[node.tempId].materials) {
          pathErrors.nodes[node.tempId].materials = {};
        }
        pathErrors.nodes[node.tempId].materials[materialTempId] = {
          ...(pathErrors.nodes[node.tempId].materials[materialTempId] ?? {}),
          Title: 'Tiêu đề học liệu bị trùng với học liệu cùng loại.',
        };
      });
    });
  });

  return errors;
}

export function hasContentValidationErrors(errors) {
  if ((errors.root ?? []).length > 0) return true;
  return Object.keys(errors.paths ?? {}).length > 0;
}

export function getPathContentValidationToast(errors = {}, pathTempId, paths = []) {
  if ((errors.root ?? []).length > 0) return errors.root[0];

  const path = paths.find((item) => item.tempId === pathTempId);
  const pathErrors = errors.paths?.[pathTempId];
  if (!path || !pathErrors) return null;

  if (pathErrors.PathName) return pathErrors.PathName;
  if (pathErrors._nodes) return pathErrors._nodes;

  for (const node of path.nodes ?? []) {
    const nodeErrors = pathErrors.nodes?.[node.tempId];
    if (!nodeErrors) continue;
    if (nodeErrors.NodeName) return nodeErrors.NodeName;
    if (nodeErrors._materials) return nodeErrors._materials;

    for (const material of node.materials ?? []) {
      const materialErrors = nodeErrors.materials?.[material.tempId];
      if (!materialErrors) continue;
      const firstMessage = Object.values(materialErrors).find(Boolean);
      if (firstMessage) return firstMessage;
    }
  }

  return null;
}

/** Toast lỗi đầu tiên theo thứ tự validate toàn bộ khóa học. */
export function getFirstContentValidationToast(errors = {}, paths = []) {
  if ((errors.root ?? []).length > 0) return errors.root[0];

  for (const path of paths) {
    const toast = getPathContentValidationToast(errors, path.tempId, paths);
    if (toast) return toast;
  }

  return null;
}

export function hasOtherUnsavedPaths(pathTempId, paths = [], savedPathSnapshots = {}) {
  return paths.some(
    (path) => path.tempId !== pathTempId
      && !isPathSnapshotSaved(path, savedPathSnapshots[path.tempId]),
  );
}

export function getFirstContentErrorTarget(errors, paths = []) {
  if ((errors.root ?? []).length > 0) return 'content-builder-root';

  for (const path of paths) {
    const pathErrors = errors.paths?.[path.tempId];
    if (!pathErrors) continue;

    if (pathErrors.PathName || pathErrors._nodes) {
      return `chapter-${path.tempId}`;
    }

    for (const node of path.nodes ?? []) {
      const nodeErrors = pathErrors.nodes?.[node.tempId];
      if (!nodeErrors) continue;

      if (nodeErrors.NodeName || nodeErrors._materials) return `lesson-${node.tempId}`;

      for (const material of node.materials ?? []) {
        if (nodeErrors.materials?.[material.tempId]) {
          return `material-${material.tempId}`;
        }
      }
    }
  }

  return null;
}

export function parseContentFocusTarget(errorTarget, paths = []) {
  if (!errorTarget || typeof errorTarget !== 'string') return null;

  if (errorTarget.startsWith('chapter-')) {
    return { type: 'chapter', pathTempId: errorTarget.slice('chapter-'.length) };
  }

  if (errorTarget.startsWith('lesson-')) {
    const nodeTempId = errorTarget.slice('lesson-'.length);
    const path = paths.find((p) =>
      (p.nodes ?? p.Nodes ?? []).some((n) => n.tempId === nodeTempId),
    );
    return { type: 'lesson', pathTempId: path?.tempId, nodeTempId };
  }

  if (errorTarget.startsWith('material-')) {
    const materialTempId = errorTarget.slice('material-'.length);
    for (const path of paths) {
      for (const node of path.nodes ?? path.Nodes ?? []) {
        const material = (node.materials ?? node.Materials ?? []).find(
          (m) => m.tempId === materialTempId,
        );
        if (material) {
          return {
            type: 'material',
            pathTempId: path.tempId,
            nodeTempId: node.tempId,
            materialTempId,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Build DOM selector for a content builder item (chapter / lesson / material).
 */
export function getContentItemScrollSelector(target) {
  if (!target?.type) return null;

  if (target.type === 'chapter' && target.pathTempId) {
    return `[data-content-error="chapter-${target.pathTempId}"]`;
  }
  if (target.type === 'lesson' && target.nodeTempId) {
    return `[data-content-error="lesson-${target.nodeTempId}"]`;
  }
  if (target.type === 'material' && target.materialTempId) {
    return `[data-content-error="material-${target.materialTempId}"]`;
  }

  return null;
}

/**
 * Expand parent sections if needed, then scroll to a content builder item.
 */
export function scrollToContentItem(
  target,
  { setExpandedPaths, setExpandedNodes, delayMs = 180 } = {},
) {
  if (target.pathTempId && setExpandedPaths) {
    setExpandedPaths((prev) => ({ ...prev, [target.pathTempId]: true }));
  }
  if (target.nodeTempId && setExpandedNodes) {
    setExpandedNodes((prev) => ({ ...prev, [target.nodeTempId]: true }));
  }

  const selector = getContentItemScrollSelector(target);
  if (!selector) return;

  window.setTimeout(() => {
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, delayMs);
}

export function buildCourseContentPayload(paths) {
  return {
    paths: withNormalizedOrders(paths).map(({ tempId: _tempId, nodes, ...path }, index) => ({
      PathName: String(path.PathName ?? '').trim(),
      Description: trimShortDescription(path.Description),
      PathOrder: Number(index + 1),
      IsActive: toPathIsActiveValue(path.IsActive ?? path.isActive, 1),
      nodes: (nodes ?? []).map(({ tempId: _nodeTempId, materials, ...node }) => ({
        NodeName: String(node.NodeName ?? node.nodeName ?? '').trim(),
        NodeOrder: node.NodeOrder,
        Description: trimShortDescription(node.Description),
        IsActive: toPathIsActiveValue(node.IsActive ?? node.isActive, 1),
        materials: filterLearningMaterials(materials ?? []).map(
          ({
            tempId: _materialTempId,
            Content,
            File,
            EstimatedMinutes: _estimatedMinutes,
            ...material
          }) => {
            const base = {
              MaterialType: material.MaterialType,
              Title: String(material.Title ?? '').trim(),
              MaterialOrder: material.MaterialOrder,
            };

            if (material.MaterialType === 'TEXT') {
              return {
                ...base,
                SourceType: material.SourceType ?? 'UPLOAD',
                MaterialUrl: String(material.MaterialUrl ?? '').trim() || null,
                FileName: material.FileName ?? null,
                FileSize: material.FileSize ?? null,
              };
            }

            if (material.MaterialType === 'DOC') {
              const sourceType = resolveDocSourceType(material);

              return {
                ...base,
                SourceType: sourceType,
                MaterialUrl: String(material.MaterialUrl ?? '').trim() || null,
                FileName: material.FileName ?? null,
                FileSize: material.FileSize ?? null,
              };
            }

            if (material.MaterialType === 'VIDEO') {
              const sourceType = resolveVideoSourceType(material);

              return {
                ...base,
                SourceType: sourceType,
                MaterialUrl: String(material.MaterialUrl ?? '').trim() || null,
                FileName: material.FileName ?? null,
                FileSize: material.FileSize ?? null,
              };
            }

            return {
              ...base,
              MaterialUrl: String(material.MaterialUrl ?? '').trim() || null,
            };
          }),
      })),
    })),
  };
}

export function buildFullCreateCoursePayload(course, paths) {
  return {
    course,
    ...buildCourseContentPayload(paths),
  };
}
