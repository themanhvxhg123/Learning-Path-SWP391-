import { Box, Typography } from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import EmptyState from '@/shared/ui/EmptyState';
import Loading from '@/shared/ui/Loading';
import AdminNewsRow from './AdminNewsRow';
import { MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  ADMIN_NEWS_TABLE_GRID_COLUMNS,
  ADMIN_NEWS_TABLE_HEADERS,
} from '@/features/admin/utils/adminNewsUtils';

const TABLE_ROW_SX = {
  display: { xs: 'none', md: 'grid' },
  gridTemplateColumns: ADMIN_NEWS_TABLE_GRID_COLUMNS,
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
      {ADMIN_NEWS_TABLE_HEADERS.map((label, index) => (
        <Typography
          key={label}
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
            textAlign: index === ADMIN_NEWS_TABLE_HEADERS.length - 1 ? 'right' : 'left',
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  );
}

export default function AdminNewsList({
  articles,
  loading,
  error,
  hasAnyArticles,
  isFiltered,
  onEdit,
  onClearFilters,
}) {
  if (loading) {
    return <Loading message="Đang tải danh sách tin tức..." />;
  }

  if (error) {
    return (
      <EmptyState
        embedded
        title="Không thể tải danh sách tin tức."
        description="Vui lòng thử lại."
      />
    );
  }

  if (!hasAnyArticles) {
    return (
      <EmptyState
        embedded
        icon={ArticleRoundedIcon}
        title="Chưa có tin tức nào."
        description="Danh sách tin tức sẽ hiển thị tại đây khi có dữ liệu."
      />
    );
  }

  if (articles.length === 0 && isFiltered) {
    return (
      <EmptyState
        embedded
        icon={SearchOffOutlinedIcon}
        title="Không tìm thấy tin tức nào."
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
      {articles.map((article) => (
        <AdminNewsRow key={article.id} article={article} onEdit={onEdit} />
      ))}
    </Box>
  );
}
