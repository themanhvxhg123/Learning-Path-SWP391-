import { normalizeMentorCourse } from './mentorCourseUtils';
import { countMaterialsInPath } from './mentorCourseContentUtils';

function normalizeMaterial(raw = {}) {
  return {
    materialId: raw.materialId ?? raw.MaterialId ?? null,
    MaterialType: raw.materialType ?? raw.MaterialType ?? '',
    Title: raw.title ?? raw.Title ?? '',
    MaterialUrl: raw.materialUrl ?? raw.MaterialUrl ?? null,
    MaterialOrder: raw.materialOrder ?? raw.MaterialOrder ?? 0,
    Content: raw.content ?? raw.Content ?? null,
    SourceType: raw.sourceType ?? raw.SourceType ?? null,
    Sections: raw.sections ?? raw.Sections ?? null,
    EmbedUrl: raw.embedUrl ?? raw.EmbedUrl ?? null,
    FileName: raw.fileName ?? raw.FileName ?? null,
  };
}

function normalizeNode(raw = {}) {
  return {
    nodeId: raw.nodeId ?? raw.NodeId ?? null,
    NodeName: raw.nodeName ?? raw.NodeName ?? '',
    NodeOrder: raw.nodeOrder ?? raw.NodeOrder ?? 0,
    Description: raw.description ?? raw.Description ?? '',
    materials: (raw.materials ?? raw.Materials ?? []).map(normalizeMaterial),
  };
}

function normalizePath(raw = {}) {
  return {
    pathId: raw.pathId ?? raw.PathId ?? null,
    PathName: raw.pathName ?? raw.PathName ?? '',
    Description: raw.description ?? raw.Description ?? '',
    nodes: (raw.nodes ?? raw.Nodes ?? []).map(normalizeNode),
  };
}

/**
 * Normalize full mentor course detail (course + paths tree).
 */
export function normalizeMentorCourseDetail(raw = {}) {
  const base = normalizeMentorCourse(raw);
  const paths = (raw.paths ?? raw.Paths ?? []).map(normalizePath);

  const totalChapters = paths.length;
  const totalLessonsFromPaths = paths.reduce(
    (sum, path) => sum + (path.nodes?.length ?? 0),
    0
  );
  const totalMaterialsFromPaths = paths.reduce(
    (sum, path) => sum + countMaterialsInPath(path),
    0
  );

  return {
    ...base,
    isPublished: base.status === 'published',
    paths,
    totalChapters: totalChapters || base.totalNodes || 0,
    totalLessons: base.totalLessons || totalLessonsFromPaths,
    totalMaterials: base.totalMaterials || totalMaterialsFromPaths,
  };
}

// COURSE's DETAIL
export const MENTOR_COURSE_DETAIL_TABS = {
  COURSE: 'course',
  CONTENT: 'content',
  STUDENTS: 'students',
  COMMENTS: 'comments',
};

export function parseMentorCourseDetailTab(searchParams) {
  const tab = (searchParams.get('tab') ?? '').trim().toLowerCase();

  if (tab === MENTOR_COURSE_DETAIL_TABS.CONTENT) {
    return MENTOR_COURSE_DETAIL_TABS.CONTENT;
  }
  if (tab === MENTOR_COURSE_DETAIL_TABS.STUDENTS) {
    return MENTOR_COURSE_DETAIL_TABS.STUDENTS;
  }
  if (tab === MENTOR_COURSE_DETAIL_TABS.COMMENTS) {
    return MENTOR_COURSE_DETAIL_TABS.COMMENTS;
  }
  return MENTOR_COURSE_DETAIL_TABS.COURSE;
}
