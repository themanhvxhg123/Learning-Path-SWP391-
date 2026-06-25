import {
  buildFullCreateCoursePayload,
  countContentStats,
  countMaterialsInPath,
  DOC_SOURCE_LINK,
  DOC_SOURCE_UPLOAD,
  extractPlainTextFromHtml,
  filterLearningMaterials,
  formatFileSize,
  getDocFileTypeLabel,
  getNodeMaterials,
  getPathNodes,
  isHtmlContentEmpty,
  isLearningMaterial,
  MATERIAL_TYPE_LABELS,
  normalizeMaterialForDisplay,
  validateCourseContent,
  withNormalizedOrders,
} from './mentorCourseContentUtils';
import { validateMentorCourseForm } from './mentorCourseFormUtils';
import {
  computeMaterialTestSummary,
  DEFAULT_TEST_TOTAL_SCORE,
  getEffectiveScoringMode,
  SCORING_MODE_MANUAL,
} from './mentorTestContentUtils';

export { MATERIAL_TYPE_LABELS, countMaterialsInPath };

function stripHtmlContent(html) {
  return extractPlainTextFromHtml(html);
}

function truncatePreview(text, max = 80) {
  const value = String(text ?? '').trim();
  if (!value) return '';
  if (value.length <= max) return value;

  const slice = value.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const truncated = lastSpace > max * 0.55 ? slice.slice(0, lastSpace) : slice;
  return `${truncated.trim()}...`;
}

function resolveDocSourceType(material) {
  if (material.SourceType === DOC_SOURCE_LINK) return DOC_SOURCE_LINK;
  if (material.SourceType === DOC_SOURCE_UPLOAD) return DOC_SOURCE_UPLOAD;
  if (material.FileName || material.FileSize || material.File) return DOC_SOURCE_UPLOAD;
  return DOC_SOURCE_UPLOAD;
}

function getTextMaterialPreview(material, max = 80) {
  const plainText = stripHtmlContent(material.Content);
  if (plainText) {
    if (plainText.length <= max) return plainText;
    return truncatePreview(plainText, max);
  }

  const fileName = String(material.FileName ?? '').trim();
  if (fileName) return `File: ${fileName}`;

  const url = String(material.MaterialUrl ?? '').trim();
  if (url) return `Link: ${truncatePreview(url, 120)}`;

  return 'Chưa có nội dung';
}

export const REVIEW_OUTLINE_TYPE_LABELS = { ...MATERIAL_TYPE_LABELS };

function resolveMaterialLinkLabel(material, typeLabel = 'Học liệu') {
  const fileName = String(material.FileName ?? '').trim();
  if (fileName) return fileName;

  const title = String(material.Title ?? '').trim();
  if (title) return title;

  return typeLabel;
}

/** Chi tiết học liệu cho outline tab Nội dung — link hiển thị FileName/Title thay vì URL. */
export function getMaterialOutlineDetail(material) {
  const normalized = normalizeMaterialForDisplay(material);
  if (!normalized.MaterialType) return null;

  const typeLabel = REVIEW_OUTLINE_TYPE_LABELS[normalized.MaterialType] ?? 'Học liệu';
  const url = String(normalized.MaterialUrl ?? '').trim();
  const linkLabel = resolveMaterialLinkLabel(normalized, typeLabel);

  switch (normalized.MaterialType) {
    case 'VIDEO': {
      if (url) return { type: 'link', href: url, label: linkLabel };
      if (String(normalized.EmbedUrl ?? '').trim()) {
        return { type: 'text', text: 'Nguồn: Mã nhúng video' };
      }
      return { type: 'text', text: 'Chưa có link hoặc mã nhúng' };
    }
    case 'TEXT': {
      const plainText = stripHtmlContent(normalized.Content);
      if (plainText) {
        const preview = plainText.length <= 80 ? plainText : truncatePreview(plainText, 80);
        return { type: 'text', text: preview };
      }
      if (url) return { type: 'link', href: url, label: linkLabel };
      return { type: 'text', text: 'Chưa có nội dung' };
    }
    case 'DOC': {
      if (url) return { type: 'link', href: url, label: linkLabel };

      const fileName = String(normalized.FileName ?? '').trim();
      if (fileName) {
        const docTypeLabel = getDocFileTypeLabel(fileName);
        const sizeLabel = normalized.FileSize
          ? formatFileSize(normalized.FileSize)
          : null;
        return {
          type: 'text',
          text: sizeLabel ? `${docTypeLabel} · ${fileName} · ${sizeLabel}` : `${docTypeLabel} · ${fileName}`,
        };
      }
      return { type: 'text', text: 'Chưa có file tài liệu' };
    }
    default:
      return null;
  }
}

export function getMaterialReviewDetailSummary(material) {
  const normalized = normalizeMaterialForDisplay(material);
  if (!normalized.MaterialType) return '';

  switch (normalized.MaterialType) {
    case 'VIDEO': {
      const hasUrl = Boolean(String(normalized.MaterialUrl ?? '').trim());
      const hasEmbed = Boolean(String(normalized.EmbedUrl ?? '').trim());
      if (hasUrl) return `Link: ${truncatePreview(normalized.MaterialUrl, 120)}`;
      if (hasEmbed) return 'Nguồn: Mã nhúng video';
      return 'Chưa có link hoặc mã nhúng';
    }
    case 'TEXT': {
      return getTextMaterialPreview(normalized);
    }
    case 'DOC': {
      const sourceType = resolveDocSourceType(normalized);
      if (sourceType === DOC_SOURCE_LINK) {
        const link = String(normalized.MaterialUrl ?? '').trim();
        return link ? `Link: ${truncatePreview(link, 120)}` : 'Chưa có link tài liệu';
      }
      const fileName = normalized.FileName || normalized.File?.name;
      if (!fileName) return 'Chưa có file tài liệu';
      const typeLabel = getDocFileTypeLabel(fileName);
      const sizeLabel = normalized.FileSize || normalized.File?.size
        ? formatFileSize(normalized.FileSize ?? normalized.File?.size)
        : null;
      return sizeLabel ? `${typeLabel} · ${fileName} · ${sizeLabel}` : `${typeLabel} · ${fileName}`;
    }
    case 'TEST': {
      if (normalized.QuestionBankTitle) {
        const summary = computeMaterialTestSummary(normalized.Sections ?? []);
        const scoringLabel =
          getEffectiveScoringMode(normalized) === SCORING_MODE_MANUAL
            ? 'Chấm tay'
            : 'Tự động';
        return `Ngân hàng: ${normalized.QuestionBankTitle} · ${summary.questionCount} câu · ${scoringLabel}`;
      }
      const summary = computeMaterialTestSummary(normalized.Sections ?? []);
      const scoringLabel =
        getEffectiveScoringMode(normalized) === SCORING_MODE_MANUAL
          ? 'Nhập điểm thủ công'
          : 'Tự chia đều';
      return `${summary.sectionCount} phần · ${summary.questionCount} câu hỏi · ${DEFAULT_TEST_TOTAL_SCORE} điểm · ${scoringLabel}`;
    }
    default:
      return '';
  }
}

export function countChapters(paths = []) {
  return (paths ?? []).length;
}

export function countLessons(paths = []) {
  return (paths ?? []).reduce((sum, path) => sum + getPathNodes(path).length, 0);
}

export function countMaterials(paths = []) {
  return countContentStats(paths).materialCount;
}

export function countMaterialsByType(paths = []) {
  const counts = { VIDEO: 0, TEXT: 0, DOC: 0 };

  (paths ?? []).forEach((path) => {
    getPathNodes(path).forEach((node) => {
      filterLearningMaterials(getNodeMaterials(node)).forEach((material) => {
        const type = material.MaterialType;
        if (type in counts) counts[type] += 1;
      });
    });
  });

  return counts;
}

export function countTests(paths = []) {
  return countMaterialsByType(paths).TEST;
}

export function countTestQuestions(paths = []) {
  let total = 0;

  (paths ?? []).forEach((path) => {
    getPathNodes(path).forEach((node) => {
      getNodeMaterials(node).forEach((material) => {
        if (material.MaterialType !== 'TEST') return;
        const summary = computeMaterialTestSummary(material.Sections ?? []);
        total += summary.questionCount;
      });
    });
  });

  return total;
}

function buildMaterialReviewItem(path, pathIndex, node, nodeIndex, material, type, index) {
  return {
    tempId: material.tempId,
    title: String(material.Title ?? '').trim() || `${MATERIAL_TYPE_LABELS[type]} ${index}`,
    chapterLabel: path.PathName || `Chương ${pathIndex + 1}`,
    lessonLabel: node.NodeName || `Bài ${nodeIndex + 1}`,
  };
}

function collectMaterialsByType(paths = [], materialType, mapDetail) {
  const items = [];

  (paths ?? []).forEach((path, pathIndex) => {
    getPathNodes(path).forEach((node, nodeIndex) => {
      getNodeMaterials(node).forEach((material) => {
        if (material.MaterialType !== materialType) return;
        items.push({
          ...buildMaterialReviewItem(
            path,
            pathIndex,
            node,
            nodeIndex,
            material,
            materialType,
            items.length + 1,
          ),
          summary: mapDetail(material),
        });
      });
    });
  });

  return items;
}

export function collectVideoMaterials(paths = []) {
  return collectMaterialsByType(paths, 'VIDEO', (material) => {
    const hasUrl = Boolean(String(material.MaterialUrl ?? '').trim());
    const hasEmbed = Boolean(String(material.EmbedUrl ?? '').trim());

    if (hasUrl) return `Link: ${truncatePreview(material.MaterialUrl, 120)}`;
    if (hasEmbed) return 'Nguồn: Mã nhúng video';
    return 'Chưa có link hoặc mã nhúng';
  });
}

export function collectTextMaterials(paths = []) {
  return collectMaterialsByType(paths, 'TEXT', (material) => getTextMaterialPreview(material, 80));
}

export function collectDocMaterials(paths = []) {
  return collectMaterialsByType(paths, 'DOC', (material) => {
    const sourceType = resolveDocSourceType(material);

    if (sourceType === DOC_SOURCE_LINK) {
      const link = String(material.MaterialUrl ?? '').trim();
      return link ? `Link: ${truncatePreview(link, 120)}` : 'Chưa có link tài liệu';
    }

    const fileName = material.FileName || material.File?.name;
    if (!fileName) return 'Chưa có file tài liệu';

    const typeLabel = getDocFileTypeLabel(fileName);
    const sizeLabel = material.FileSize || material.File?.size
      ? formatFileSize(material.FileSize ?? material.File?.size)
      : null;

    return sizeLabel ? `${typeLabel} · ${fileName} · ${sizeLabel}` : `${typeLabel} · ${fileName}`;
  });
}

export function collectTestMaterials(paths = []) {
  const items = [];

  (paths ?? []).forEach((path, pathIndex) => {
    (path.nodes ?? []).forEach((node, nodeIndex) => {
      (node.materials ?? []).forEach((material) => {
        if (material.MaterialType !== 'TEST') return;
        const summary = computeMaterialTestSummary(material.Sections ?? []);
        items.push({
          tempId: material.tempId,
          title: String(material.Title ?? '').trim() || `Bài kiểm tra ${items.length + 1}`,
          chapterLabel: path.PathName || `Chương ${pathIndex + 1}`,
          lessonLabel: node.NodeName || `Bài ${nodeIndex + 1}`,
          sectionCount: summary.sectionCount,
          questionCount: summary.questionCount,
          totalScore: DEFAULT_TEST_TOTAL_SCORE,
          scoringMode: getEffectiveScoringMode(material),
        });
      });
    });
  });

  return items;
}

function hasTextContent(html) {
  return !isHtmlContentEmpty(html);
}

function isCourseBasicComplete(course) {
  const name = String(course?.CourseName ?? '').trim();
  return name.length >= 3 && Boolean(course?.CategoryId) && Boolean(course?.LevelId);
}

function flattenContentErrors(paths, contentErrors) {
  const errors = [];

  (contentErrors.root ?? []).forEach((message) => {
    errors.push({ type: 'chapter', message, targetId: 'content-root' });
  });

  paths.forEach((path, pathIndex) => {
    const pathErrors = contentErrors.paths?.[path.tempId];
    if (!pathErrors) return;

    const chapterLabel = path.PathName || `Chương ${pathIndex + 1}`;

    if (pathErrors.PathName) {
      errors.push({
        type: 'chapter',
        message: `${chapterLabel}: ${pathErrors.PathName}`,
        targetId: path.tempId,
      });
    }

    if (pathErrors._nodes) {
      errors.push({
        type: 'chapter',
        message: `${chapterLabel}: ${pathErrors._nodes}`,
        targetId: path.tempId,
      });
    }

    (path.nodes ?? []).forEach((node, nodeIndex) => {
      const nodeErrors = pathErrors.nodes?.[node.tempId];
      if (!nodeErrors) return;

      const lessonLabel = node.NodeName || `Bài ${nodeIndex + 1}`;

      if (nodeErrors.NodeName) {
        errors.push({
          type: 'lesson',
          message: `${chapterLabel} — ${lessonLabel}: ${nodeErrors.NodeName}`,
          targetId: node.tempId,
        });
      }

      (node.materials ?? []).forEach((material) => {
        if (!isLearningMaterial(material)) return;

        const materialErrors = nodeErrors.materials?.[material.tempId];
        if (!materialErrors) return;

        const typeLabel = MATERIAL_TYPE_LABELS[material.MaterialType] ?? 'Học liệu';
        const materialLabel = material.Title || typeLabel;

        Object.entries(materialErrors).forEach(([key, value]) => {
          if (key.startsWith('_')) {
            errors.push({
              type: 'material',
              message: `${materialLabel}: ${value}`,
              targetId: material.tempId,
            });
            return;
          }

          if (typeof value === 'string') {
            errors.push({
              type: 'material',
              message: `${materialLabel}: ${value}`,
              targetId: material.tempId,
            });
          }
        });
      });
    });
  });

  return errors;
}

export function validateCourseDraft(draft) {
  const course = draft?.course ?? {};
  const paths = withNormalizedOrders(draft?.paths ?? []);
  const errors = [];
  const warnings = [];

  const formErrors = validateMentorCourseForm({
    CourseName: course.CourseName ?? '',
    Description: course.Description ?? '',
    CategoryId: course.CategoryId ?? '',
    LevelId: course.LevelId ?? '',
    Thumbnail: course.Thumbnail ?? '',
    IsPublished: course.IsPublished,
  });

  Object.entries(formErrors).forEach(([field, message]) => {
    errors.push({ type: 'course', message, targetId: field });
  });

  if (!String(course.CourseName ?? '').trim()) {
    errors.push({ type: 'course', message: 'Vui lòng nhập tên khóa học.', targetId: 'CourseName' });
  } else if (String(course.CourseName).trim().length < 3) {
    errors.push({
      type: 'course',
      message: 'Tên khóa học phải có ít nhất 3 ký tự.',
      targetId: 'CourseName',
    });
  }

  if (!course.CategoryId) {
    errors.push({ type: 'course', message: 'Vui lòng chọn danh mục khóa học.', targetId: 'CategoryId' });
  }

  if (!course.LevelId) {
    errors.push({ type: 'course', message: 'Vui lòng chọn trình độ khóa học.', targetId: 'LevelId' });
  }

  errors.push(
    ...flattenContentErrors(
      paths,
      validateCourseContent(paths, {
        courseId: draft?.courseId ?? course?.CourseId ?? null,
      }),
    ),
  );

  paths.forEach((path, pathIndex) => {
    const chapterLabel = path.PathName || `Chương ${pathIndex + 1}`;

    (path.nodes ?? []).forEach((node, nodeIndex) => {
      const lessonLabel = node.NodeName || `Bài ${nodeIndex + 1}`;
      const materials = filterLearningMaterials(node.materials ?? []);

      if (materials.length === 0) {
        warnings.push({
          type: 'lesson',
          message: `${chapterLabel} — ${lessonLabel}: Chưa có học liệu.`,
          targetId: node.tempId,
        });
      }

      materials.forEach((material) => {
        const typeLabel = MATERIAL_TYPE_LABELS[material.MaterialType] ?? 'Học liệu';
        const materialLabel = material.Title || typeLabel;

        if (material.MaterialType === 'TEXT' && !hasTextContent(material.Content)) {
          const alreadyReported = errors.some((item) => item.targetId === material.tempId);
          if (!alreadyReported) {
            errors.push({
              type: 'material',
              message: `${materialLabel}: Văn bản chưa có nội dung.`,
              targetId: material.tempId,
            });
          }
        }

        if (material.MaterialType === 'DOC') {
          const sourceType =
            material.SourceType === DOC_SOURCE_LINK ? DOC_SOURCE_LINK : DOC_SOURCE_UPLOAD;
          const hasLink = Boolean(String(material.MaterialUrl ?? '').trim());
          const hasFile = Boolean(material.File || material.FileName);
          if (sourceType === DOC_SOURCE_LINK && !hasLink) {
            const alreadyReported = errors.some((item) => item.targetId === material.tempId);
            if (!alreadyReported) {
              errors.push({
                type: 'material',
                message: `${materialLabel}: Tài liệu chưa có link.`,
                targetId: material.tempId,
              });
            }
          }
          if (sourceType === DOC_SOURCE_UPLOAD && !hasFile) {
            const alreadyReported = errors.some((item) => item.targetId === material.tempId);
            if (!alreadyReported) {
              errors.push({
                type: 'material',
                message: `${materialLabel}: Tài liệu chưa có file.`,
                targetId: material.tempId,
              });
            }
          }
        }

        if (material.MaterialType === 'VIDEO') {
          const hasUrl = Boolean(String(material.MaterialUrl ?? '').trim());
          const hasEmbed = Boolean(String(material.EmbedUrl ?? '').trim());
          if (!hasUrl && !hasEmbed) {
            const alreadyReported = errors.some((item) => item.targetId === material.tempId);
            if (!alreadyReported) {
              errors.push({
                type: 'material',
                message: `${materialLabel}: Video chưa có link hoặc mã nhúng.`,
                targetId: material.tempId,
              });
            }
          }
        }

      });
    });
  });

  const uniqueErrors = [];
  const seen = new Set();
  errors.forEach((item) => {
    const key = `${item.type}:${item.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueErrors.push(item);
  });

  return {
    isValid: uniqueErrors.length === 0,
    errors: uniqueErrors,
    warnings,
  };
}

export function buildReviewChecklist(draft, validation) {
  const course = draft?.course ?? {};
  const paths = draft?.paths ?? [];
  const materialCounts = countMaterialsByType(paths);
  const hasBasicInfo = isCourseBasicComplete(course) &&
    !validation.errors.some((item) => item.type === 'course');

  const chapterCount = countChapters(paths);
  const lessonCount = countLessons(paths);
  const allChaptersHaveLessons = paths.every((path) => (path.nodes ?? []).length > 0);
  const allLessonsHaveMaterials = paths.every((path) =>
    (path.nodes ?? []).every((node) => filterLearningMaterials(node.materials).length > 0),
  );

  const textOk = !validation.errors.some(
    (item) => item.type === 'material' && item.message.includes('Văn bản'),
  );
  const docOk = !validation.errors.some(
    (item) => item.type === 'material' && item.message.includes('Tài liệu'),
  );
  const videoOk = !validation.errors.some(
    (item) => item.type === 'material' && item.message.includes('Video'),
  );

  return [
    {
      id: 'basic-info',
      label: 'Thông tin cơ bản đầy đủ',
      status: hasBasicInfo ? 'ok' : 'error',
    },
    {
      id: 'chapters',
      label: 'Có ít nhất 1 chương',
      status: chapterCount > 0 ? 'ok' : 'error',
    },
    {
      id: 'lessons-per-chapter',
      label: 'Mỗi chương có ít nhất 1 bài học * ',
      status: chapterCount > 0 && allChaptersHaveLessons ? 'ok' : 'error',
    },
    {
      id: 'materials-per-lesson',
      label: 'Mỗi bài học có học liệu',
      status: allLessonsHaveMaterials
        ? 'ok'
        : lessonCount > 0
          ? 'warning'
          : 'error',
    },
    {
      id: 'text-content',
      label: 'Văn bản có nội dung',
      status: materialCounts.TEXT === 0 ? 'ok' : textOk ? 'ok' : 'error',
    },
    {
      id: 'doc-content',
      label: 'Tài liệu có file hoặc link',
      status: materialCounts.DOC === 0 ? 'ok' : docOk ? 'ok' : 'error',
    },
    {
      id: 'video-content',
      label: 'Video có link hoặc mã nhúng',
      status: materialCounts.VIDEO === 0 ? 'ok' : videoOk ? 'ok' : 'error',
    },
  ];
}

export function buildCreateCoursePayload(draft, isPublished = false) {
  const course = {
    ...(draft?.course ?? {}),
    IsPublished: Boolean(isPublished),
  };

  return buildFullCreateCoursePayload(course, draft?.paths ?? []);
}

export function getReviewOverviewStats(paths = []) {
  return {
    chapters: countChapters(paths),
    lessons: countLessons(paths),
    materials: countMaterials(paths),
    materialCounts: countMaterialsByType(paths),
  };
}
