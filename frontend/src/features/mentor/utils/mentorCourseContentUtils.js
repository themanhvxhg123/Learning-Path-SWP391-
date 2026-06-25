// TODO: update backend/DB MaterialType to support TEXT
import { resolveVideoEmbed } from '@/shared/utils/videoEmbedUtils';
import { getTestDefaultFields } from './mentorTestContentUtils';

export { getTestDefaultFields } from './mentorTestContentUtils';

export const MATERIAL_TYPES = ['VIDEO', 'TEXT', 'DOC'];

/** Học liệu thực tế trong bài học — không gồm bài kiểm tra (quản lý riêng qua ngân hàng câu hỏi). */
export const LEARNING_MATERIAL_TYPES = MATERIAL_TYPES;

export function normalizeMaterialType(type) {
  return String(type ?? '').trim().toUpperCase();
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
    EmbedUrl: material.EmbedUrl ?? material.embedUrl ?? null,
    MaterialId: material.MaterialId ?? material.materialId ?? null,
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
export const VIDEO_SOURCE_LINK = 'LINK';

export function getVideoDefaultFields() {
  return {
    SourceType: VIDEO_SOURCE_LINK,
    MaterialUrl: '',
    EmbedUrl: null,
  };
}

export const DOC_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];

/** Khớp giới hạn Cloudinary free tier. */
export const DOC_MAX_BYTES = 10 * 1024 * 1024;
export const TEXT_MAX_BYTES = DOC_MAX_BYTES;

export function getMaterialMaxFileSizeLabel() {
  return '10 MB';
}

export function isAllowedDocFile(file) {
  if (!file?.name) return false;
  const lower = file.name.toLowerCase();
  return DOC_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function validateDocFile(file) {
  if (!file) {
    return { ok: false, message: 'Vui lòng chọn file tài liệu.' };
  }
  if (!isAllowedDocFile(file)) {
    return { ok: false, message: 'Chỉ hỗ trợ PDF, DOC, DOCX, PPT, PPTX.' };
  }
  if (file.size > DOC_MAX_BYTES) {
    return {
      ok: false,
      message: `File quá lớn. Dung lượng tối đa là ${getMaterialMaxFileSizeLabel()}.`,
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
  if (lower.endsWith('.ppt')) return 'PPT';
  if (lower.endsWith('.pptx')) return 'PPTX';
  return 'Tài liệu';
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
  return JSON.stringify(normalized);
}

export function isPathSnapshotSaved(path, savedSnapshot) {
  if (!savedSnapshot) return false;
  return serializePathSnapshot(path) === savedSnapshot;
}

export function validatePathForSave(path) {
  if (!String(path.PathName ?? '').trim()) {
    return { PathName: 'Vui lòng nhập tên chương trước khi lưu.' };
  }
  return {};
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

export function createEmptyPath() {
  return {
    tempId: createTempId('path'),
    PathName: '',
    Description: '',
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
    materials: [],
  };
}

export function createEmptyMaterial() {
  return {
    tempId: createTempId('material'),
    MaterialType: 'VIDEO',
    Title: '',
    MaterialUrl: '',
    Content: '',
    MaterialOrder: 1,
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

      if (!String(node.NodeName ?? '').trim()) {
        nodeErrors.NodeName = 'Vui lòng nhập tên bài học.';
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

          const sourceType =
            material.SourceType === DOC_SOURCE_LINK ? DOC_SOURCE_LINK : DOC_SOURCE_UPLOAD;

          if (sourceType === DOC_SOURCE_UPLOAD) {
            const hasFile = Boolean(material.File);
            const hasUrl = Boolean(String(material.MaterialUrl ?? '').trim());
            if (!hasFile && !hasUrl) {
              materialErrors.File = 'Vui lòng chọn file tài liệu';
            } else if (hasFile) {
              const fileCheck = validateDocFile(material.File);
              if (!fileCheck.ok) {
                materialErrors.File = fileCheck.message;
              }
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

          const materialUrl = String(material.MaterialUrl ?? '').trim();
          if (materialUrl && !isSimpleUrl(materialUrl)) {
            materialErrors.MaterialUrl = 'Link không hợp lệ. Vui lòng dùng http:// hoặc https://';
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

      if (Object.keys(nodeErrors.materials).length > 0 || nodeErrors.NodeName) {
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

  return errors;
}

export function hasContentValidationErrors(errors) {
  if ((errors.root ?? []).length > 0) return true;
  return Object.keys(errors.paths ?? {}).length > 0;
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

      if (nodeErrors.NodeName) return `lesson-${node.tempId}`;

      for (const material of node.materials ?? []) {
        if (nodeErrors.materials?.[material.tempId]) {
          return `material-${material.tempId}`;
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
      nodes: (nodes ?? []).map(({ tempId: _nodeTempId, materials, ...node }) => ({
        NodeName: String(node.NodeName ?? '').trim(),
        NodeOrder: node.NodeOrder,
        Description: trimShortDescription(node.Description),
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
              const sourceType =
                material.SourceType === DOC_SOURCE_LINK ? DOC_SOURCE_LINK : DOC_SOURCE_UPLOAD;

              return {
                ...base,
                SourceType: sourceType,
                MaterialUrl: String(material.MaterialUrl ?? '').trim() || null,
                FileName: material.FileName ?? null,
                FileSize: material.FileSize ?? null,
              };
            }

            if (material.MaterialType === 'VIDEO') {
              const materialUrl = String(material.MaterialUrl ?? '').trim() || null;
              const { embedUrl } = resolveVideoEmbed(materialUrl ?? '');
              // TODO: backend should support EmbedUrl for VIDEO material
              return {
                ...base,
                SourceType: VIDEO_SOURCE_LINK,
                MaterialUrl: materialUrl,
                EmbedUrl: embedUrl,
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
