// ===== AdminLevelRow.jsx =====
// Component hiển thị một dòng (row) trong danh sách trình độ khóa học.
// Mỗi dòng gồm: tên trình độ (kèm màu sắc), trạng thái, ngày tạo và nút chỉnh sửa.

import { Box, Chip, Typography } from '@mui/material';

import {
  ADMIN_CATALOG_STATUS_CHIP_SX,  // Màu sắc cho chip trạng thái (Active/Inactive)
  ADMIN_CATALOG_STATUS_LABELS,    // Nhãn hiển thị cho từng trạng thái
} from '@/features/admin/data/adminCatalogConstants';
import {
  ADMIN_LEVEL_TABLE_GRID_COLUMNS,  // Cấu hình số cột grid cho bảng trình độ
  formatLevelDate,                  // Hàm định dạng ngày tạo trình độ
} from '@/features/admin/utils/adminLevelUtils';
import AdminCatalogEditButton from '@/features/admin/components/AdminCatalogEditButton';  // Nút chỉnh sửa
import { LevelNameChip } from '@/shared/catalog/CatalogNameChip';  // Chip hiển thị tên trình độ (có màu)
import { TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

// Style dùng chung cho chip trạng thái - bo tròn, chữ đậm
const PILL_CHIP_SX = {
  borderRadius: '999px',
  height: 24,
  fontSize: 12,
  fontWeight: 700,
  '& .MuiChip-label': { px: 1.2, fontWeight: 700 },
};

// Style dùng chung cho giá trị text (ngày tạo) - chữ nhỡ, gọn
const VALUE_SX = {
  fontSize: 13,
  fontWeight: 500,
  color: TEXT,
  lineHeight: 1.45,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// Component con: hiển thị một trường dữ liệu trên màn hình nhỏ (điện thoại)
function MobileField({ label, children }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.25 }}>{label}</Typography>
      {children}
    </Box>
  );
}

// Component con: hiển thị giá trị text trên màn hình lớn (máy tính)
function DesktopValue({ value }) {
  return (
    <Typography sx={{ ...VALUE_SX, display: { xs: 'none', md: 'block' } }}>{value}</Typography>
  );
}

// Component chính: nhận vào thông tin 1 trình độ và hàm xử lý khi bấm nút sửa
export default function AdminLevelRow({ level, onEdit }) {
  // Lấy màu sắc cho chip trạng thái, nếu không có thì mặc định màu ACTIVE
  const statusSx = ADMIN_CATALOG_STATUS_CHIP_SX[level.status] ?? ADMIN_CATALOG_STATUS_CHIP_SX.ACTIVE;

  return (
    // Container chính: dùng grid layout, trên mobile là 1 cột, trên desktop là nhiều cột
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: ADMIN_LEVEL_TABLE_GRID_COLUMNS },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 1.25, md: 2 },
        px: { xs: 2, sm: 2.25 },
        py: { xs: 2, md: 1.75 },
        borderBottom: '1px solid rgba(15,23,42,0.06)',  // Đường kẻ ngăn cách giữa các dòng
        '&:last-child': { borderBottom: 'none' },        // Dòng cuối cùng không có border
      }}
    >
      {/* Cột 1: Tên trình độ - hiển thị dạng chip có màu sắc riêng */}
      <Box sx={{ minWidth: 0 }}>
        <MobileField label="Tên hiển thị">
          <LevelNameChip label={level.displayName} id={level.id} colorCode={level.colorCode} />
        </MobileField>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <LevelNameChip
            label={level.displayName}
            id={level.id}
            colorCode={level.colorCode}
            sx={{ fontSize: 13 }}
          />
        </Box>
      </Box>

      {/* Cột 2: Trạng thái (Active/Inactive) - hiển thị dạng chip màu */}
      <Box>
        <MobileField label="Trạng thái">
          <Chip
            size="small"
            label={ADMIN_CATALOG_STATUS_LABELS[level.status] ?? level.status}
            sx={{ ...PILL_CHIP_SX, ...statusSx }}
          />
        </MobileField>
        <Chip
          size="small"
          label={ADMIN_CATALOG_STATUS_LABELS[level.status] ?? level.status}
          sx={{
            ...PILL_CHIP_SX,
            ...statusSx,
            display: { xs: 'none', md: 'inline-flex' },
          }}
        />
      </Box>

      {/* Cột 3: Ngày tạo trình độ */}
      <Box sx={{ minWidth: 0 }}>
        <MobileField label="Ngày tạo">
          <Typography sx={VALUE_SX}>{formatLevelDate(level.createdAt)}</Typography>
        </MobileField>
        <DesktopValue value={formatLevelDate(level.createdAt)} />
      </Box>

      {/* Cột 4: Nút hành động (chỉnh sửa) */}
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
        <AdminCatalogEditButton
          ariaLabel="Chỉnh sửa trình độ"
          title="Chỉnh sửa trình độ"
          onClick={() => onEdit?.(level)}  // Gọi hàm onEdit khi bấm nút
          bare
        />
      </Box>
    </Box>
  );
}
