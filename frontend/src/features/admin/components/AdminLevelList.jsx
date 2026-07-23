import { Box, Typography } from '@mui/material';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import EmptyState from '@/shared/ui/EmptyState';
import Loading from '@/shared/ui/Loading';
import AdminLevelRow from './AdminLevelRow';
import { MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  ADMIN_LEVEL_TABLE_GRID_COLUMNS,
  ADMIN_LEVEL_TABLE_HEADERS,
} from '@/features/admin/utils/adminLevelUtils';

const TABLE_ROW_SX = {
  display: { xs: 'none', md: 'grid' },
  gridTemplateColumns: ADMIN_LEVEL_TABLE_GRID_COLUMNS,
  gap: 2,
  px: 2.25,
  alignItems: 'center',
};

function ListHeader() {
  return (
    <Box
      sx={{
        ...TABLE_ROW_SX,
        py: 1.25,
        bgcolor: 'rgba(15,23,42,0.02)',
        borderBottom: '1px solid rgba(15,23,42,0.06)',
      }}
    >
      {ADMIN_LEVEL_TABLE_HEADERS.map((label, index) => (
        <Typography
          key={label}
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
            textAlign: index === ADMIN_LEVEL_TABLE_HEADERS.length - 1 ? 'right' : 'left',
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  );
}

export default function AdminLevelList({
  levels,
  loading,
  error,
  hasAnyLevels,
  isFiltered,
  onEdit,
  onDelete,
  onClearFilters,
}) {
  if (loading) {
    return <Loading message="Đang tải danh sách trình độ..." />;
  }

  if (error) {
    return (
      <EmptyState
        embedded
        title="Không thể tải danh sách trình độ."
        description="Vui lòng thử lại."
      />
    );
  }

  if (!hasAnyLevels) {
    return (
      <EmptyState
        embedded
        icon={LayersOutlinedIcon}
        title="Chưa có trình độ nào."
        description="Danh sách trình độ sẽ hiển thị tại đây khi có dữ liệu."
      />
    );
  }

  if (levels.length === 0 && isFiltered) {
    return (
      <EmptyState
        embedded
        icon={SearchOffOutlinedIcon}
        title="Không tìm thấy trình độ nào."
        description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
        actionLabel="Xóa bộ lọc"
        onAction={onClearFilters}
      />
    );
  }

  return (
    <Box
      sx={{
        borderRadius: '16px',
        border: '1px solid rgba(15,23,42,0.08)',
        overflow: 'hidden',
        bgcolor: '#fff',
      }}
    >
      <ListHeader />
      {levels.map((level) => (
        <AdminLevelRow key={level.id} level={level} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </Box>
  );
}
