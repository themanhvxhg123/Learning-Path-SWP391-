import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  ADMIN_ACCOUNT_ROLE_CHIP_SX,
  ADMIN_ACCOUNT_ROLE_LABELS,
  ADMIN_ACCOUNT_STATUS_CHIP_SX,
  ADMIN_ACCOUNT_STATUS_LABELS,
  ADMIN_ACCOUNT_TABLE_LAYOUT_SX,
  formatAccountDate,
  getAccountInitials,
} from '@/features/admin/utils/adminAccountUtils';
import { PRIMARY, TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const PILL_CHIP_SX = {
  borderRadius: '999px',
  height: 24,
  fontSize: 12,
  fontWeight: 700,
  '& .MuiChip-label': { px: 1.2, fontWeight: 700 },
};

const VALUE_SX = {
  fontSize: 13,
  fontWeight: 500,
  color: TEXT,
  lineHeight: 1.45,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function MobileField({ label, value }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.25 }}>{label}</Typography>
      <Typography sx={VALUE_SX}>{value}</Typography>
    </Box>
  );
}

function DesktopValue({ value }) {
  return (
    <Typography sx={{ ...VALUE_SX, display: { xs: 'none', md: 'block' } }}>{value}</Typography>
  );
}

export default function AdminAccountRow({ account, onEdit }) {
  const roleSx = ADMIN_ACCOUNT_ROLE_CHIP_SX[account.role] ?? ADMIN_ACCOUNT_ROLE_CHIP_SX.Student;
  const statusSx = ADMIN_ACCOUNT_STATUS_CHIP_SX[account.status] ?? ADMIN_ACCOUNT_STATUS_CHIP_SX.ACTIVE;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: ADMIN_ACCOUNT_TABLE_LAYOUT_SX.gridTemplateColumns },
        columnGap: { xs: 0, md: ADMIN_ACCOUNT_TABLE_LAYOUT_SX.columnGap },
        px: { xs: 2, md: ADMIN_ACCOUNT_TABLE_LAYOUT_SX.px },
        alignItems: { xs: 'stretch', md: ADMIN_ACCOUNT_TABLE_LAYOUT_SX.alignItems },
        width: '100%',
        boxSizing: 'border-box',
        rowGap: { xs: 1.25, md: 0 },
        py: { xs: 2, md: 1.75 },
        borderBottom: '1px solid rgba(15,23,42,0.06)',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, justifySelf: 'start' }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: alpha(PRIMARY, 0.12),
            color: PRIMARY,
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getAccountInitials(account.fullName)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: TEXT,
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {account.fullName}
          </Typography>
          {account.username ? (
            <Typography sx={{ fontSize: 12, color: MUTED }}>@{account.username}</Typography>
          ) : null}
        </Box>
      </Box>

      <Box sx={{ minWidth: 0, justifySelf: 'start' }}>
        <MobileField label="Email" value={account.email} />
        <DesktopValue value={account.email} />
      </Box>

      <Box sx={{ justifySelf: 'start' }}>
        <MobileField
          label="Vai trò"
          value={ADMIN_ACCOUNT_ROLE_LABELS[account.role] ?? account.role}
        />
        <Chip
          size="small"
          label={ADMIN_ACCOUNT_ROLE_LABELS[account.role] ?? account.role}
          sx={{
            ...PILL_CHIP_SX,
            ...roleSx,
            display: { xs: 'none', md: 'inline-flex' },
          }}
        />
      </Box>

      <Box sx={{ justifySelf: 'start' }}>
        <MobileField
          label="Trạng thái"
          value={ADMIN_ACCOUNT_STATUS_LABELS[account.status] ?? account.status}
        />
        <Chip
          size="small"
          label={ADMIN_ACCOUNT_STATUS_LABELS[account.status] ?? account.status}
          sx={{
            ...PILL_CHIP_SX,
            ...statusSx,
            display: { xs: 'none', md: 'inline-flex' },
          }}
        />
      </Box>

      <Box sx={{ minWidth: 0, justifySelf: 'start' }}>
        <MobileField label="Ngày tạo" value={formatAccountDate(account.createdAt)} />
        <DesktopValue value={formatAccountDate(account.createdAt)} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, justifySelf: 'end' }}>
        <Tooltip title="Chỉnh sửa vai trò & trạng thái">
          <IconButton
            size="small"
            aria-label="Chỉnh sửa tài khoản"
            onClick={() => onEdit?.(account)}
            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              border: '1px solid rgba(15,23,42,0.08)',
              color: MUTED,
              '&:hover': {
                color: PRIMARY,
                bgcolor: alpha(PRIMARY, 0.06),
                borderColor: alpha(PRIMARY, 0.2),
              },
            }}
          >
            <EditOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
