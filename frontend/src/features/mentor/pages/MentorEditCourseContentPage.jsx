import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Breadcrumbs, CircularProgress, Link as MuiLink, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import AppButton from '@/shared/ui/AppButton';
import { toast } from '@/shared/ui/Toast';
import MentorCourseContentBuilder from '@/features/mentor/components/course/MentorCourseContentBuilder';
import MentorCourseContentSidebar from '@/features/mentor/components/course/MentorCourseContentSidebar';
import ScrollToTopButton from '@/shared/ui/ScrollToTopButton';
import { useNavigationGuard } from '@/context/NavigationGuardContext';
import { MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import { fetchMentorCourseDetail } from '@/features/mentor/services/mentorCourseService';
import { getChapterQuizConfigsByCourse } from '@/features/mentor/services/chapterQuizConfigService';
import { buildChapterQuizPathIdSet } from '@/features/mentor/utils/mentorChapterQuizConfigUtils';
import {
  saveCoursePath,
  deleteCoursePath,
  fetchMaterialById,
  fetchPathById,
  fetchNodeById,
} from '@/features/mentor/services/courseContentService';
import {
  uploadPendingMaterialInPath,
  hydrateTextMaterialsInPaths,
  hydrateSingleTextMaterial,
} from '@/features/mentor/utils/mentorMaterialUploadUtils';
import {
  applyCoursePathSaveResult,
  buildCoursePathOnlySavePayload,
  buildCoursePathUnpublishOnlyPayload,
  buildCourseNodeOnlySavePayload,
  buildCourseMaterialSavePayload,
  hasCoursePathOnlySaveOperations,
  hasCourseNodeOnlySaveOperations,
  hasCourseMaterialSaveOperations,
} from '@/features/mentor/utils/courseContentApiMappers';
import {
  courseDetailToEditCourse,
  mapDetailPathsToEditPaths,
} from '@/features/mentor/utils/mentorCourseEditStorage';
import {
  filterLearningMaterials,
  getMaterialContentValidationToast,
  getMaterialPersistentId,
  createEmptyMaterial,
  createEmptyNode,
  createEmptyPath,
  chapterHasContent,
  chapterCanPublish,
  getChapterPublishBlockReason,
  getChapterUnpublishBlockReason,
  getLessonPublishBlockReason,
  getLessonUnpublishBlockReason,
  lessonCanPublish,
  normalizeChapterPublishState,
  shouldUnpublishChapterBecauseAllLessonsOff,
  syncPathsChapterPublishState,
  makePathDirtyKey,
  makeNodeDirtyKey,
  makeMaterialDirtyKey,
  isEditDirty,
  hasUnsavedEditScopeDirty,
  hasPendingNewUnsavedFocus,
  clearDirtyKeysForPath,
  isNewUnsavedMaterial,
  isNewUnsavedNode,
  isNewUnsavedPath,
  removeMaterialFromPath,
  removeNodeFromPath,
  removePathFromList,
  MATERIAL_TYPE_LABELS,
  reorderMaterials,
  applyFetchedMaterialToPath,
  validateMaterialForSave,
  validateNodeFieldsForSave,
  validatePathFieldsForSave,
  withNormalizedOrders,
  serializePathSnapshot,
} from '@/features/mentor/utils/mentorCourseContentUtils';

const COURSE_CONTENT_MOBILE_BACK_ID = 'course-content-mobile-back';

// ─── pure helpers ─────────────────────────────────────────────────────────────

function getDeleteDialogContent(deleteConfirm) {
  if (!deleteConfirm) return { title: 'Xác nhận', message: '' };
  return {
    title: 'Xóa chương mới?',
    message: `Bạn có chắc muốn xóa "${deleteConfirm.label}"? Chương này chưa lưu lên hệ thống.`,
  };
}

function getSaveConfirmDialogContent({
  saveScope,
  path,
  pathIndex,
  node,
  material,
}) {
  if (saveScope === 'path') {
    const name = String(path?.PathName ?? '').trim() || 'Chưa đặt tên';
    return {
      title: 'Cập nhật chương?',
      message: `Lưu thông tin chương ${pathIndex + 1}: "${name}" lên hệ thống? Chỉ tên, mô tả và trạng thái xuất bản của chương được cập nhật.`,
      confirmLabel: 'Cập nhật path',
    };
  }

  if (saveScope === 'node') {
    const name = String(node?.NodeName ?? node?.nodeName ?? '').trim() || 'Chưa đặt tên';
    const willUnpublishChapter = shouldUnpublishChapterBecauseAllLessonsOff(path);
    let message = `Lưu thông tin bài học "${name}" lên hệ thống? Chỉ tên, mô tả và trạng thái xuất bản của bài học được cập nhật.`;
    if (willUnpublishChapter) {
      message += ' Chương chứa bài học này cũng sẽ được chuyển sang chưa xuất bản vì không còn bài học nào được xuất bản.';
    }
    return {
      title: 'Cập nhật bài học?',
      message,
      confirmLabel: 'Cập nhật Node',
    };
  }

  const materialLabel = String(material?.Title ?? '').trim()
    || MATERIAL_TYPE_LABELS[material?.MaterialType]
    || 'Học liệu';

  return {
    title: 'Cập nhật học liệu?',
    message: `Lưu học liệu "${materialLabel}" lên hệ thống? Chỉ nội dung học liệu này được cập nhật.`,
    confirmLabel: 'Cập nhật học liệu',
  };
}

function buildPathSnapshotsMap(paths = []) {
  return Object.fromEntries(
    (paths ?? []).map((path) => [path.tempId, serializePathSnapshot(path)]),
  );
}

function updatePathSnapshotRef(snapshotsRef, pathTempId, path) {
  if (!pathTempId || !path) return;
  snapshotsRef.current = {
    ...snapshotsRef.current,
    [pathTempId]: serializePathSnapshot(path),
  };
}

async function unpublishPathWhenAllLessonsOff({
  pathTempId,
  pathIndex,
  courseId,
  pathsRef,
  setPaths,
  pathSnapshotsRef,
  clearDirtyKey,
  chapterQuizPathIds = null,
}) {
  const pathForChapterCheck = pathsRef.current.find((item) => item.tempId === pathTempId);
  if (
    !shouldUnpublishChapterBecauseAllLessonsOff(pathForChapterCheck)
    || !pathForChapterCheck?.PathId
    || getChapterUnpublishBlockReason(pathForChapterCheck, { chapterQuizPathIds })
  ) {
    return { ok: true, didUnpublish: false };
  }

  const unpublishedPath = normalizeChapterPublishState(pathForChapterCheck);
  const pathUnpublishPayload = buildCoursePathUnpublishOnlyPayload(
    unpublishedPath,
    {
      courseId: Number(courseId),
      pathOrder: pathIndex >= 0 ? pathIndex + 1 : 1,
    },
  );
  const pathResult = await saveCoursePath({
    ...pathUnpublishPayload,
    context: {
      ...(pathUnpublishPayload.context ?? {}),
      courseId: Number(courseId),
      pathOrder: pathIndex >= 0 ? pathIndex + 1 : 1,
    },
  });

  if (!pathResult.ok) {
    toast.error(pathResult.message ?? 'Không thể hủy xuất bản chương.');
    return { ok: false, didUnpublish: false };
  }

  const syncedPath = applyCoursePathSaveResult(unpublishedPath, pathResult);
  const nextPaths = withNormalizedOrders(
    pathsRef.current.map((item) => (item.tempId === pathTempId ? syncedPath : item)),
  );
  pathsRef.current = nextPaths;
  setPaths(nextPaths);
  clearDirtyKey(makePathDirtyKey(pathTempId));
  updatePathSnapshotRef(pathSnapshotsRef, pathTempId, syncedPath);
  toast.info('Chương đã được hủy xuất bản vì không còn bài học nào được xuất bản.');
  return { ok: true, didUnpublish: true };
}

function updatePathInList(paths, pathTempId, patch) {
  return paths.map((p) => (p.tempId === pathTempId ? { ...p, ...patch } : p));
}

function updateNodeInPath(paths, pathTempId, nodeTempId, patch) {
  return paths.map((path) => {
    if (path.tempId !== pathTempId) return path;
    return {
      ...path,
      nodes: (path.nodes ?? path.Nodes ?? []).map((node) =>
        node.tempId === nodeTempId ? { ...node, ...patch } : node,
      ),
    };
  });
}

function updateMaterialInPath(paths, pathTempId, nodeTempId, materialTempId, patch) {
  return paths.map((path) => {
    if (path.tempId !== pathTempId) return path;
    return {
      ...path,
      nodes: (path.nodes ?? path.Nodes ?? []).map((node) => {
        if (node.tempId !== nodeTempId) return node;
        return {
          ...node,
          materials: (node.materials ?? node.Materials ?? []).map((material) => {
            if (material.tempId !== materialTempId) return material;
            const next = { ...material, ...patch };
            // Không cho patch vô tình xóa MaterialId → tránh UPDATE thành INSERT.
            const persistentId = getMaterialPersistentId(material);
            if (persistentId && !getMaterialPersistentId(next)) {
              next.MaterialId = persistentId;
            } else if (getMaterialPersistentId(next)) {
              next.MaterialId = getMaterialPersistentId(next);
            }
            return next;
          }),
        };
      }),
    };
  });
}

// ─── page component ───────────────────────────────────────────────────────────

export default function MentorEditCourseContentPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [coursePascal, setCoursePascal] = useState(null);
  const [paths, setPaths] = useState([]);
  const [ready, setReady] = useState(false);
  const [validationErrors, setValidationErrors] = useState({ root: [], paths: {} });
  const [expandedPaths, setExpandedPaths] = useState({});
  const [expandedNodes, setExpandedNodes] = useState({});
  const [dirtyKeys, setDirtyKeys] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveConfirm, setSaveConfirm] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [unsavedNavDialogOpen, setUnsavedNavDialogOpen] = useState(false);
  const [updatingPathId, setUpdatingPathId] = useState(null);
  const [updatingNodeKey, setUpdatingNodeKey] = useState(null);
  const [updatingMaterialKey, setUpdatingMaterialKey] = useState(null);
  const [chapterQuizPathIds, setChapterQuizPathIds] = useState(() => new Set());

  const pathsRef = useRef(paths);
  const pathSnapshotsRef = useRef({});
  const dirtyKeysRef = useRef(dirtyKeys);
  const focusTargetRef = useRef(focusTarget);
  const chapterQuizPathIdsRef = useRef(chapterQuizPathIds);
  const pendingNavigationRef = useRef(null);
  const requestNavigationRef = useRef(null);
  const confirmSaveInFlightRef = useRef(false);
  const { registerNavigationGuard } = useNavigationGuard() ?? {};

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    dirtyKeysRef.current = dirtyKeys;
  }, [dirtyKeys]);

  useEffect(() => {
    focusTargetRef.current = focusTarget;
  }, [focusTarget]);

  useEffect(() => {
    chapterQuizPathIdsRef.current = chapterQuizPathIds;
  }, [chapterQuizPathIds]);

  const courseName = coursePascal?.CourseName ?? '';

  const markDirty = useCallback((key) => {
    if (!key) return;
    setDirtyKeys((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true };
      dirtyKeysRef.current = next;
      return next;
    });
  }, []);

  const clearDirtyKey = useCallback((key) => {
    if (!key) return;
    setDirtyKeys((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      dirtyKeysRef.current = next;
      return next;
    });
  }, []);

  const applyFocusTarget = useCallback((next) => {
    focusTargetRef.current = next;
    setFocusTarget(next);
  }, []);

  // ── initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await fetchMentorCourseDetail(courseId);
      if (cancelled) return;

      if (!result.success) {
        toast.error('Không thể tải nội dung khóa học.');
        navigate(`/mentor/courses/${courseId}`, { replace: true });
        return;
      }

      const resolvedCoursePascal = courseDetailToEditCourse(result.course);
      const resolvedPaths = mapDetailPathsToEditPaths(
        result.course.Paths ?? result.course.paths ?? [],
      );

      if (cancelled) return;

      const hydratedPaths = await hydrateTextMaterialsInPaths(resolvedPaths);
      if (cancelled) return;

      const quizResult = await getChapterQuizConfigsByCourse(Number(courseId));
      if (cancelled) return;

      const loaded = syncPathsChapterPublishState(withNormalizedOrders(hydratedPaths));

      pathSnapshotsRef.current = buildPathSnapshotsMap(loaded);
      setCoursePascal(resolvedCoursePascal);
      setPaths(loaded);
      if (quizResult.ok) {
        setChapterQuizPathIds(buildChapterQuizPathIdSet(quizResult.configs));
      } else {
        setChapterQuizPathIds(new Set());
      }
      setDirtyKeys({});
      setActiveChapterId(loaded[0]?.tempId ?? null);
      setFocusTarget(null);
      focusTargetRef.current = null;
      setReady(true);
    })();

    return () => { cancelled = true; };
  }, [courseId, navigate]);

  // ── path / node / material handlers ────────────────────────────────────────

  const applyPaths = useCallback((updater) => {
    setPaths((prev) => withNormalizedOrders(updater(prev)));
    setValidationErrors({ root: [], paths: {} });
  }, []);

  const performAddPath = useCallback(() => {
    const newPath = createEmptyPath();
    applyPaths((prev) => [...prev, newPath]);
    setExpandedPaths((prev) => ({ ...prev, [newPath.tempId]: true }));
    markDirty(makePathDirtyKey(newPath.tempId));
    setActiveChapterId(newPath.tempId);
    applyFocusTarget({ type: 'chapter-edit', pathTempId: newPath.tempId });
  }, [applyPaths, applyFocusTarget, markDirty]);

  const handlePathChange = (pathTempId, patch) => {
    const path = pathsRef.current.find((item) => item.tempId === pathTempId);

    if (patch.IsActive === 0 || patch.IsActive === false) {
      const hideReason = getChapterUnpublishBlockReason(path, {
        chapterQuizPathIds: chapterQuizPathIdsRef.current,
      });
      if (hideReason) {
        toast.error(hideReason);
        return;
      }
    }

    if (patch.IsActive === 1 || patch.IsActive === true) {
      const nextPath = path ? { ...path, ...patch } : null;
      if (nextPath && !chapterCanPublish(nextPath)) {
        toast.error(getChapterPublishBlockReason(nextPath));
        return;
      }
    }

    markDirty(makePathDirtyKey(pathTempId));
    applyPaths((prev) => updatePathInList(prev, pathTempId, patch));
  };

  const handleDeleteNewPath = async (pathTempId) => {
    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    if (!path) return;

    if (path.PathId) {
      setUpdatingPathId(pathTempId);
      try {
        const result = await deleteCoursePath(path.PathId);
        if (!result.ok) {
          toast.error(result.message ?? 'Không thể xóa chương.');
          return;
        }
      } finally {
        setUpdatingPathId(null);
      }
    }

    const nextPaths = withNormalizedOrders(
      pathsRef.current.filter((p) => p.tempId !== pathTempId),
    );

    setPaths(nextPaths);
    const nextSnapshots = { ...pathSnapshotsRef.current };
    delete nextSnapshots[pathTempId];
    pathSnapshotsRef.current = nextSnapshots;
    setValidationErrors({ root: [], paths: {} });
    setDirtyKeys((prev) => clearDirtyKeysForPath(prev, pathTempId));
    setExpandedPaths((prev) => {
      const next = { ...prev };
      delete next[pathTempId];
      return next;
    });
    if (activeChapterId === pathTempId) {
      const deletedIndex = pathsRef.current.findIndex((p) => p.tempId === pathTempId);
      const nextIdx = Math.max(0, deletedIndex - 1);
      setActiveChapterId(nextPaths[nextIdx]?.tempId ?? null);
      setFocusTarget(null);
      focusTargetRef.current = null;
    }
  };

  const dismissPendingContentNavigation = () => {
    pendingNavigationRef.current = null;
    setUnsavedNavDialogOpen(false);
  };

  const requestDeleteNewPath = (pathTempId) => {
    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    if (!path) return;

    if (!path.PathId) {
      dismissPendingContentNavigation();
      setDeleteConfirm({
        type: 'newPath',
        pathTempId,
        label: String(path.PathName ?? '').trim() || 'Chương mới',
      });
      return;
    }

    handleDeleteNewPath(pathTempId);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    dismissPendingContentNavigation();
    handleDeleteNewPath(deleteConfirm.pathTempId);
    setDeleteConfirm(null);
  };

  const performAddNode = useCallback((pathTempId) => {
    const newNode = createEmptyNode();
    applyPaths((prev) =>
      prev.map((p) =>
        p.tempId === pathTempId
          ? { ...p, nodes: [...(p.nodes ?? p.Nodes ?? []), newNode] }
          : p,
      ),
    );
    markDirty(makeNodeDirtyKey(pathTempId, newNode.tempId));
    setExpandedNodes((prev) => ({ ...prev, [newNode.tempId]: true }));
    setActiveChapterId(pathTempId);
    applyFocusTarget({
      type: 'lesson',
      pathTempId,
      nodeTempId: newNode.tempId,
    });
  }, [applyPaths, applyFocusTarget, markDirty]);

  const handleNodeChange = (pathTempId, nodeTempId, patch) => {
    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    const node = (path?.nodes ?? path?.Nodes ?? []).find((item) => item.tempId === nodeTempId);

    if (patch.IsActive === 0 || patch.IsActive === false) {
      const hideReason = getLessonUnpublishBlockReason(node, path, {
        chapterQuizPathIds: chapterQuizPathIdsRef.current,
      });
      if (hideReason) {
        toast.error(hideReason);
        return;
      }
    }

    if (patch.IsActive === 1 || patch.IsActive === true) {
      const nextNode = node ? { ...node, ...patch } : null;
      if (nextNode && !lessonCanPublish(nextNode)) {
        toast.error(getLessonPublishBlockReason(nextNode));
        return;
      }
    }

    markDirty(makeNodeDirtyKey(pathTempId, nodeTempId));
    applyPaths((prev) => updateNodeInPath(prev, pathTempId, nodeTempId, patch));
  };

  const performAddMaterial = useCallback((pathTempId, nodeTempId) => {
    const newMaterial = createEmptyMaterial();
    applyPaths((prev) =>
      prev.map((p) => {
        if (p.tempId !== pathTempId) return p;
        return {
          ...p,
          nodes: (p.nodes ?? p.Nodes ?? []).map((n) =>
            n.tempId === nodeTempId
              ? { ...n, materials: [...(n.materials ?? n.Materials ?? []), newMaterial] }
              : n,
          ),
        };
      }),
    );
    markDirty(makeMaterialDirtyKey(pathTempId, nodeTempId, newMaterial.tempId));
    setExpandedNodes((prev) => ({ ...prev, [nodeTempId]: true }));
    setActiveChapterId(pathTempId);
    applyFocusTarget({
      type: 'material',
      pathTempId,
      nodeTempId,
      materialTempId: newMaterial.tempId,
    });
  }, [applyPaths, applyFocusTarget, markDirty]);

  const handleMaterialChange = (pathTempId, nodeTempId, materialTempId, patch) => {
    markDirty(makeMaterialDirtyKey(pathTempId, nodeTempId, materialTempId));
    applyPaths((prev) => updateMaterialInPath(prev, pathTempId, nodeTempId, materialTempId, patch));
  };

  const handleMaterialReorder = (pathTempId, nodeTempId, fromIndex, toIndex) => {
    applyPaths((prev) =>
      prev.map((p) => {
        if (p.tempId !== pathTempId) return p;
        return {
          ...p,
          nodes: (p.nodes ?? p.Nodes ?? []).map((n) => {
            if (n.tempId !== nodeTempId) return n;
            return {
              ...n,
              materials: reorderMaterials(
                n.materials ?? n.Materials ?? [],
                fromIndex,
                toIndex,
              ),
            };
          }),
        };
      }),
    );

    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    const node = (path?.nodes ?? path?.Nodes ?? []).find((item) => item.tempId === nodeTempId);
    filterLearningMaterials(node?.materials ?? node?.Materials ?? []).forEach((material) => {
      markDirty(makeMaterialDirtyKey(pathTempId, nodeTempId, material.tempId));
    });
  };

  const handleUpdatePath = (pathTempId) => {
    requestScopedSave('path', pathTempId, null, null);
  };

  const handleUpdateNode = (pathTempId, nodeTempId) => {
    requestScopedSave('node', pathTempId, nodeTempId, null);
  };

  const handleUpdateMaterial = (pathTempId, nodeTempId, materialTempId) => {
    requestScopedSave('material', pathTempId, nodeTempId, materialTempId);
  };

  const requestScopedSave = (saveScope, pathTempId, nodeTempId, materialTempId) => {
    if (confirmSaveInFlightRef.current) return;

    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    if (!path || !pathTempId) return;

    const pathIndex = pathsRef.current.findIndex((item) => item.tempId === pathTempId);
    const node = (path.nodes ?? []).find((item) => item.tempId === nodeTempId);
    const material = filterLearningMaterials(node?.materials ?? node?.Materials ?? [])
      .find((item) => item.tempId === materialTempId);

    if (saveScope === 'path') {
      if (!isEditDirty(dirtyKeysRef.current, makePathDirtyKey(pathTempId))) {
        toast.info('Không có thay đổi path để lưu.');
        return;
      }

      const pathErrors = validatePathFieldsForSave(path, pathsRef.current, {
        chapterQuizPathIds: chapterQuizPathIdsRef.current,
      });
      if (Object.keys(pathErrors).length > 0) {
        setValidationErrors((prev) => ({
          ...prev,
          paths: {
            ...(prev.paths ?? {}),
            [pathTempId]: {
              ...(prev.paths?.[pathTempId] ?? {}),
              ...pathErrors,
            },
          },
        }));
        if (pathErrors.PathName) toast.error(pathErrors.PathName);
        else if (pathErrors._publish) toast.error(pathErrors._publish);
        setExpandedPaths((prev) => ({ ...prev, [pathTempId]: true }));
        return;
      }
    } else if (saveScope === 'node') {
      if (!node) return;
      if (!path.PathId) {
        toast.error('Vui lòng cập nhật path trước khi lưu bài học.');
        return;
      }
      if (!isEditDirty(dirtyKeysRef.current, makeNodeDirtyKey(pathTempId, nodeTempId))) {
        toast.info('Không có thay đổi bài học để lưu.');
        return;
      }

      const nodeErrors = validateNodeFieldsForSave(node, path.nodes ?? [], {
        path,
        chapterQuizPathIds: chapterQuizPathIdsRef.current,
      });
      if (Object.keys(nodeErrors).length > 0) {
        setValidationErrors((prev) => ({
          ...prev,
          paths: {
            ...(prev.paths ?? {}),
            [pathTempId]: {
              ...(prev.paths?.[pathTempId] ?? {}),
              nodes: {
                ...(prev.paths?.[pathTempId]?.nodes ?? {}),
                [nodeTempId]: nodeErrors,
              },
            },
          },
        }));
        toast.error(nodeErrors.NodeName ?? nodeErrors._publish ?? 'Vui lòng kiểm tra lại thông tin bài học.');
        setExpandedPaths((prev) => ({ ...prev, [pathTempId]: true }));
        setExpandedNodes((prev) => ({ ...prev, [nodeTempId]: true }));
        return;
      }
    } else {
      if (!node || !material) return;
      if (!path.PathId) {
        toast.error('Vui lòng cập nhật path trước khi lưu học liệu.');
        return;
      }
      if (!node.NodeId) {
        toast.error('Vui lòng cập nhật node trước khi lưu học liệu.');
        return;
      }
      if (!isEditDirty(
        dirtyKeysRef.current,
        makeMaterialDirtyKey(pathTempId, nodeTempId, materialTempId),
      )) {
        toast.info('Không có thay đổi học liệu để lưu.');
        return;
      }

      const materialErrors = validateMaterialForSave(
        material,
        filterLearningMaterials(node.materials ?? node.Materials ?? []),
      );
      if (Object.keys(materialErrors).length > 0) {
        setValidationErrors((prev) => ({
          ...prev,
          paths: {
            ...(prev.paths ?? {}),
            [pathTempId]: {
              ...(prev.paths?.[pathTempId] ?? {}),
              nodes: {
                ...(prev.paths?.[pathTempId]?.nodes ?? {}),
                [nodeTempId]: {
                  ...(prev.paths?.[pathTempId]?.nodes?.[nodeTempId] ?? {}),
                  materials: {
                    ...(prev.paths?.[pathTempId]?.nodes?.[nodeTempId]?.materials ?? {}),
                    [materialTempId]: materialErrors,
                  },
                },
              },
            },
          },
        }));
        const validationToast = getMaterialContentValidationToast(materialErrors);
        if (validationToast) toast.error(validationToast);
        setExpandedPaths((prev) => ({ ...prev, [pathTempId]: true }));
        setExpandedNodes((prev) => ({ ...prev, [nodeTempId]: true }));
        return;
      }
    }

    const dialogContent = getSaveConfirmDialogContent({
      saveScope,
      path,
      pathIndex,
      node,
      material,
    });

    setSaveConfirm({
      saveScope,
      pathTempId,
      nodeTempId,
      materialTempId,
      ...dialogContent,
    });
  };

  const handleConfirmScopedSave = () => {
    if (!saveConfirm || confirmSaveInFlightRef.current) return;
    const { saveScope, pathTempId, nodeTempId, materialTempId } = saveConfirm;
    void executeScopedSave(saveScope, pathTempId, nodeTempId, materialTempId);
  };

  const syncMaterialFromServer = useCallback(async (
    pathTempId,
    nodeTempId,
    materialTempId,
    materialId,
  ) => {
    if (!pathTempId || !nodeTempId || !materialTempId || !materialId) {
      return { ok: false, message: 'Thiếu thông tin học liệu để đồng bộ.' };
    }

    const result = await fetchMaterialById(materialId);
    if (!result.ok) {
      return { ok: false, message: result.message || 'Không thể tải học liệu mới nhất.' };
    }

    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    if (!path) {
      return { ok: false, message: 'Không tìm thấy chương chứa học liệu.' };
    }

    const currentMaterial = filterLearningMaterials(
      (path.nodes ?? []).find((item) => item.tempId === nodeTempId)?.materials ?? [],
    ).find((item) => item.tempId === materialTempId);

    const withApiData = applyFetchedMaterialToPath(
      path,
      nodeTempId,
      materialTempId,
      result.data,
    );
    const fetchedMaterial = filterLearningMaterials(
      (withApiData.nodes ?? []).find((item) => item.tempId === nodeTempId)?.materials ?? [],
    ).find((item) => item.tempId === materialTempId);

    const hydratedMaterial = await hydrateSingleTextMaterial(fetchedMaterial ?? {
      ...(currentMaterial ?? {}),
      ...result.data,
      Content: '',
      File: null,
      tempId: materialTempId,
    });

    const syncedPath = applyFetchedMaterialToPath(
      withApiData,
      nodeTempId,
      materialTempId,
      hydratedMaterial,
    );
    const nextPaths = pathsRef.current.map((item) => (
      item.tempId === pathTempId ? syncedPath : item
    ));
    pathsRef.current = nextPaths;
    setPaths(nextPaths);
    clearDirtyKey(makeMaterialDirtyKey(pathTempId, nodeTempId, materialTempId));

    return { ok: true };
  }, [clearDirtyKey]);

  const executeScopedSave = async (saveScope, pathTempId, nodeTempId, materialTempId) => {
    if (confirmSaveInFlightRef.current) return;

    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    if (!path || !pathTempId) return;

    const pathIndex = pathsRef.current.findIndex((item) => item.tempId === pathTempId);

    confirmSaveInFlightRef.current = true;
    if (saveScope === 'path') {
      setUpdatingPathId(pathTempId);
    } else if (saveScope === 'node') {
      setUpdatingNodeKey(`${pathTempId}:${nodeTempId}`);
    } else {
      setUpdatingMaterialKey(`${pathTempId}:${nodeTempId}:${materialTempId}`);
    }

    try {
      let workingPath = path;
      let nextPathsDraft = pathsRef.current;

      if (saveScope === 'material') {
        const [uploadedPath] = await uploadPendingMaterialInPath(
          pathsRef.current,
          pathTempId,
          nodeTempId,
          materialTempId,
        );
        if (uploadedPath) {
          workingPath = uploadedPath;
          nextPathsDraft = pathsRef.current.map((item) => (
            item.tempId === pathTempId ? uploadedPath : item
          ));
          setPaths(nextPathsDraft);
          pathsRef.current = nextPathsDraft;
        }
      }

      const baselineSnapshot = pathSnapshotsRef.current[pathTempId] ?? null;

      const savePayload = saveScope === 'path'
        ? buildCoursePathOnlySavePayload(
          workingPath,
          {
            courseId: Number(courseId),
            pathOrder: pathIndex >= 0 ? pathIndex + 1 : 1,
          },
          baselineSnapshot,
        )
        : saveScope === 'node'
          ? buildCourseNodeOnlySavePayload(
            workingPath,
            nodeTempId,
            {
              courseId: Number(courseId),
              pathOrder: pathIndex >= 0 ? pathIndex + 1 : 1,
            },
            baselineSnapshot,
          )
          : buildCourseMaterialSavePayload(
            workingPath,
            nodeTempId,
            materialTempId,
            {
              courseId: Number(courseId),
              pathOrder: pathIndex >= 0 ? pathIndex + 1 : 1,
            },
            baselineSnapshot,
          );

      const hasOperations = saveScope === 'path'
        ? hasCoursePathOnlySaveOperations(savePayload)
        : saveScope === 'node'
          ? hasCourseNodeOnlySaveOperations(savePayload)
          : hasCourseMaterialSaveOperations(savePayload);

      if (!hasOperations) {
        toast.info(
          saveScope === 'path'
            ? 'Không có thay đổi path để lưu.'
            : saveScope === 'node'
              ? 'Không có thay đổi bài học để lưu.'
              : 'Không có thay đổi học liệu để lưu.',
        );
        setSaveConfirm(null);
        return;
      }

      const result = await saveCoursePath({
        ...savePayload,
        context: {
          ...(savePayload?.context ?? {}),
          courseId: Number(courseId),
          pathOrder: pathIndex >= 0 ? pathIndex + 1 : 1,
        },
      });

      if (!result.ok) {
        toast.error(result.message ?? (
          saveScope === 'path'
            ? 'Không thể cập nhật path.'
            : saveScope === 'node'
              ? 'Không thể cập nhật bài học.'
              : 'Không thể cập nhật học liệu.'
        ));
        return;
      }

      const savedPath = applyCoursePathSaveResult(workingPath, result);
      let nextPaths = withNormalizedOrders(
        nextPathsDraft.map((item) => (item.tempId === pathTempId ? savedPath : item)),
      );

      pathsRef.current = nextPaths;
      setPaths(nextPaths);

      if (saveScope === 'material' && materialTempId) {
        const savedMaterial = filterLearningMaterials(
          (savedPath.nodes ?? []).find((item) => item.tempId === nodeTempId)?.materials ?? [],
        ).find((item) => item.tempId === materialTempId);
        const materialId = getMaterialPersistentId(savedMaterial);

        if (materialId) {
          const syncResult = await syncMaterialFromServer(
            pathTempId,
            nodeTempId,
            materialTempId,
            materialId,
          );
          if (!syncResult.ok) {
            clearDirtyKey(makeMaterialDirtyKey(pathTempId, nodeTempId, materialTempId));
          }
          nextPaths = pathsRef.current;
        } else {
          clearDirtyKey(makeMaterialDirtyKey(pathTempId, nodeTempId, materialTempId));
        }

        await unpublishPathWhenAllLessonsOff({
          pathTempId,
          pathIndex,
          courseId,
          pathsRef,
          setPaths,
          pathSnapshotsRef,
          clearDirtyKey,
          chapterQuizPathIds: chapterQuizPathIdsRef.current,
        });
      } else if (saveScope === 'node') {
        clearDirtyKey(makeNodeDirtyKey(pathTempId, nodeTempId));
        await unpublishPathWhenAllLessonsOff({
          pathTempId,
          pathIndex,
          courseId,
          pathsRef,
          setPaths,
          pathSnapshotsRef,
          clearDirtyKey,
          chapterQuizPathIds: chapterQuizPathIdsRef.current,
        });
      } else {
        clearDirtyKey(makePathDirtyKey(pathTempId));
      }

      const syncedPath = pathsRef.current.find((item) => item.tempId === pathTempId);
      if (syncedPath) {
        updatePathSnapshotRef(pathSnapshotsRef, pathTempId, syncedPath);
      }

      setSaveConfirm(null);

      toast.success(
        saveScope === 'path'
          ? 'Đã cập nhật path.'
          : saveScope === 'node'
            ? 'Đã cập nhật bài học.'
            : 'Đã cập nhật học liệu.',
      );
    } catch (error) {
      toast.error(error?.message || (
        saveScope === 'path'
          ? 'Không thể cập nhật path. Vui lòng thử lại.'
          : saveScope === 'node'
            ? 'Không thể cập nhật bài học. Vui lòng thử lại.'
            : 'Không thể cập nhật học liệu. Vui lòng thử lại.'
      ));
    } finally {
      confirmSaveInFlightRef.current = false;
      setUpdatingPathId(null);
      setUpdatingNodeKey(null);
      setUpdatingMaterialKey(null);
    }
  };

  const handleRestorePath = useCallback(async (pathTempId) => {
    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    if (!path?.PathId) {
      toast.error('Chương chưa được lưu, không thể khôi phục từ máy chủ.');
      return;
    }

    setUpdatingPathId(pathTempId);
    try {
      const result = await fetchPathById(path.PathId);
      if (!result.ok) {
        toast.error(result.message || 'Không thể khôi phục chương.');
        return;
      }

      const data = result.data ?? {};
      setPaths((prev) => prev.map((item) => {
        if (item.tempId !== pathTempId) return item;
        const restored = {
          ...item,
          PathName: data.PathName ?? data.pathName ?? item.PathName,
          Description: data.Description ?? data.description ?? item.Description,
          IsActive: data.IsActive ?? data.isActive ?? item.IsActive,
        };
        updatePathSnapshotRef(pathSnapshotsRef, pathTempId, restored);
        return restored;
      }));
      clearDirtyKey(makePathDirtyKey(pathTempId));
      setValidationErrors((prev) => ({
        ...prev,
        paths: {
          ...(prev.paths ?? {}),
          [pathTempId]: undefined,
        },
      }));
      toast.success('Đã khôi phục thông tin chương.');
    } catch (error) {
      toast.error(error?.message || 'Không thể khôi phục chương.');
    } finally {
      setUpdatingPathId(null);
    }
  }, [clearDirtyKey]);

  const handleRestoreNode = useCallback(async (pathTempId, nodeTempId) => {
    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    const node = (path?.nodes ?? []).find((item) => item.tempId === nodeTempId);
    if (!node?.NodeId) {
      toast.error('Bài học chưa được lưu, không thể khôi phục từ máy chủ.');
      return;
    }

    setUpdatingNodeKey(`${pathTempId}:${nodeTempId}`);
    try {
      const result = await fetchNodeById(node.NodeId);
      if (!result.ok) {
        toast.error(result.message || 'Không thể khôi phục bài học.');
        return;
      }

      const data = result.data ?? {};
      setPaths((prev) => {
        const nextPaths = updateNodeInPath(prev, pathTempId, nodeTempId, {
          NodeName: data.NodeName ?? data.nodeName ?? node.NodeName,
          Description: data.Description ?? data.description ?? node.Description,
          IsActive: data.IsActive ?? data.isActive ?? node.IsActive,
          NodeOrder: data.NodeOrder ?? data.nodeOrder ?? node.NodeOrder,
        });
        const restoredPath = nextPaths.find((item) => item.tempId === pathTempId);
        if (restoredPath) {
          updatePathSnapshotRef(pathSnapshotsRef, pathTempId, restoredPath);
        }
        return nextPaths;
      });
      clearDirtyKey(makeNodeDirtyKey(pathTempId, nodeTempId));
      setValidationErrors((prev) => {
        const pathErrors = prev.paths?.[pathTempId];
        if (!pathErrors?.nodes?.[nodeTempId]) return prev;
        return {
          ...prev,
          paths: {
            ...(prev.paths ?? {}),
            [pathTempId]: {
              ...pathErrors,
              nodes: {
                ...(pathErrors.nodes ?? {}),
                [nodeTempId]: undefined,
              },
            },
          },
        };
      });
      toast.success('Đã khôi phục thông tin bài học.');
    } catch (error) {
      toast.error(error?.message || 'Không thể khôi phục bài học.');
    } finally {
      setUpdatingNodeKey(null);
    }
  }, [clearDirtyKey]);

  const handleRestoreMaterial = useCallback(async (pathTempId, nodeTempId, materialTempId) => {
    const path = pathsRef.current.find((item) => item.tempId === pathTempId);
    const node = (path?.nodes ?? []).find((item) => item.tempId === nodeTempId);
    const material = filterLearningMaterials(node?.materials ?? [])
      .find((item) => item.tempId === materialTempId);
    const materialId = getMaterialPersistentId(material);
    if (!materialId) {
      toast.error('Học liệu chưa được lưu, không thể khôi phục từ máy chủ.');
      return;
    }

    setUpdatingMaterialKey(`${pathTempId}:${nodeTempId}:${materialTempId}`);
    try {
      const result = await syncMaterialFromServer(
        pathTempId,
        nodeTempId,
        materialTempId,
        materialId,
      );
      if (!result.ok) {
        toast.error(result.message || 'Không thể khôi phục học liệu.');
        return;
      }

      setValidationErrors((prev) => {
        const pathErrors = prev.paths?.[pathTempId];
        const nodeErrors = pathErrors?.nodes?.[nodeTempId];
        if (!nodeErrors?.materials?.[materialTempId]) return prev;
        return {
          ...prev,
          paths: {
            ...(prev.paths ?? {}),
            [pathTempId]: {
              ...pathErrors,
              nodes: {
                ...(pathErrors.nodes ?? {}),
                [nodeTempId]: {
                  ...nodeErrors,
                  materials: {
                    ...(nodeErrors.materials ?? {}),
                    [materialTempId]: undefined,
                  },
                },
              },
            },
          },
        };
      });
      const restoredPath = pathsRef.current.find((item) => item.tempId === pathTempId);
      if (restoredPath) {
        updatePathSnapshotRef(pathSnapshotsRef, pathTempId, restoredPath);
      }
      toast.success('Đã khôi phục học liệu.');
    } catch (error) {
      toast.error(error?.message || 'Không thể khôi phục học liệu.');
    } finally {
      setUpdatingMaterialKey(null);
    }
  }, [syncMaterialFromServer]);

  const discardUnsavedNewFocusEntity = useCallback((options = {}) => {
    const { keepParentDraft = false } = options;
    const focus = focusTargetRef.current;
    if (!focus?.pathTempId) return;

    const path = pathsRef.current.find((item) => item.tempId === focus.pathTempId);
    if (!path) return;

    if (focus.type === 'material' && focus.nodeTempId && focus.materialTempId) {
      const node = (path.nodes ?? []).find((item) => item.tempId === focus.nodeTempId);
      const material = filterLearningMaterials(node?.materials ?? [])
        .find((item) => item.tempId === focus.materialTempId);
      if (!isNewUnsavedMaterial(material)) return;

      const nextPaths = removeMaterialFromPath(
        pathsRef.current,
        focus.pathTempId,
        focus.nodeTempId,
        focus.materialTempId,
      );
      pathsRef.current = nextPaths;
      setPaths(nextPaths);
      clearDirtyKey(makeMaterialDirtyKey(focus.pathTempId, focus.nodeTempId, focus.materialTempId));
      return;
    }

    if (focus.type === 'lesson' && focus.nodeTempId) {
      if (keepParentDraft) return;

      const node = (path.nodes ?? []).find((item) => item.tempId === focus.nodeTempId);
      if (!isNewUnsavedNode(node)) return;

      const nextPaths = removeNodeFromPath(pathsRef.current, focus.pathTempId, focus.nodeTempId);
      pathsRef.current = nextPaths;
      setPaths(nextPaths);
      clearDirtyKey(makeNodeDirtyKey(focus.pathTempId, focus.nodeTempId));
      setExpandedNodes((prev) => {
        const next = { ...prev };
        delete next[focus.nodeTempId];
        return next;
      });
      return;
    }

    if (focus.type === 'chapter-edit') {
      if (keepParentDraft) return;

      if (!isNewUnsavedPath(path)) return;

      const nextPaths = removePathFromList(pathsRef.current, focus.pathTempId);
      pathsRef.current = nextPaths;
      setPaths(nextPaths);
      setDirtyKeys((prev) => {
        const next = clearDirtyKeysForPath(prev, focus.pathTempId);
        dirtyKeysRef.current = next;
        return next;
      });
      setExpandedPaths((prev) => {
        const next = { ...prev };
        delete next[focus.pathTempId];
        return next;
      });
    }
  }, [clearDirtyKey]);

  const revertActivePathChanges = useCallback(async (pathTempId, options = {}) => {
    if (!pathTempId) return;

    const focus = focusTargetRef.current;
    if (focus?.type === 'material' && focus.pathTempId === pathTempId) {
      const path = pathsRef.current.find((item) => item.tempId === pathTempId);
      const node = (path?.nodes ?? []).find((item) => item.tempId === focus.nodeTempId);
      const material = filterLearningMaterials(node?.materials ?? [])
        .find((item) => item.tempId === focus.materialTempId);
      if (getMaterialPersistentId(material)) {
        await handleRestoreMaterial(focus.pathTempId, focus.nodeTempId, focus.materialTempId);
      } else {
        discardUnsavedNewFocusEntity(options);
      }
      return;
    }
    if (focus?.type === 'lesson' && focus.pathTempId === pathTempId) {
      const path = pathsRef.current.find((item) => item.tempId === pathTempId);
      const node = (path?.nodes ?? []).find((item) => item.tempId === focus.nodeTempId);
      if (node?.NodeId) {
        await handleRestoreNode(focus.pathTempId, focus.nodeTempId);
      } else {
        discardUnsavedNewFocusEntity(options);
      }
      return;
    }
    if (focus?.type === 'chapter-edit' && focus.pathTempId === pathTempId) {
      const path = pathsRef.current.find((item) => item.tempId === pathTempId);
      if (path?.PathId) {
        await handleRestorePath(focus.pathTempId);
      } else {
        discardUnsavedNewFocusEntity(options);
      }
      return;
    }

    setDirtyKeys((prev) => {
      const next = clearDirtyKeysForPath(prev, pathTempId);
      dirtyKeysRef.current = next;
      return next;
    });
  }, [clearDirtyKey, discardUnsavedNewFocusEntity, handleRestoreMaterial, handleRestoreNode, handleRestorePath]);

  const requestContentNavigation = useCallback((navigateFn, options = {}) => {
    const currentPathId = activeChapterId;
    const focus = focusTargetRef.current;
    const isDirty = hasUnsavedEditScopeDirty(dirtyKeysRef.current, focus, currentPathId);
    const hasPendingNewFocus = hasPendingNewUnsavedFocus(focus, pathsRef.current);
    const needsConfirm = isDirty || hasPendingNewFocus;

    if (!needsConfirm) {
      navigateFn();
      return;
    }

    pendingNavigationRef.current = { navigateFn, options };
    setUnsavedNavDialogOpen(true);
  }, [activeChapterId]);

  requestNavigationRef.current = requestContentNavigation;

  useEffect(() => {
    if (!registerNavigationGuard) return undefined;
    return registerNavigationGuard((navigateFn) => {
      requestNavigationRef.current?.(navigateFn);
    });
  }, [registerNavigationGuard]);

  const handleGuardedLinkNavigate = useCallback((to) => (event) => {
    event.preventDefault();
    requestContentNavigation(() => navigate(to));
  }, [navigate, requestContentNavigation]);

  const handleAddPath = useCallback(() => {
    requestContentNavigation(performAddPath);
  }, [performAddPath, requestContentNavigation]);

  const handleAddNode = useCallback((pathTempId) => {
    requestContentNavigation(() => performAddNode(pathTempId), {
      keepParentDraft: (
        focusTargetRef.current?.type === 'chapter-edit'
        && focusTargetRef.current?.pathTempId === pathTempId
      ),
    });
  }, [performAddNode, requestContentNavigation]);

  const handleAddMaterial = useCallback((pathTempId, nodeTempId) => {
    requestContentNavigation(
      () => performAddMaterial(pathTempId, nodeTempId),
      { keepParentDraft: true },
    );
  }, [performAddMaterial, requestContentNavigation]);

  const handleRequestChapterChange = useCallback((nextChapterId) => {
    if (nextChapterId === activeChapterId) return;
    if (!nextChapterId) {
      requestContentNavigation(() => setActiveChapterId(null));
      return;
    }
    requestContentNavigation(() => {
      setActiveChapterId(nextChapterId);
      applyFocusTarget(null);
    });
  }, [activeChapterId, applyFocusTarget, requestContentNavigation]);

  const handleUnsavedNavCancel = () => {
    pendingNavigationRef.current = null;
    setUnsavedNavDialogOpen(false);
  };

  const handleUnsavedNavContinue = () => {
    const pending = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setUnsavedNavDialogOpen(false);
    void (async () => {
      await revertActivePathChanges(activeChapterId, pending?.options);
      pending?.navigateFn?.();
    })();
  };

  const handleSelectChapter = useCallback((pathTempId) => {
    const focus = focusTargetRef.current;
    const navigate = () => {
      setActiveChapterId(pathTempId);
      applyFocusTarget(null);
    };

    if (pathTempId === activeChapterId && !focus) {
      return;
    }

    if (
      pathTempId === activeChapterId
      && focus?.type === 'chapter-edit'
      && focus.pathTempId === pathTempId
    ) {
      return;
    }

    requestContentNavigation(navigate);
  }, [activeChapterId, applyFocusTarget, requestContentNavigation]);

  const handleEditChapter = useCallback((pathTempId) => {
    const navigate = () => {
      setActiveChapterId(pathTempId);
      applyFocusTarget({ type: 'chapter-edit', pathTempId });
    };

    if (
      pathTempId === activeChapterId
      && focusTarget?.type === 'chapter-edit'
      && focusTarget?.pathTempId === pathTempId
    ) {
      navigate();
      return;
    }

    requestContentNavigation(navigate);
  }, [activeChapterId, focusTarget, applyFocusTarget, requestContentNavigation]);

  const handleSelectNode = useCallback((pathTempId, nodeTempId) => {
    const focus = focusTargetRef.current;
    const navigate = () => {
      setActiveChapterId(pathTempId);
      applyFocusTarget({ type: 'lesson', pathTempId, nodeTempId });
      setExpandedNodes((prev) => ({ ...prev, [nodeTempId]: true }));
    };

    if (
      pathTempId === activeChapterId
      && focus?.type === 'lesson'
      && focus.pathTempId === pathTempId
      && focus.nodeTempId === nodeTempId
    ) {
      return;
    }

    requestContentNavigation(navigate);
  }, [activeChapterId, applyFocusTarget, requestContentNavigation]);

  const handleSelectMaterial = useCallback((pathTempId, nodeTempId, materialTempId) => {
    const focus = focusTargetRef.current;
    const navigate = () => {
      setActiveChapterId(pathTempId);
      applyFocusTarget({ type: 'material', pathTempId, nodeTempId, materialTempId });
      setExpandedNodes((prev) => ({ ...prev, [nodeTempId]: true }));
    };

    if (
      pathTempId === activeChapterId
      && focus?.type === 'material'
      && focus.pathTempId === pathTempId
      && focus.nodeTempId === nodeTempId
      && focus.materialTempId === materialTempId
    ) {
      return;
    }

    const keepParentDraft = (
      focus?.type === 'lesson'
      && focus.pathTempId === pathTempId
      && focus.nodeTempId === nodeTempId
    );

    requestContentNavigation(navigate, { keepParentDraft });
  }, [activeChapterId, applyFocusTarget, requestContentNavigation]);

  const handleBack = () => {
    requestContentNavigation(() => navigate(`/mentor/courses/${courseId}?tab=content`));
  };

  if (!ready || !coursePascal) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={32} sx={{ color: PRIMARY }} />
      </Box>
    );
  }

  const deleteDialogContent = getDeleteDialogContent(deleteConfirm);
  const busy = Boolean(updatingPathId || updatingNodeKey);

  const backButton = (
    <AppButton
      variant="outlined"
      startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 18 }} />}
      onClick={handleBack}
      disabled={busy}
      sx={{
        height: 42,
        borderRadius: '999px',
        fontWeight: 700,
        fontSize: 14,
        px: 2,
        width: { xs: '100%', lg: 'auto' },
      }}
    >
      Quay lại
    </AppButton>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', xl: 1600 }, mx: 'auto' }}>
      <Breadcrumbs
        separator="/"
        sx={{ mb: 1.5, '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 } }}
      >
        <MuiLink component={Link} to="/home" underline="hover" onClick={handleGuardedLinkNavigate('/home')} sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Trang chủ
        </MuiLink>
        <MuiLink component={Link} to="/mentor/courses" underline="hover" onClick={handleGuardedLinkNavigate('/mentor/courses')} sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Khóa học của tôi
        </MuiLink>
        <MuiLink component={Link} to={`/mentor/courses/${courseId}`} underline="hover" onClick={handleGuardedLinkNavigate(`/mentor/courses/${courseId}`)} sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Chi tiết khóa học
        </MuiLink>
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
          Chỉnh sửa nội dung
        </Typography>
      </Breadcrumbs>

      <Typography
        component="h1"
        sx={{
          fontSize: { xs: 15, sm: 16 },
          fontWeight: 600,
          color: MUTED,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          mb: 0.75,
        }}
      >
        Chỉnh sửa nội dung khóa học
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(280px, 4fr) minmax(0, 8fr)' },
          gap: { xs: 2, lg: 2 },
          alignItems: 'start',
        }}
      >
        <MentorCourseContentSidebar
          paths={paths}
          courseName={courseName}
          activeChapterId={activeChapterId}
          focusTarget={focusTarget}
          errors={validationErrors}
          dirtyKeys={dirtyKeys}
          onSelectChapter={handleSelectChapter}
          onEditChapter={handleEditChapter}
          onSelectNode={handleSelectNode}
          onSelectMaterial={handleSelectMaterial}
          onAddChapter={handleAddPath}
          onAddNode={handleAddNode}
          onAddMaterial={handleAddMaterial}
          onDeleteNewPath={requestDeleteNewPath}
          disabled={busy}
          footer={backButton}
        />

        <MentorCourseContentBuilder
          paths={paths}
          courseId={Number(courseId)}
          courseTitle={courseName}
          errors={validationErrors}
          expandedPaths={expandedPaths}
          expandedNodes={expandedNodes}
          onTogglePath={(id) =>
            setExpandedPaths((prev) => ({ ...prev, [id]: prev[id] === false }))
          }
          onToggleNode={(id) =>
            setExpandedNodes((prev) => ({ ...prev, [id]: prev[id] === false }))
          }
          onAddPath={handleAddPath}
          onPathChange={handlePathChange}
          onDeleteNewPath={requestDeleteNewPath}
          onAddNode={handleAddNode}
          onNodeChange={handleNodeChange}
          onAddMaterial={handleAddMaterial}
          onMaterialChange={handleMaterialChange}
          onMaterialReorder={handleMaterialReorder}
          disabled={busy}
          allowNodeDelete={false}
          allowMaterialDelete={false}
          dirtyKeys={dirtyKeys}
          showChapterSave={false}
          showPathUpdate
          updatingPathId={updatingPathId}
          onUpdatePath={handleUpdatePath}
          onRestorePath={handleRestorePath}
          showNodeUpdate
          updatingNodeKey={updatingNodeKey}
          onUpdateNode={handleUpdateNode}
          onRestoreNode={handleRestoreNode}
          showMaterialUpdate
          updatingMaterialKey={updatingMaterialKey}
          onUpdateMaterial={handleUpdateMaterial}
          onRestoreMaterial={handleRestoreMaterial}
          activeChapterId={activeChapterId}
          onActiveChapterChange={handleRequestChapterChange}
          onRequestContentNavigation={requestContentNavigation}
          focusTarget={focusTarget}
          sidebarLayout
          chapterQuizPathIds={chapterQuizPathIds}
        />
      </Box>

      <Box
        id={COURSE_CONTENT_MOBILE_BACK_ID}
        sx={{
          display: { xs: 'block', lg: 'none' },
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
          mt: 2.5,
          pt: 1.5,
          pb: 'max(20px, env(safe-area-inset-bottom, 0px))',
          bgcolor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        {backButton}
      </Box>

      <ScrollToTopButton
        avoidSelectors={['#app-site-footer', `#${COURSE_CONTENT_MOBILE_BACK_ID}`]}
      />

      <ConfirmDialog
        open={Boolean(saveConfirm)}
        onClose={() => {
          if (updatingPathId || updatingNodeKey || updatingMaterialKey) return;
          setSaveConfirm(null);
        }}
        onConfirm={handleConfirmScopedSave}
        title={saveConfirm?.title ?? 'Xác nhận cập nhật'}
        message={saveConfirm?.message ?? ''}
        confirmLabel={saveConfirm?.confirmLabel ?? 'Cập nhật'}
        cancelLabel="Hủy"
        loading={Boolean(updatingPathId || updatingNodeKey || updatingMaterialKey)}
      />

      <ConfirmDialog
        open={unsavedNavDialogOpen}
        onClose={handleUnsavedNavCancel}
        onConfirm={handleUnsavedNavContinue}
        title="Thay đổi chưa được lưu"
        message="Nếu bạn chuyển sang mục khác, các thay đổi sẽ không được lưu. Bạn có muốn tiếp tục?"
        confirmLabel="Tiếp tục"
        cancelLabel="Hủy"
      />

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={deleteDialogContent.title}
        message={deleteDialogContent.message}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        destructive
      />
    </Box>
  );
}
