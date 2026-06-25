import { Box, Typography } from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import EmptyState from '@/shared/ui/EmptyState';
import Loading from '@/shared/ui/Loading';
import AdminAccountRow from './AdminAccountRow';
import { MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  ADMIN_ACCOUNT_TABLE_HEADERS,
  ADMIN_ACCOUNT_TABLE_LAYOUT_SX,
  getAdminAccountHeaderCellSx,
} from '@/features/admin/utils/adminAccountUtils';

function ListHeader() {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'grid' },
        ...ADMIN_ACCOUNT_TABLE_LAYOUT_SX,
        py: 1.25,
        bgcolor: 'rgba(15,23,42,0.02)',
        borderBottom: '1px solid rgba(15,23,42,0.06)',
      }}
    >
      {ADMIN_ACCOUNT_TABLE_HEADERS.map((label, index) => (
        <Typography
          key={label}
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
            ...getAdminAccountHeaderCellSx(index),
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  );
}

export default function AdminAccountList({
  accounts,
  loading,
  error,
  hasAnyAccounts,
  isFiltered,
  onEdit,
  onClearFilters,
}) {
  if (loading) {
    return <Loading message="Đang tải danh sách tài khoản..." />;
  }

  if (error) {
    return (
      <EmptyState
        embedded
        title="Không thể tải danh sách tài khoản."
        description="Vui lòng thử lại."
      />
    );
  }

  if (!hasAnyAccounts) {
    return (
      <EmptyState
        embedded
        icon={PeopleAltOutlinedIcon}
        title="Chưa có tài khoản nào."
        description="Danh sách tài khoản sẽ hiển thị tại đây khi có dữ liệu."
      />
    );
  }

  if (accounts.length === 0 && isFiltered) {
    return (
      <EmptyState
        embedded
        icon={SearchOffOutlinedIcon}
        title="Không tìm thấy tài khoản nào."
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
      {accounts.map((account) => (
        <AdminAccountRow key={account.id} account={account} onEdit={onEdit} />
      ))}
    </Box>
  );
}
