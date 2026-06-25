/**
 * Danh sách câu hỏi theo chương — xem chi tiết, sửa, xóa, public/private.
 */
import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  alpha,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AppButton from '@/shared/ui/AppButton';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import EmptyState from '@/shared/ui/EmptyState';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import {
  deleteChapterQuestion,
  setAllChapterQuestionsPublic,
  setChapterQuestionPublic,
} from '@/features/mentor/services/questionBankService';
import { toast } from '@/shared/ui/Toast';

const TEXT = '#0F172A';
const MUTED = '#64748B';
const PRIMARY = '#0891B2';

function StatusChip({ isActive }) {
  return (
    <Chip
      size="small"
      label={isActive ? 'Public' : 'Private'}
      sx={{
        height: 24,
        fontSize: 11,
        fontWeight: 700,
        bgcolor: isActive ? 'rgba(4,120,87,0.12)' : 'rgba(100,116,139,0.12)',
        color: isActive ? '#047857' : MUTED,
      }}
    />
  );
}

function QuestionDetailDialog({ open, question, onClose }) {
  if (!question) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Chi tiết câu hỏi #{question.QuestionId}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 12, color: MUTED, mb: 1 }}>
          {question.SkillLabel} · Thứ tự {question.Order}
        </Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: TEXT, mb: 2, lineHeight: 1.5 }}>
          {question.Title}
        </Typography>
        {question.URL ? (
          <Typography sx={{ fontSize: 13, color: MUTED, mb: 2, wordBreak: 'break-all' }}>
            Audio/URL: {question.URL}
          </Typography>
        ) : null}
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TEXT, mb: 1 }}>Đáp án</Typography>
        {(question.Choices ?? []).map((choice) => (
          <Box
            key={choice.ChoiceId ?? choice.Order}
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              py: 0.5,
              fontSize: 13,
              color: choice.IsTrue ? '#047857' : TEXT,
              fontWeight: choice.IsTrue ? 700 : 400,
            }}
          >
            <span>{choice.IsTrue ? '✓' : '○'}</span>
            <span>{choice.Title}</span>
          </Box>
        ))}
        <Box sx={{ mt: 2 }}>
          <StatusChip isActive={question.isActive} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={onClose}>
          Đóng
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}

function QuestionRow({ question, busy, onDetail, onEdit, onDelete, onTogglePublic }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '14px',
        bgcolor: '#fff',
        border: `1px solid ${alpha('#0F172A', 0.08)}`,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 1.25,
        alignItems: { md: 'center' },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
          <Chip
            size="small"
            label={question.SkillLabel}
            sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
          />
          <StatusChip isActive={question.isActive} />
          <Typography sx={{ fontSize: 11, color: MUTED }}>#{question.QuestionId}</Typography>
        </Box>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: TEXT,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {question.Title}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, flexShrink: 0 }}>
        <AppButton size="small" variant="outlined" disabled={busy} onClick={() => onDetail(question)}>
          See detail
        </AppButton>
        <AppButton size="small" variant="outlined" disabled={busy} onClick={() => onEdit(question)}>
          Edit
        </AppButton>
        <AppButton
          size="small"
          variant="outlined"
          disabled={busy}
          onClick={() => onTogglePublic(question, !question.isActive)}
        >
          {question.isActive ? 'Set private' : 'Set public'}
        </AppButton>
        <AppButton
          size="small"
          variant="outlined"
          disabled={busy}
          onClick={() => onDelete(question)}
          sx={{ color: '#DC2626', borderColor: alpha('#DC2626', 0.35) }}
        >
          Delete
        </AppButton>
      </Box>
    </Box>
  );
}

export default function MentorChapterQuestionListView({
  bankId,
  courseId,
  chapterId,
  chapterTitle,
  courseName,
  questions = [],
  onBack,
  onReload,
  onEditQuestion,
  onAddQuestion,
}) {
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [detailQuestion, setDetailQuestion] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.TypeId - b.TypeId || a.Order - b.Order),
    [questions],
  );

  const runToggle = async (question, isPublic) => {
    setBusyId(question.QuestionId);
    try {
      const res = await setChapterQuestionPublic(courseId, chapterId, question.QuestionId, isPublic);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(isPublic ? 'Đã chuyển sang public.' : 'Đã chuyển sang private.');
      onReload?.();
    } finally {
      setBusyId(null);
    }
  };

  const runBulk = async (isPublic) => {
    setBulkBusy(true);
    try {
      const res = await setAllChapterQuestionsPublic(courseId, chapterId, isPublic);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(isPublic ? 'Đã set all public.' : 'Đã set all private.');
      onReload?.();
    } finally {
      setBulkBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.QuestionId);
    try {
      const res = await deleteChapterQuestion(courseId, chapterId, deleteTarget.QuestionId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Đã xóa câu hỏi.');
      setDeleteTarget(null);
      onReload?.();
    } finally {
      setBusyId(null);
    }
  };

  const busy = bulkBusy || busyId != null;

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 13, color: MUTED, mb: 0.5 }}>
          {courseName} · Bank #{bankId}
        </Typography>
        <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, color: TEXT }}>
          {chapterTitle || `Chương #${chapterId}`}
        </Typography>
        <Typography sx={{ fontSize: 13, color: MUTED, mt: 0.5 }}>
          {sortedQuestions.length} câu hỏi
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <AppButton
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onBack}
            sx={{ height: 40, borderRadius: '999px' }}
          >
            Quay lại
          </AppButton>
          <AppButton
            variant="outlined"
            disabled={busy || sortedQuestions.length === 0}
            onClick={() => runBulk(true)}
            sx={{ height: 40, borderRadius: '999px' }}
          >
            Set all public
          </AppButton>
          <AppButton
            variant="outlined"
            disabled={busy || sortedQuestions.length === 0}
            onClick={() => runBulk(false)}
            sx={{ height: 40, borderRadius: '999px' }}
          >
            Set all private
          </AppButton>
        </Box>
        {onAddQuestion ? (
          <AppButton
            startIcon={<AddRoundedIcon />}
            onClick={onAddQuestion}
            sx={{ height: 40, borderRadius: '999px', bgcolor: PRIMARY, color: '#fff' }}
          >
            Thêm câu hỏi
          </AppButton>
        ) : null}
      </Box>

      {sortedQuestions.length === 0 ? (
        <EmptyState
          icon={QuizOutlinedIcon}
          title="Chưa có câu hỏi"
          description="Thêm câu hỏi cho chương này."
          actionLabel={onAddQuestion ? 'Thêm câu hỏi' : undefined}
          onAction={onAddQuestion}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sortedQuestions.map((question) => (
            <QuestionRow
              key={question.QuestionId}
              question={question}
              busy={busy}
              onDetail={setDetailQuestion}
              onEdit={onEditQuestion}
              onDelete={setDeleteTarget}
              onTogglePublic={runToggle}
            />
          ))}
        </Box>
      )}

      <QuestionDetailDialog
        open={Boolean(detailQuestion)}
        question={detailQuestion}
        onClose={() => setDetailQuestion(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Xóa câu hỏi"
        message={`Xóa câu hỏi "${deleteTarget?.Title ?? ''}"? Hành động không thể hoàn tác.`}
        confirmLabel="Xóa"
        destructive
        loading={busyId === deleteTarget?.QuestionId}
      />
    </Box>
  );
}
