import { memo } from 'react';
import { Box, alpha } from '@mui/material';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import MentorQuestionBankRow from './MentorQuestionBankRow';
import EmptyState from '@/shared/ui/EmptyState';
import Loading from '@/shared/ui/Loading';

function MentorQuestionBankList({
  items = [],
  loading = false,
  hasAnyItems = true,
  showReset = false,
  onReset,
}) {
  if (loading) {
    return <Loading message="Đang tải ngân hàng câu hỏi..." />;
  }

  if (items.length === 0) {
    return (
      <Box
        sx={{
          borderRadius: '20px',
          bgcolor: '#FFFFFF',
          border: `1px solid ${alpha('#0F172A', 0.08)}`,
        }}
      >
        <EmptyState
          embedded
          icon={QuizOutlinedIcon}
          title={
            hasAnyItems
              ? 'Không tìm thấy khóa học phù hợp'
              : 'Chưa có khóa học nào trong ngân hàng câu hỏi'
          }
          description={
            hasAnyItems
              ? 'Thử thay đổi từ khóa hoặc bộ lọc.'
              : 'Tạo khóa học trước, sau đó quay lại để quản lý câu hỏi.'
          }
          actionLabel={hasAnyItems && showReset ? 'Xóa bộ lọc' : undefined}
          onAction={hasAnyItems && showReset ? onReset : undefined}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {items.map((item) => (
        <MentorQuestionBankRow key={item.CourseId} item={item} />
      ))}
    </Box>
  );
}

export default memo(MentorQuestionBankList);
