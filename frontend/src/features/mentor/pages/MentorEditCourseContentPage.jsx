import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Breadcrumbs, CircularProgress, Link as MuiLink, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { toast } from '@/shared/ui/Toast';
import MentorCourseContentBuilder from '@/features/mentor/components/course/MentorCourseContentBuilder';
import MentorContentOverview from '@/features/mentor/components/course/MentorContentOverview';
import MentorCourseLeaveDialog from '@/features/mentor/components/course/MentorCourseLeaveDialog';
import MentorChapterDraftDialog from '@/features/mentor/components/course/MentorChapterDraftDialog';
import { MUTED, PAGE_TITLE_SX, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import { useMentorCourseLeaveGuard } from '@/features/mentor/hooks/useMentorCourseLeaveGuard';
import { fetchMentorCourseDetail } from '@/features/mentor/services/mentorCourseService';
import { getUser } from '@/features/auth/utils/authUtils';
import { uploadPendingMaterialsInPaths, hydrateTextMaterialsInPaths } from '@/features/mentor/utils/mentorMaterialUploadUtils';
import {
  courseDetailToEditCourse,
  loadEditCourseDraft,
  mapDetailPathsToEditPaths,
  persistEditContent,
} from '@/features/mentor/utils/mentorCourseEditStorage';
import {
  createEmptyMaterial,
  createEmptyNode,
  createEmptyPath,
  getFirstContentErrorTarget,
  hasContentValidationErrors,
  isPathSnapshotSaved,
  MATERIAL_TYPE_LABELS,
  reorderMaterials,
  scrollToContentItem,
  serializePathSnapshot,
  validateCourseContent,
  validatePathForSave,
  withNormalizedOrders,
} from '@/features/mentor/utils/mentorCourseContentUtils';

// ─── pure helpers ─────────────────────────────────────────────────────────────

function getDeleteDialogContent(deleteConfirm) {
  if (!deleteConfirm) return { title: 'Xác nhận', message: '' };
  if (deleteConfirm.type === 'chapter') {
    return {
      title: 'Xóa chương?',
      message: `Bạn có chắc muốn xóa "${deleteConfirm.label}"? Toàn bộ bài học và học liệu trong chương sẽ bị xóa.`,
    };
  }
  if (deleteConfirm.type === 'lesson') {
    return {
      title: 'Xóa bài học?',
      message: `Bạn có chắc muốn xóa "${deleteConfirm.label}"? Toàn bộ học liệu trong bài học sẽ bị xóa.`,
    };
  }
  return {
    title: 'Xóa học liệu?',
    message: `Bạn có chắc muốn xóa "${deleteConfirm.label}"? Nội dung học liệu sẽ bị xóa vĩnh viễn.`,
  };
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
          materials: (node.materials ?? node.Materials ?? []).map((material) =>
            material.tempId === materialTempId ? { ...material, ...patch } : material,
          ),
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
  const [savedPathSnapshots, setSavedPathSnapshots] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [savingChapterId, setSavingChapterId] = useState(null);
  const [chapterDraftDialogOpen, setChapterDraftDialogOpen] = useState(false);
  const [pendingChapterTempId, setPendingChapterTempId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const instructorId = getUser()?.userId ?? null;
  const courseName = coursePascal?.CourseName ?? '';

  const isDirty = useMemo(
    () => paths.some((p) => !isPathSnapshotSaved(p, savedPathSnapshots[p.tempId])),
    [paths, savedPathSnapshots],
  );

  const buildSnapshots = useCallback((nextPaths) => {
    const snap = {};
    nextPaths.forEach((p) => { snap[p.tempId] = serializePathSnapshot(p); });
    return snap;
  }, []);

  const doPersist = useCallback(
    async ({ markAllSaved = true } = {}) => {
      if (!coursePascal) return;
      persistEditContent(courseId, coursePascal, paths);
      setIsSaved(true);
      if (markAllSaved) setSavedPathSnapshots(buildSnapshots(paths));
    },
    [buildSnapshots, courseId, coursePascal, paths],
  );

  const { dialogOpen, saving, requestLeave, handleStay, handleDiscard, handleSaveDraft } =
    useMentorCourseLeaveGuard({
      isDirty,
      form: {},
      instructorId,
      onPersistDraft: doPersist,
    });

  // ── initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Try edit storage first (basic info may already be filled from step 1)
      const existingDraft = loadEditCourseDraft(courseId);

      let resolvedCoursePascal = existingDraft?.course ?? null;
      let resolvedPaths = existingDraft?.paths ?? null;

      if (!resolvedCoursePascal || !resolvedPaths) {
        // Fetch from server
        const result = await fetchMentorCourseDetail(courseId);
        if (cancelled) return;

        if (!result.success) {
          toast.error('Không thể tải nội dung khóa học.');
          navigate(`/mentor/courses/${courseId}`, { replace: true });
          return;
        }

        if (!resolvedCoursePascal) {
          resolvedCoursePascal = courseDetailToEditCourse(result.course);
        }
        if (!resolvedPaths) {
          resolvedPaths = mapDetailPathsToEditPaths(
            result.course.Paths ?? result.course.paths ?? [],
          );
        }
      }

      if (cancelled) return;

      const hydratedPaths = await hydrateTextMaterialsInPaths(resolvedPaths);
      if (cancelled) return;

      const loaded = withNormalizedOrders(hydratedPaths);
      const snapshots = buildSnapshots(loaded);

      setCoursePascal(resolvedCoursePascal);
      setPaths(loaded);
      setSavedPathSnapshots(snapshots);
      setIsSaved(Boolean(existingDraft?.meta?.contentSaved) || loaded.length > 0);
      setReady(true);
    })();

    return () => { cancelled = true; };
  }, [buildSnapshots, courseId, navigate]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // ── path / node / material handlers ────────────────────────────────────────

  const applyPaths = useCallback((updater) => {
    setPaths((prev) => withNormalizedOrders(updater(prev)));
    setValidationErrors({ root: [], paths: {} });
  }, []);

  const handleAddPath = () => {
    const newPath = createEmptyPath();
    applyPaths((prev) => [...prev, newPath]);
    setExpandedPaths((prev) => ({ ...prev, [newPath.tempId]: true }));
  };

  const handlePathChange = (pathTempId, patch) =>
    applyPaths((prev) => updatePathInList(prev, pathTempId, patch));

  const handlePathDelete = (pathTempId) => {
    applyPaths((prev) => prev.filter((p) => p.tempId !== pathTempId));
    setSavedPathSnapshots((prev) => { const n = { ...prev }; delete n[pathTempId]; return n; });
    setExpandedPaths((prev) => { const n = { ...prev }; delete n[pathTempId]; return n; });
  };

  const requestDeletePath = (pathTempId) => {
    const p = paths.find((x) => x.tempId === pathTempId);
    setDeleteConfirm({ type: 'chapter', pathTempId, label: String(p?.PathName ?? '').trim() || 'Chương này' });
  };

  const requestDeleteNode = (pathTempId, nodeTempId) => {
    const p = paths.find((x) => x.tempId === pathTempId);
    const n = (p?.nodes ?? p?.Nodes ?? []).find((x) => x.tempId === nodeTempId);
    setDeleteConfirm({ type: 'lesson', pathTempId, nodeTempId, label: String(n?.NodeName ?? '').trim() || 'Bài học này' });
  };

  const requestDeleteMaterial = (pathTempId, nodeTempId, materialTempId) => {
    const p = paths.find((x) => x.tempId === pathTempId);
    const n = (p?.nodes ?? p?.Nodes ?? []).find((x) => x.tempId === nodeTempId);
    const m = (n?.materials ?? n?.Materials ?? []).find((x) => x.tempId === materialTempId);
    const title = String(m?.Title ?? '').trim();
    const typeLabel = MATERIAL_TYPE_LABELS[m?.MaterialType] ?? 'Học liệu';
    setDeleteConfirm({ type: 'material', pathTempId, nodeTempId, materialTempId, label: title || `${typeLabel} này` });
  };

  const handleNodeDelete = (pathTempId, nodeTempId) => {
    applyPaths((prev) =>
      prev.map((p) =>
        p.tempId === pathTempId
          ? {
              ...p,
              nodes: (p.nodes ?? p.Nodes ?? []).filter((n) => n.tempId !== nodeTempId),
            }
          : p,
      ),
    );
    setExpandedNodes((prev) => { const n = { ...prev }; delete n[nodeTempId]; return n; });
  };

  const handleMaterialDelete = (pathTempId, nodeTempId, materialTempId) => {
    applyPaths((prev) =>
      prev.map((p) => {
        if (p.tempId !== pathTempId) return p;
        return {
          ...p,
          nodes: (p.nodes ?? p.Nodes ?? []).map((n) =>
            n.tempId !== nodeTempId
              ? n
              : {
                  ...n,
                  materials: (n.materials ?? n.Materials ?? []).filter(
                    (m) => m.tempId !== materialTempId,
                  ),
                },
          ),
        };
      }),
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'chapter') handlePathDelete(deleteConfirm.pathTempId);
    else if (deleteConfirm.type === 'lesson') handleNodeDelete(deleteConfirm.pathTempId, deleteConfirm.nodeTempId);
    else handleMaterialDelete(deleteConfirm.pathTempId, deleteConfirm.nodeTempId, deleteConfirm.materialTempId);
    setDeleteConfirm(null);
  };

  const handleAddNode = (pathTempId) => {
    const newNode = createEmptyNode();
    applyPaths((prev) =>
      prev.map((p) =>
        p.tempId === pathTempId
          ? { ...p, nodes: [...(p.nodes ?? p.Nodes ?? []), newNode] }
          : p,
      ),
    );
    setExpandedNodes((prev) => ({ ...prev, [newNode.tempId]: true }));
  };

  const handleNodeChange = (pathTempId, nodeTempId, patch) =>
    applyPaths((prev) => updateNodeInPath(prev, pathTempId, nodeTempId, patch));

  const handleAddMaterial = (pathTempId, nodeTempId) => {
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
  };

  const handleMaterialChange = (pathTempId, nodeTempId, materialTempId, patch) =>
    applyPaths((prev) => updateMaterialInPath(prev, pathTempId, nodeTempId, materialTempId, patch));

  const handleMaterialReorder = (pathTempId, nodeTempId, fromIndex, toIndex) => {
    applyPaths((prev) =>
      prev.map((p) => {
        if (p.tempId !== pathTempId) return p;
        return {
          ...p,
          nodes: (p.nodes ?? p.Nodes ?? []).map((n) =>
            n.tempId !== nodeTempId
              ? n
              : {
                  ...n,
                  materials: reorderMaterials(
                    n.materials ?? n.Materials ?? [],
                    fromIndex,
                    toIndex,
                  ),
                },
          ),
        };
      }),
    );
  };

  // ── chapter save ────────────────────────────────────────────────────────────

  const executeChapterSave = async (pathTempId) => {
    const p = paths.find((x) => x.tempId === pathTempId);
    if (!p) return false;

    const pathErrors = validatePathForSave(p);
    if (pathErrors.PathName) {
      setValidationErrors((prev) => ({
        ...prev,
        paths: { ...(prev.paths ?? {}), [pathTempId]: { ...(prev.paths?.[pathTempId] ?? {}), ...pathErrors } },
      }));
      toast.error(pathErrors.PathName);
      return false;
    }

    setSavingChapterId(pathTempId);
    try {
      await doPersist({ markAllSaved: false });
      setSavedPathSnapshots((prev) => ({ ...prev, [pathTempId]: serializePathSnapshot(p) }));
      toast.success('Đã lưu chương.');
      return true;
    } finally {
      setSavingChapterId(null);
    }
  };

  const handleSaveChapter = (pathTempId) => {
    if (!isSaved) {
      setPendingChapterTempId(pathTempId);
      setChapterDraftDialogOpen(true);
      return;
    }
    void executeChapterSave(pathTempId);
  };

  const handleChapterDraftDialogSave = async () => {
    if (!pendingChapterTempId) return;
    const saved = await executeChapterSave(pendingChapterTempId);
    if (!saved) return;
    setIsSaved(true);
    setChapterDraftDialogOpen(false);
    setPendingChapterTempId(null);
  };

  // ── submit (Lưu nội dung → review) ─────────────────────────────────────────

  const handleNavigateToContent = useCallback((target) => {
    scrollToContentItem(target, { setExpandedPaths, setExpandedNodes });
  }, []);

  const handleSaveContent = async () => {
    const errors = validateCourseContent(paths, { courseId: Number(courseId) });
    setValidationErrors(errors);

    if (hasContentValidationErrors(errors)) {
      toast.error('Vui lòng kiểm tra lại cấu trúc nội dung khóa học.');

      setExpandedPaths((prev) => {
        const next = { ...prev };
        paths.forEach((p) => { if (errors.paths?.[p.tempId]) next[p.tempId] = true; });
        return next;
      });
      setExpandedNodes((prev) => {
        const next = { ...prev };
        paths.forEach((p) => {
          const pe = errors.paths?.[p.tempId];
          if (!pe?.nodes) return;
          (p.nodes ?? []).forEach((n) => { if (pe.nodes[n.tempId]) next[n.tempId] = true; });
        });
        return next;
      });

      const target = getFirstContentErrorTarget(errors, paths);
      if (target) {
        setTimeout(() => {
          document
            .querySelector(`[data-content-error="${target}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 180);
      }
      return;
    }

    setSubmitting(true);
    try {
      const uploadedPaths = await uploadPendingMaterialsInPaths(paths);
      persistEditContent(courseId, coursePascal, uploadedPaths);
      navigate(`/mentor/courses/${courseId}/review`);
    } catch (error) {
      toast.error(error?.message || 'Không thể tải học liệu lên. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraftClick = async () => {
    setSavingDraft(true);
    try {
      await doPersist();
      toast.success('Đã lưu bản nháp nội dung khóa học.');
    } finally {
      setSavingDraft(false);
    }
  };

  if (!ready || !coursePascal) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={32} sx={{ color: PRIMARY }} />
      </Box>
    );
  }

  const deleteDialogContent = getDeleteDialogContent(deleteConfirm);
  const busy = submitting || savingDraft || Boolean(savingChapterId) || saving;

  const footerActions = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, width: '100%' }}>
      <AppButton
        variant="outlined"
        startIcon={<ArrowBackRoundedIcon sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />}
        onClick={() => navigate(`/mentor/courses/${courseId}/edit`)}
        disabled={busy}
        sx={{
          flex: '1 1 0', minWidth: 0, height: 42, borderRadius: '999px',
          fontWeight: 700, fontSize: { xs: 12, sm: 13 }, px: { xs: 1, sm: 2 },
        }}
      >
        Quay lại
      </AppButton>
      <AppButton
        variant="outlined"
        onClick={handleSaveDraftClick}
        loading={savingDraft}
        disabled={submitting || saving}
        sx={{
          flex: '1 1 0', minWidth: 0, height: 42, borderRadius: '999px',
          fontWeight: 700, fontSize: { xs: 12, sm: 13 }, px: { xs: 1, sm: 2 },
        }}
      >
        Lưu nháp
      </AppButton>
      <AppButton
        onClick={handleSaveContent}
        loading={submitting}
        endIcon={!submitting ? <SaveRoundedIcon sx={{ fontSize: 16 }} /> : undefined}
        disabled={savingDraft || saving}
        sx={{
          flex: '1 1 0', minWidth: 0, height: 42, borderRadius: '999px',
          fontWeight: 700, fontSize: { xs: 12, sm: 13 }, px: { xs: 1, sm: 2 },
          bgcolor: PRIMARY, '&:hover': { bgcolor: '#0E7490' },
        }}
      >
        Lưu nội dung
      </AppButton>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 } }}
      >
        <MuiLink component={Link} to="/home" underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Trang chủ
        </MuiLink>
        <MuiLink component={Link} to="/mentor/courses" underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Khóa học của tôi
        </MuiLink>
        <MuiLink component={Link} to={`/mentor/courses/${courseId}`} underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Chi tiết khóa học
        </MuiLink>
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
          Chỉnh sửa nội dung
        </Typography>
      </Breadcrumbs>

      <Typography component="h1" sx={{ ...PAGE_TITLE_SX, mb: 1.75, maxWidth: 720 }}>
        Chỉnh sửa nội dung khóa học
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(280px, 3fr)' },
          gap: { xs: 2, lg: 2.5 },
          alignItems: 'start',
        }}
      >
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
          onPathDelete={requestDeletePath}
          onAddNode={handleAddNode}
          onNodeChange={handleNodeChange}
          onNodeDelete={requestDeleteNode}
          onAddMaterial={handleAddMaterial}
          onMaterialChange={handleMaterialChange}
          onMaterialDelete={requestDeleteMaterial}
          onMaterialReorder={handleMaterialReorder}
          disabled={busy}
          savedPathSnapshots={savedPathSnapshots}
          savingChapterId={savingChapterId}
          onSaveChapter={handleSaveChapter}
        />

        <MentorContentOverview
          paths={paths}
          courseId={Number(courseId)}
          courseName={courseName}
          footer={footerActions}
          onNavigateToItem={handleNavigateToContent}
        />
      </Box>

      <Box sx={{ display: { xs: 'flex', lg: 'none' }, mt: 2.5 }}>
        {footerActions}
      </Box>

      <MentorCourseLeaveDialog
        open={dialogOpen}
        onStay={handleStay}
        onDiscard={handleDiscard}
        onSaveDraft={handleSaveDraft}
        saving={saving}
      />

      <MentorChapterDraftDialog
        open={chapterDraftDialogOpen}
        onCancel={() => {
          if (savingChapterId) return;
          setChapterDraftDialogOpen(false);
          setPendingChapterTempId(null);
        }}
        onSaveDraft={handleChapterDraftDialogSave}
        saving={Boolean(savingChapterId)}
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
