import { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Switch,
  Typography,
  alpha,
} from '@mui/material';
import AppButton from '@/shared/ui/AppButton';
import MentorQuestionTypeFields from '../course/MentorQuestionTypeFields';
import { MUTED } from '../course/mentorCourseCreateStyles';

function copyQuestion(question) {
  if (!question) return null;
  const choices = question.Choices ?? question.Options ?? [];
  return {
    ...question,
    Choices: choices.map((choice) => ({ ...choice })),
  };
}

export default function MentorQuestionBankQuestionEditDialog({
  open,
  question,
  questionIndex = 0,
  title = 'Sửa câu hỏi',
  accentColor,
  disabled = false,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (open && question) {
      setDraft(copyQuestion(question));
      return;
    }
    setDraft(null);
  }, [open, question]);

  if (!open) {
    return null;
  }

  if (!draft) {
    return null;
  }

  const useInTest = draft.IsUseForTest !== false && draft.isUseForTest !== false;

  const handleSave = () => {
    onSave?.({
      ...draft,
      IsUseForTest: useInTest,
      isUseForTest: useInTest,
    });
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: alpha('#0F172A', 0.35),
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
      <DialogContent sx={{ pt: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Switch
            size="small"
            checked={useInTest}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.checked;
              setDraft((prev) => ({
                ...prev,
                IsUseForTest: next,
                isUseForTest: next,
              }));
            }}
          />
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: MUTED }}>
            Dùng trong bài kiểm tra
          </Typography>
        </Box>
        <MentorQuestionTypeFields
          question={draft}
          accentColor={accentColor}
          disabled={disabled}
          onChange={setDraft}
          collapsibleChoices={false}
          questionIndex={questionIndex}
          questionBankChoices
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <AppButton variant="text" onClick={onClose} disabled={disabled}>
          Hủy
        </AppButton>
        <AppButton variant="contained" onClick={handleSave} disabled={disabled}>
          Lưu
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
