import { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputBase,
  Typography,
  alpha,
} from '@mui/material';
import AppButton from '@/shared/ui/AppButton';
import { ContentFieldLabel } from '../course/MentorContentSectionHeading';
import { MUTED } from '../course/mentorCourseCreateStyles';
import { contentInputSx } from '../course/mentorCourseContentStyles';

const fieldLabelSx = { mb: 0.5, fontSize: 12, fontWeight: 700, color: '#64748B' };

function buildDraft(section) {
  if (!section) return null;
  return {
    sectionName: section.SectionName ?? section.DisplayName ?? '',
    sectionTitle: section.SectionTitle ?? '',
  };
}

export default function MentorQuestionBankSectionEditDialog({
  open,
  section,
  accentColor = '#0891B2',
  disabled = false,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (open && section) {
      setDraft(buildDraft(section));
      return;
    }
    setDraft(null);
  }, [open, section]);

  if (!open || !draft) {
    return null;
  }

  const handleSave = () => {
    const sectionName = String(draft.sectionName ?? '').trim();
    const sectionTitle = String(draft.sectionTitle ?? '').trim();
    onSave?.({
      SectionName: sectionName,
      SectionTitle: sectionTitle,
      DisplayName: sectionName,
    });
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Sửa thông tin section</DialogTitle>
      <DialogContent sx={{ pt: 0.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.35 }}>
          <Box>
            <ContentFieldLabel sx={fieldLabelSx}>Tên section</ContentFieldLabel>
            <InputBase
              value={draft.sectionName}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, sectionName: event.target.value }))
              }
              disabled={disabled}
              placeholder="Ví dụ: Bài nghe email công việc"
              fullWidth
              sx={contentInputSx(false, { color: accentColor })}
            />
            <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.35 }}>
              Hiển thị trên tab bài và mục lục.
            </Typography>
          </Box>
          <Box>
            <ContentFieldLabel sx={fieldLabelSx}>Tiêu đề (title)</ContentFieldLabel>
            <InputBase
              value={draft.sectionTitle}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, sectionTitle: event.target.value }))
              }
              disabled={disabled}
              placeholder="Ví dụ: Nghe - Email công việc"
              fullWidth
              sx={contentInputSx(false, { color: accentColor })}
            />
            <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.35 }}>
              Tiêu đề đề bài / nội dung section.
            </Typography>
          </Box>
        </Box>
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
