import { Box, Chip, IconButton, Tooltip, Typography, alpha } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import {
  ADMIN_CATALOG_STATUS_CHIP_SX,
  ADMIN_CATALOG_STATUS_LABELS,
} from '@/features/admin/data/adminCatalogConstants';
import {
  ADMIN_CATEGORY_TABLE_GRID_COLUMNS,
  formatCategoryDate,
} from '@/features/admin/utils/adminCategoryUtils';
import AdminCatalogEditButton from '@/features/admin/components/AdminCatalogEditButton';
import { CategoryNameChip } from '@/shared/catalog/CatalogNameChip';
import { TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

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

function MobileField({ label, children }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.25 }}>{label}</Typography>
      {children}
    </Box>
  );
}

function DesktopValue({ value }) {
  return (
    <Typography sx={{ ...VALUE_SX, display: { xs: 'none', md: 'block' } }}>{value}</Typography>
  );
}

export default function AdminCategoryRow({ category, onEdit, onDelete }) {
  const statusSx =
    ADMIN_CATALOG_STATUS_CHIP_SX[category.status] ?? ADMIN_CATALOG_STATUS_CHIP_SX.ACTIVE;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: ADMIN_CATEGORY_TABLE_GRID_COLUMNS },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 1.25, md: 2 },
        px: { xs: 2, sm: 2.25 },
        py: { xs: 2, md: 1.75 },
        borderBottom: '1px solid rgba(15,23,42,0.06)',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <MobileField label="Tên hiển thị">
          <CategoryNameChip
            label={category.displayName}
            id={category.id}
            colorCode={category.colorCode}
          />
        </MobileField>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <CategoryNameChip
            label={category.displayName}
            id={category.id}
            colorCode={category.colorCode}
            sx={{ fontSize: 13 }}
          />
        </Box>
      </Box>

      <Box>
        <MobileField label="Trạng thái">
          <Chip
            size="small"
            label={ADMIN_CATALOG_STATUS_LABELS[category.status] ?? category.status}
            sx={{ ...PILL_CHIP_SX, ...statusSx }}
          />
        </MobileField>
        <Chip
          size="small"
          label={ADMIN_CATALOG_STATUS_LABELS[category.status] ?? category.status}
          sx={{
            ...PILL_CHIP_SX,
            ...statusSx,
            display: { xs: 'none', md: 'inline-flex' },
          }}
        />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <MobileField label="Ngày tạo">
          <Typography sx={VALUE_SX}>{formatCategoryDate(category.createdAt)}</Typography>
        </MobileField>
        <DesktopValue value={formatCategoryDate(category.createdAt)} />
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
        <AdminCatalogEditButton
          ariaLabel="Chỉnh sửa danh mục"
          title="Chỉnh sửa danh mục"
          onClick={() => onEdit?.(category)}
          bare
        />
        <Tooltip title="Xoá danh mục">
          <IconButton
            size="small"
            aria-label="Xoá danh mục"
            onClick={() => onDelete?.(category)}
            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              border: '1px solid rgba(15,23,42,0.08)',
              color: MUTED,
              '&:hover': {
                color: '#EF4444',
                bgcolor: alpha('#EF4444', 0.06),
                borderColor: alpha('#EF4444', 0.2),
              },
            }}
          >
            <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
