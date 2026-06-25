import {
  createTempId,
  filterLearningMaterials,
  sanitizePathsForStorage,
  stripNonLearningMaterials,
} from './mentorCourseContentUtils';

const editKey = (courseId) => `mentor_course_edit_draft_${courseId}`;

/**
 * Convert server-side paths (PathId / NodeId / MaterialId + nested data)
 * to the UI path format used by MentorCourseContentBuilder.
 * Each level gets a fresh tempId while real IDs are preserved for update APIs.
 */
export function mapDetailPathsToEditPaths(detailPaths = []) {
  return stripNonLearningMaterials(
    (detailPaths ?? []).map((path) => ({
      PathId: path.PathId ?? path.pathId ?? null,
      PathName: path.PathName ?? path.pathName ?? '',
      Description: path.Description ?? path.description ?? '',
      Order: path.Order ?? path.order,
      tempId: createTempId('path'),
      nodes: (path.nodes ?? path.Nodes ?? []).map((node) => ({
        NodeId: node.NodeId ?? node.nodeId ?? null,
        NodeName: node.NodeName ?? node.nodeName ?? '',
        NodeOrder: node.NodeOrder ?? node.nodeOrder ?? 0,
        Description: node.Description ?? node.description ?? '',
        tempId: createTempId('node'),
        materials: filterLearningMaterials(node.materials ?? node.Materials ?? []).map(
          (material) => ({
            MaterialId: material.MaterialId ?? material.materialId ?? null,
            MaterialType: material.MaterialType ?? material.materialType ?? 'VIDEO',
            Title: material.Title ?? material.title ?? '',
            MaterialUrl: material.MaterialUrl ?? material.materialUrl ?? '',
            Content: material.Content ?? material.content ?? '',
            MaterialOrder: material.MaterialOrder ?? material.materialOrder ?? 0,
            SourceType: material.SourceType ?? material.sourceType,
            EmbedUrl: material.EmbedUrl ?? material.embedUrl,
            FileName: material.FileName ?? material.fileName,
            FileSize: material.FileSize ?? material.fileSize ?? null,
            tempId: createTempId('material'),
          }),
        ),
      })),
    })),
  );
}

/**
 * Map normalized course detail (camelCase) → PascalCase draft.course format.
 * The draft.course must be PascalCase so it is compatible with
 * validateCourseDraft / buildReviewChecklist / MentorCourseInfoReview.
 */
export function courseDetailToEditCourse(course) {
  return {
    CourseId: course.courseId ?? course.CourseId ?? null,
    CourseName: course.courseName ?? course.CourseName ?? '',
    Description: course.description ?? course.Description ?? '',
    Thumbnail: course.thumbnail ?? course.Thumbnail ?? null,
    CategoryId: course.categoryId ?? course.CategoryId ?? null,
    LevelId: course.levelId ?? course.LevelId ?? null,
    InstructorId: course.instructorId ?? course.InstructorId ?? null,
    IsPublished: course.status === 'published'
      || course.isPublished === true
      || course.IsPublished === true
      || course.IsPublished === 1,
  };
}

/**
 * Map normalized course detail (camelCase) → form state for MentorCourseCreateForm.
 */
export function courseDetailToEditForm(course) {
  return {
    CourseName: course.courseName ?? course.CourseName ?? '',
    Description: course.description ?? course.Description ?? '',
    CategoryId: (course.categoryId ?? course.CategoryId) != null
      ? String(course.categoryId ?? course.CategoryId)
      : '',
    LevelId: (course.levelId ?? course.LevelId) != null
      ? String(course.levelId ?? course.LevelId)
      : '',
    Thumbnail: course.thumbnail ?? course.Thumbnail ?? '',
    IsPublished: course.status === 'published'
      || course.isPublished === true
      || course.IsPublished === true
      || course.IsPublished === 1,
  };
}

export function saveEditCourseDraft(courseId, draft) {
  sessionStorage.setItem(editKey(courseId), JSON.stringify(draft));
}

export function loadEditCourseDraft(courseId) {
  try {
    const raw = sessionStorage.getItem(editKey(courseId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearEditCourseDraft(courseId) {
  sessionStorage.removeItem(editKey(courseId));
}

/**
 * Persist basic-info changes into edit storage; keep existing paths.
 */
export function persistEditStep1(courseId, coursePascal, paths) {
  const prev = loadEditCourseDraft(courseId) ?? {};
  saveEditCourseDraft(courseId, {
    ...prev,
    courseId: Number(courseId),
    course: coursePascal,
    paths: sanitizePathsForStorage(paths ?? prev.paths ?? []),
  });
}

/**
 * Persist content paths into edit storage; keep existing course.
 */
export function persistEditContent(courseId, coursePascal, paths) {
  const prev = loadEditCourseDraft(courseId) ?? {};
  saveEditCourseDraft(courseId, {
    ...prev,
    courseId: Number(courseId),
    course: coursePascal ?? prev.course,
    paths: sanitizePathsForStorage(paths),
    meta: { ...(prev.meta ?? {}), contentSaved: true, profileOnly: false },
  });
}
