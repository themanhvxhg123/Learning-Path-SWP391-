import { Box, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import AppButton from '@/shared/ui/AppButton';
import MentorChapterCard from './MentorChapterCard';
import MentorChapterTabs from './MentorChapterTabs';
import MentorSectionTabToggle from './MentorSectionTabToggle';
import { MUTED, PRIMARY, TEXT } from './mentorCourseCreateStyles';
import {
  BUILDER_PANEL_SX,
  scopedEditorBarSx,
  scopedRestoreButtonSx,
  scopedUpdateButtonSx,
} from './mentorCourseContentStyles';
import { PathPublishToggle, NodePublishToggle } from './MentorPublishToggles';
import { filterLearningMaterials, getMaterialPersistentId, isEditDirty, isMaterialFileUploadPending, makePathDirtyKey, makeNodeDirtyKey, makeMaterialDirtyKey, resolveChapterId, chapterHasContent, chapterCanPublish, getChapterPublishBlockReason, getChapterUnpublishBlockReason, lessonCanPublish, getLessonPublishBlockReason, getLessonUnpublishBlockReason, isPathActive, isNodeActive } from '@/features/mentor/utils/mentorCourseContentUtils';

export default function MentorCourseContentBuilder({
  paths,
  errors = {},
  expandedPaths = {},
  expandedNodes = {},
  onTogglePath,
  onToggleNode,
  onAddPath,
  onPathChange,
  onDeleteNewPath,
  onAddNode,
  onNodeChange,
  onNodeDelete,
  onAddMaterial,
  onMaterialChange,
  onMaterialDelete,
  onMaterialReorder,
  disabled = false,
  allowNodeDelete = true,
  allowMaterialDelete = true,
  dirtyKeys = {},
  savingChapterId = null,
  onSaveChapter,
  showChapterSave = true,
  showPathUpdate = false,
  updatingPathId = null,
  onUpdatePath,
  onRestorePath,
  showNodeUpdate = false,
  updatingNodeKey = null,
  onUpdateNode,
  onRestoreNode,
  showMaterialUpdate = false,
  updatingMaterialKey = null,
  onUpdateMaterial,
  onRestoreMaterial,
  activeChapterId: controlledActiveChapterId,
  onActiveChapterChange,
  onRequestContentNavigation,
  courseId = null,
  courseTitle = '',
  focusTarget = null,
  sidebarLayout = false,
  chapterQuizPathIds = null,
}) {
  const [internalActiveChapterId, setInternalActiveChapterId] = useState(() => paths[0]?.tempId ?? null);
  const isControlledChapter = controlledActiveChapterId !== undefined;
  const activeChapterId = isControlledChapter ? controlledActiveChapterId : internalActiveChapterId;

  const setActiveChapterId = useCallback((nextChapterId) => {
    if (isControlledChapter) {
      onActiveChapterChange?.(nextChapterId);
      return;
    }
    setInternalActiveChapterId(nextChapterId);
  }, [isControlledChapter, onActiveChapterChange]);

  const requestActiveChapterChange = useCallback((nextChapterId) => {
    if (!nextChapterId || nextChapterId === activeChapterId) return;
    const navigate = () => setActiveChapterId(nextChapterId);
    if (onRequestContentNavigation) {
      onRequestContentNavigation(navigate);
      return;
    }
    navigate();
  }, [activeChapterId, onRequestContentNavigation, setActiveChapterId]);
  const [chapterSectionOpen, setChapterSectionOpen] = useState(true);
  const pendingSelectLastRef = useRef(false);
  const activeChapterIndexRef = useRef(0);

  const hasErrorById = useMemo(() => {
    const map = {};
    for (const path of paths) {
      map[path.tempId] = Boolean(errors.paths?.[path.tempId]);
    }
    return map;
  }, [errors.paths, paths]);

  const hasContentById = useMemo(() => {
    const map = {};
    for (const path of paths) {
      map[path.tempId] = chapterHasContent(path);
    }
    return map;
  }, [paths]);

  useEffect(() => {
    if (paths.length === 0) {
      setActiveChapterId(null);
      return;
    }
    // Chọn chương mới sau khi thêm — effect riêng xử lý, không qua guard.
    if (pendingSelectLastRef.current) return;

    const stillExists = paths.some((p) => p.tempId === activeChapterId);
    if (!stillExists) {
      const nextIdx = Math.max(0, activeChapterIndexRef.current - 1);
      setActiveChapterId(
        paths[Math.min(nextIdx, paths.length - 1)]?.tempId ?? paths[0]?.tempId,
      );
    }
  }, [paths, activeChapterId, setActiveChapterId]);

  useEffect(() => {
    if (isControlledChapter) return;
    if (focusTarget?.pathTempId) {
      setInternalActiveChapterId(focusTarget.pathTempId);
    }
  }, [focusTarget, isControlledChapter]);

  useEffect(() => {
    setChapterSectionOpen(true);
  }, [activeChapterId]);

  useEffect(() => {
    if (pendingSelectLastRef.current && paths.length > 0) {
      // Chọn chương mới sau khi thêm — không hỏi lưu nháp.
      setActiveChapterId(paths[paths.length - 1].tempId);
      pendingSelectLastRef.current = false;
    }
  }, [paths, setActiveChapterId]);

  const activePathIndex = paths.findIndex((p) => p.tempId === activeChapterId);
  const activePath = activePathIndex >= 0 ? paths[activePathIndex] : null;
  const activePathPublishBlockReason = activePath && !chapterCanPublish(activePath)
    ? getChapterPublishBlockReason(activePath)
    : null;
  const activePathHideBlockReason = activePath
    ? getChapterUnpublishBlockReason(activePath, { chapterQuizPathIds })
    : null;
  const activePathDirty = Boolean(
    activePath && isEditDirty(dirtyKeys, makePathDirtyKey(activePath.tempId)),
  );
  const updatingPath = updatingPathId === activePath?.tempId;
  const showChapterEdit = !sidebarLayout || (
    focusTarget?.type === 'chapter-edit'
    && focusTarget.pathTempId === activePath?.tempId
  );
  const showNodeContent = !sidebarLayout || (
    focusTarget?.type === 'lesson'
    && focusTarget.pathTempId === activePath?.tempId
    && focusTarget.nodeTempId
  );
  const showMaterialContent = !sidebarLayout || (
    focusTarget?.type === 'material'
    && focusTarget.pathTempId === activePath?.tempId
    && focusTarget.nodeTempId
    && focusTarget.materialTempId
  );
  const showRightEditor = !sidebarLayout || showChapterEdit || showNodeContent || showMaterialContent;

  const activeNodeTempId = (showNodeContent || showMaterialContent) ? focusTarget?.nodeTempId : null;
  const activeMaterialTempId = showMaterialContent ? focusTarget?.materialTempId : null;
  const activeNode = useMemo(() => {
    if (!activePath || !activeNodeTempId) return null;
    return (activePath.nodes ?? activePath.Nodes ?? []).find((node) => node.tempId === activeNodeTempId) ?? null;
  }, [activePath, activeNodeTempId]);
  const activeMaterial = useMemo(() => {
    if (!activeNode || !activeMaterialTempId) return null;
    return filterLearningMaterials(activeNode.materials ?? activeNode.Materials ?? [])
      .find((material) => material.tempId === activeMaterialTempId) ?? null;
  }, [activeNode, activeMaterialTempId]);
  const activeNodeDirty = Boolean(
    activePath
    && activeNode
    && isEditDirty(dirtyKeys, makeNodeDirtyKey(activePath.tempId, activeNode.tempId)),
  );
  const activeMaterialDirty = Boolean(
    activePath
    && activeNode
    && activeMaterial
    && isEditDirty(
      dirtyKeys,
      makeMaterialDirtyKey(activePath.tempId, activeNode.tempId, activeMaterial.tempId),
    ),
  );
  const activeMaterialUploadPending = isMaterialFileUploadPending(activeMaterial);
  const updatingActiveNode = Boolean(
    activePath && activeNodeTempId && updatingNodeKey === `${activePath.tempId}:${activeNodeTempId}`,
  );
  const updatingActiveMaterial = Boolean(
    activePath
    && activeNodeTempId
    && activeMaterialTempId
    && updatingMaterialKey === `${activePath.tempId}:${activeNodeTempId}:${activeMaterialTempId}`,
  );
  const activeNodeNeedsPathFirst = Boolean(activePath && !activePath.PathId);
  const activeMaterialNeedsNodeFirst = Boolean(activePath && activeNode && !activeNode.NodeId);
  const activeNodePublishBlockReason = activeNode && !isNodeActive(activeNode) && !lessonCanPublish(activeNode)
    ? getLessonPublishBlockReason(activeNode)
    : null;
  const activeNodeHideBlockReason = activePath && activeNode
    ? getLessonUnpublishBlockReason(activeNode, activePath, { chapterQuizPathIds })
    : null;

  useEffect(() => {
    if (activePathIndex >= 0) activeChapterIndexRef.current = activePathIndex;
  }, [activePathIndex]);

  const handleAddChapterClick = () => {
    pendingSelectLastRef.current = true;
    onAddPath?.();
  };

  const handleDeleteNewPath = useCallback((pathTempId) => {
    onDeleteNewPath?.(pathTempId);
  }, [onDeleteNewPath]);

  return (
    <>
      <Box id="content-builder-root" data-content-error="content-builder-root">
        {(errors.root ?? []).length > 0 && (
          <Box
            sx={{
              mb: 2,
              px: 1.5,
              py: 1,
              borderRadius: '10px',
              bgcolor: 'rgba(220,38,38,0.04)',
              border: '1px solid rgba(220,38,38,0.12)',
            }}
          >
            {(errors.root ?? []).map((message) => (
              <Typography key={message} sx={{ fontSize: 13, color: '#DC2626' }}>
                {message}
              </Typography>
            ))}
          </Box>
        )}

        {paths.length === 0 ? (
          <Box sx={{ ...BUILDER_PANEL_SX, textAlign: 'center', py: 5, px: 2.5 }}>
            <MenuBookOutlinedIcon sx={{ fontSize: 36, color: MUTED, mb: 1.5 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: TEXT, mb: 0.5 }}>
              Chưa có chương nào
            </Typography>
            <Typography sx={{ fontSize: 14, color: MUTED, mb: 2.5, maxWidth: 420, mx: 'auto', lineHeight: 1.55 }}>
              Thêm chương đầu tiên để bắt đầu xây dựng nội dung khóa học.
            </Typography>
            <AppButton
              onClick={handleAddChapterClick}
              disabled={disabled}
              startIcon={<AddRoundedIcon />}
              sx={{
                height: 40,
                borderRadius: '10px',
                fontWeight: 600,
                bgcolor: PRIMARY,
                '&:hover': { bgcolor: '#0E7490' },
              }}
            >
              Thêm chương
            </AppButton>
          </Box>
        ) : (
          <Box>
            {!sidebarLayout ? (
              <MentorChapterTabs
                paths={paths}
                activeId={activeChapterId}
                onChange={requestActiveChapterChange}
                onAdd={handleAddChapterClick}
                disabled={disabled}
                hasErrorById={hasErrorById}
                hasContentById={hasContentById}
                trailingActions={
                  <MentorSectionTabToggle
                    label="Chương"
                    expanded={chapterSectionOpen}
                    onToggle={() => setChapterSectionOpen((v) => !v)}
                  />
                }
              />
            ) : null}

            <Box
              sx={{
                ...BUILDER_PANEL_SX,
                borderRadius: sidebarLayout ? '14px' : '0 0 14px 14px',
                borderTop: sidebarLayout ? undefined : '1px solid rgba(15,23,42,0.1)',
                overflow: 'visible',
              }}
            >
              {activePath ? (
                <>
                {showPathUpdate && showChapterEdit ? (
                  <Box sx={scopedEditorBarSx(activePathDirty)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
                      <PathPublishToggle
                        path={activePath}
                        onChange={onPathChange}
                        disabled={disabled}
                        publishBlockReason={activePathPublishBlockReason}
                        hideBlockReason={activePathHideBlockReason}
                      />
                      {activePathPublishBlockReason ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          {activePathPublishBlockReason}
                        </Typography>
                      ) : null}
                      {activePathHideBlockReason ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          {activePathHideBlockReason}
                        </Typography>
                      ) : null}
                      {activePathDirty ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          Thông tin chương chưa lưu.
                        </Typography>
                      ) : null}
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flexShrink: 0 }}>
                      {activePath.PathId ? (
                        <AppButton
                          startIcon={<UndoRoundedIcon />}
                          onClick={() => onRestorePath?.(activePath.tempId)}
                          disabled={disabled || updatingPath || !activePathDirty}
                          sx={scopedRestoreButtonSx(activePathDirty)}
                        >
                          Khôi phục
                        </AppButton>
                      ) : null}
                      <AppButton
                        startIcon={<SaveOutlinedIcon />}
                        onClick={() => onUpdatePath?.(activePath.tempId)}
                        disabled={disabled || updatingPath || !activePathDirty}
                        sx={scopedUpdateButtonSx(activePathDirty)}
                      >
                        {updatingPath ? 'Đang cập nhật...' : 'Cập nhật path'}
                      </AppButton>
                    </Box>
                  </Box>
                ) : null}
                {showNodeUpdate && showNodeContent && activeNode ? (
                  <Box sx={scopedEditorBarSx(activeNodeDirty)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
                      <NodePublishToggle
                        node={activeNode}
                        onChange={(nodeTempId, patch) =>
                          onNodeChange(activePath.tempId, nodeTempId, patch)
                        }
                        disabled={disabled}
                        publishBlockReason={activeNodePublishBlockReason}
                        hideBlockReason={activeNodeHideBlockReason}
                      />
                      {activeNodePublishBlockReason ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          {activeNodePublishBlockReason}
                        </Typography>
                      ) : null}
                      {activeNodeHideBlockReason ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          {activeNodeHideBlockReason}
                        </Typography>
                      ) : null}
                      {activeNodeNeedsPathFirst ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          Cập nhật path trước khi lưu bài học này.
                        </Typography>
                      ) : activeNodeDirty ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          Thông tin bài học chưa lưu.
                        </Typography>
                      ) : null}
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flexShrink: 0 }}>
                      {activeNode.NodeId ? (
                        <AppButton
                          startIcon={<UndoRoundedIcon />}
                          onClick={() => onRestoreNode?.(activePath.tempId, activeNode.tempId)}
                          disabled={
                            disabled
                            || updatingActiveNode
                            || !activeNodeDirty
                            || activeNodeNeedsPathFirst
                          }
                          sx={scopedRestoreButtonSx(activeNodeDirty && !activeNodeNeedsPathFirst)}
                        >
                          Khôi phục
                        </AppButton>
                      ) : null}
                      <AppButton
                        startIcon={<SaveOutlinedIcon />}
                        onClick={() => onUpdateNode?.(activePath.tempId, activeNode.tempId)}
                        disabled={
                          disabled
                          || updatingActiveNode
                          || !activeNodeDirty
                          || activeNodeNeedsPathFirst
                        }
                        sx={scopedUpdateButtonSx(activeNodeDirty && !activeNodeNeedsPathFirst)}
                      >
                        {updatingActiveNode ? 'Đang cập nhật...' : 'Cập nhật Node'}
                      </AppButton>
                    </Box>
                  </Box>
                ) : null}
                {showMaterialUpdate && showMaterialContent && activeNode && activeMaterial ? (
                  <Box sx={scopedEditorBarSx(activeMaterialDirty)}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      {activeNodeNeedsPathFirst ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          Cập nhật path trước khi lưu học liệu này.
                        </Typography>
                      ) : activeMaterialNeedsNodeFirst ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          Cập nhật node trước khi lưu học liệu này.
                        </Typography>
                      ) : activeMaterialUploadPending ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          Đang tải file lên, vui lòng đợi hoàn tất trước khi cập nhật.
                        </Typography>
                      ) : activeMaterialDirty ? (
                        <Typography sx={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                          Học liệu chưa lưu.
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                          Học liệu đã đồng bộ.
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flexShrink: 0 }}>
                      {getMaterialPersistentId(activeMaterial) ? (
                        <AppButton
                          startIcon={<UndoRoundedIcon />}
                          onClick={() => onRestoreMaterial?.(
                            activePath.tempId,
                            activeNode.tempId,
                            activeMaterial.tempId,
                          )}
                          disabled={
                            disabled
                            || updatingActiveMaterial
                            || !activeMaterialDirty
                            || activeMaterialUploadPending
                            || activeNodeNeedsPathFirst
                            || activeMaterialNeedsNodeFirst
                          }
                          sx={scopedRestoreButtonSx(
                            activeMaterialDirty
                            && !activeMaterialUploadPending
                            && !activeNodeNeedsPathFirst
                            && !activeMaterialNeedsNodeFirst,
                          )}
                        >
                          Khôi phục
                        </AppButton>
                      ) : null}
                      <AppButton
                        startIcon={<SaveOutlinedIcon />}
                        onClick={() => onUpdateMaterial?.(
                          activePath.tempId,
                          activeNode.tempId,
                          activeMaterial.tempId,
                        )}
                        disabled={
                          disabled
                          || updatingActiveMaterial
                          || !activeMaterialDirty
                          || activeMaterialUploadPending
                          || activeNodeNeedsPathFirst
                          || activeMaterialNeedsNodeFirst
                        }
                        sx={scopedUpdateButtonSx(
                          activeMaterialDirty
                          && !activeMaterialUploadPending
                          && !activeNodeNeedsPathFirst
                          && !activeMaterialNeedsNodeFirst,
                        )}
                      >
                        {updatingActiveMaterial ? 'Đang cập nhật...' : 'Cập nhật học liệu'}
                      </AppButton>
                    </Box>
                  </Box>
                ) : null}
                {showRightEditor ? (
                <MentorChapterCard
                  key={activePath.tempId}
                  path={activePath}
                  pathIndex={activePathIndex}
                  courseId={courseId}
                  chapterId={resolveChapterId(activePath, activePathIndex)}
                  errors={errors.paths?.[activePath.tempId] ?? {}}
                  expanded
                  tabMode
                  expandedNodes={expandedNodes}
                  onToggle={() => onTogglePath(activePath.tempId)}
                  onToggleNode={onToggleNode}
                  onChange={onPathChange}
                  onDeleteNewPath={handleDeleteNewPath}
                  onAddNode={() => onAddNode(activePath.tempId)}
                  onNodeChange={(nodeTempId, patch) =>
                    onNodeChange(activePath.tempId, nodeTempId, patch)
                  }
                  onNodeDelete={onNodeDelete}
                  onAddMaterial={onAddMaterial}
                  onMaterialChange={onMaterialChange}
                  onMaterialDelete={onMaterialDelete}
                  onMaterialReorder={onMaterialReorder}
                  disabled={disabled}
                  allowNodeDelete={allowNodeDelete}
                  allowMaterialDelete={allowMaterialDelete}
                  isSaved={!isEditDirty(dirtyKeys, makePathDirtyKey(activePath.tempId))}
                  saving={savingChapterId === activePath.tempId}
                  showSave={showChapterSave}
                  onSave={() => onSaveChapter?.(activePath.tempId)}
                  showNodeUpdate={showNodeUpdate}
                  dirtyKeys={dirtyKeys}
                  updatingNodeKey={updatingNodeKey}
                  onUpdateNode={(nodeTempId) => onUpdateNode?.(activePath.tempId, nodeTempId)}
                  focusLessonId={
                    focusTarget?.pathTempId === activePath.tempId
                    && (focusTarget.type === 'lesson' || focusTarget.type === 'material')
                      ? focusTarget.nodeTempId
                      : null
                  }
                  focusMaterialId={
                    focusTarget?.pathTempId === activePath.tempId
                    && focusTarget.type === 'material'
                      ? focusTarget.materialTempId
                      : null
                  }
                  chapterSectionOpen={chapterSectionOpen}
                  onChapterSectionOpenChange={setChapterSectionOpen}
                  sidebarLayout={sidebarLayout}
                  showChapterEdit={showChapterEdit}
                  showNodeContent={showNodeContent}
                  showMaterialContent={showMaterialContent}
                  onRequestContentNavigation={onRequestContentNavigation}
                  chapterQuizPathIds={chapterQuizPathIds}
                />
                ) : (
                  <Box
                    sx={{
                      py: 6,
                      px: 2,
                      textAlign: 'center',
                      borderRadius: '12px',
                      bgcolor: 'rgba(15,23,42,0.02)',
                      border: '1px dashed rgba(15,23,42,0.1)',
                    }}
                  >
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: TEXT, mb: 0.75 }}>
                      Chưa chọn nội dung để chỉnh sửa
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.55, maxWidth: 360, mx: 'auto' }}>
                      Bấm <strong>Sửa</strong> trên chương để chỉnh thông tin chương, chọn bài học để sửa bài, hoặc chọn học liệu bên trái để sửa nội dung học liệu.
                    </Typography>
                  </Box>
                )}
                </>
              ) : null}
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
}
