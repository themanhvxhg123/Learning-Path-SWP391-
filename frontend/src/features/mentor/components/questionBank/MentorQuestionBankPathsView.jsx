/**
 * Danh sách Questions_Path của 1 ngân hàng câu hỏi (theo BankId).
 */
import { Box, Typography, alpha } from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AppButton from '@/shared/ui/AppButton';
import EmptyState from '@/shared/ui/EmptyState';
import { formatMentorCourseDate } from '@/features/mentor/utils/mentorCourseUtils';

const TEXT = '#0F172A';
const MUTED = '#64748B';
const PRIMARY = '#0891B2';

function PathRow({ path, onOpen }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '16px',
        bgcolor: '#FFFFFF',
        border: `1px solid ${alpha('#0F172A', 0.08)}`,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: TEXT, mb: 0.35 }}>
          {path.PathName || `Chương #${path.PathId}`}
        </Typography>
        <Typography sx={{ fontSize: 13, color: MUTED }}>
          {path.QuestionCount} câu hỏi
        </Typography>
      </Box>
      <AppButton
        onClick={() => onOpen(path)}
        sx={{
          height: 40,
          px: 2.5,
          fontSize: 13,
          fontWeight: 700,
          borderRadius: '999px',
          bgcolor: PRIMARY,
          color: '#fff',
          flexShrink: 0,
          width: { xs: '100%', sm: 'auto' },
          boxShadow: 'none',
          '&:hover': { bgcolor: '#0E7490', boxShadow: 'none' },
        }}
      >
        Quản lý câu hỏi
      </AppButton>
    </Box>
  );
}

export default function MentorQuestionBankPathsView({
  bank,
  paths = [],
  courseName,
  updatedAt,
  onOpenPath,
  onBack,
  onCreatePath,
}) {
  const title = courseName || bank?.courseTitle || 'Ngân hàng câu hỏi';

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 13, color: MUTED, mb: 0.5 }}>
          Ngân hàng câu hỏi · Bank #{bank?.BankId ?? bank?.id}
        </Typography>
        <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, color: TEXT, mb: 0.5 }}>
          {title}
        </Typography>
        {updatedAt ? (
          <Typography sx={{ fontSize: 13, color: MUTED }}>
            Cập nhật {formatMentorCourseDate(updatedAt)}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
        {onBack ? (
          <AppButton variant="outlined" onClick={onBack} sx={{ height: 40, borderRadius: '999px' }}>
            Quay lại
          </AppButton>
        ) : null}
        {onCreatePath ? (
          <AppButton onClick={onCreatePath} sx={{ height: 40, borderRadius: '999px', bgcolor: PRIMARY }}>
            Thêm chương
          </AppButton>
        ) : null}
      </Box>

      {paths.length === 0 ? (
        <EmptyState
          icon={MenuBookOutlinedIcon}
          title="Chưa có chương nào trong ngân hàng"
          description="Tạo ngân hàng câu hỏi cho một chương để bắt đầu."
          actionLabel={onCreatePath ? 'Thêm chương' : undefined}
          onAction={onCreatePath}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {paths.map((path) => (
            <PathRow key={path.PathId} path={path} onOpen={onOpenPath} />
          ))}
        </Box>
      )}
    </Box>
  );
}
