/**
 * Chọn khóa học — chọn chương trên trang tạo (mục lục bên phải).
 */
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SortOutlinedIcon from '@mui/icons-material/SortOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import SignalCellularAltOutlinedIcon from '@mui/icons-material/SignalCellularAltOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import AppButton from '@/shared/ui/AppButton';
import SearchBox from '@/shared/ui/SearchBox';
import ThumbnailImage from '@/shared/ui/ThumbnailImage';
import { formatMentorCourseDate } from '@/features/mentor/utils/mentorCourseUtils';
import { resolveLevelChipSx } from '@/shared/catalog/catalogRegistry';

const MUTED = '#64748B';
const ICON = '#94A3B8';

const PILL_CHIP_SX = {
  borderRadius: '999px',
  height: 22,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: '22px',
  '& .MuiChip-label': {
    px: 1,
    lineHeight: '22px',
    fontWeight: 700,
  },
};

const SORT_DEFAULT = 'updated_desc';
const FILTER_ALL = 'all';

const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Mới cập nhật' },
  { value: 'name_asc', label: 'Tên A-Z' },
  { value: 'students_desc', label: 'Nhiều học viên' },
];

function buildFilterOptions(courses, getId, getLabel) {
  const map = new Map();
  courses.forEach((course) => {
    const id = getId(course);
    const label = getLabel(course);
    if (id && label && !map.has(id)) {
      map.set(id, label);
    }
  });

  return [
    { value: FILTER_ALL, label: 'Tất cả' },
    ...[...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'vi'))
      .map(([value, label]) => ({ value, label })),
  ];
}

function getMenuPaperSx(theme) {
  return {
    mt: 0.75,
    borderRadius: '12px',
    boxShadow: theme.ios18?.shadow?.md,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    overflow: 'hidden',
    minWidth: 168,
  };
}

function FilterTrigger({ icon: Icon, label, hasValue, onClick, open, iconColor = ICON }) {
  const theme = useTheme();
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-haspopup="listbox"
      aria-expanded={open}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        flex: 1,
        height: 34,
        px: 1.25,
        pr: 0.75,
        border: `1px solid ${
          hasValue
            ? alpha(theme.palette.primary.main, 0.22)
            : alpha(theme.palette.primary.main, 0.1)
        }`,
        borderRadius: theme.ios18?.radius?.pill ?? 9999,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        color: hasValue ? theme.palette.text.primary : MUTED,
        fontSize: 13,
        fontWeight: hasValue ? 600 : 500,
        lineHeight: '20px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: `all 0.2s ${theme.ios18?.transition}`,
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          borderColor: alpha(theme.palette.primary.main, 0.22),
        },
        ...(open && {
          bgcolor: '#fff',
          borderColor: theme.palette.primary.main,
        }),
      }}
    >
      <Icon sx={{ fontSize: 15, color: iconColor, flexShrink: 0 }} />
      <Typography
        component="span"
        noWrap
        sx={{ flex: 1, fontSize: 13, fontWeight: 'inherit', color: 'inherit', textAlign: 'left' }}
      >
        {label}
      </Typography>
      <KeyboardArrowDownRoundedIcon
        sx={{
          fontSize: 18,
          color: ICON,
          flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
        }}
      />
    </Box>
  );
}

function FilterMenu({ anchorEl, open, onClose, options, value, onSelect }) {
  const theme = useTheme();
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: { sx: getMenuPaperSx(theme) },
        list: { dense: true, sx: { py: 0.5 } },
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <MenuItem
            key={option.value}
            selected={selected}
            onClick={() => {
              onSelect(option.value);
              onClose();
            }}
            sx={{
              borderRadius: '8px',
              mx: 0.5,
              my: 0.25,
              minHeight: 34,
              py: 0.5,
              px: 1.25,
              fontSize: 13,
              fontWeight: selected ? 600 : 500,
              color: selected ? theme.palette.primary.main : theme.palette.text.primary,
              bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              '&.Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
              },
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
            }}
          >
            <Typography component="span" sx={{ flex: 1, fontSize: 13, fontWeight: 'inherit' }}>
              {option.label}
            </Typography>
            {selected ? (
              <CheckRoundedIcon sx={{ fontSize: 16, color: 'primary.main', ml: 1 }} />
            ) : (
              <Box sx={{ width: 16, ml: 1, flexShrink: 0 }} />
            )}
          </MenuItem>
        );
      })}
    </Menu>
  );
}

function resetDialogFilters(setters) {
  setters.setSearch('');
  setters.setSortBy(SORT_DEFAULT);
  setters.setLevelFilter(FILTER_ALL);
  setters.setCategoryFilter(FILTER_ALL);
}

export default function MentorSelectCourseForQBDialog({
  open,
  onClose,
  courses = [],
  onSelect,
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(SORT_DEFAULT);
  const [levelFilter, setLevelFilter] = useState(FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState(FILTER_ALL);
  const [sortAnchor, setSortAnchor] = useState(null);
  const [levelAnchor, setLevelAnchor] = useState(null);
  const [categoryAnchor, setCategoryAnchor] = useState(null);

  const levelOptions = useMemo(
    () =>
      buildFilterOptions(
        courses,
        (course) => String(course.LevelId ?? course.levelId ?? ''),
        (course) => course.LevelDisplayName ?? course.levelName ?? '',
      ),
    [courses],
  );

  const categoryOptions = useMemo(
    () =>
      buildFilterOptions(
        courses,
        (course) => String(course.CategoryId ?? course.categoryId ?? ''),
        (course) => course.CategoryDisplayName ?? course.categoryName ?? '',
      ),
    [courses],
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let result = courses;

    if (keyword) {
      result = result.filter((course) => course.CourseName?.toLowerCase().includes(keyword));
    }

    if (levelFilter !== FILTER_ALL) {
      result = result.filter(
        (course) => String(course.LevelId ?? course.levelId) === levelFilter,
      );
    }

    if (categoryFilter !== FILTER_ALL) {
      result = result.filter(
        (course) => String(course.CategoryId ?? course.categoryId) === categoryFilter,
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'name_asc') {
        return (a.CourseName ?? '').localeCompare(b.CourseName ?? '', 'vi');
      }
      if (sortBy === 'students_desc') {
        return (
          (Number(b.StudentCount ?? b.studentCount ?? 0) || 0) -
          (Number(a.StudentCount ?? a.studentCount ?? 0) || 0)
        );
      }
      return (
        new Date(b.UpdatedAt ?? b.updatedAt ?? 0).getTime() -
        new Date(a.UpdatedAt ?? a.updatedAt ?? 0).getTime()
      );
    });
  }, [courses, search, sortBy, levelFilter, categoryFilter]);

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Sắp xếp';
  const levelLabel =
    levelOptions.find((option) => option.value === levelFilter)?.label ?? 'Trình độ';
  const categoryLabel =
    categoryOptions.find((option) => option.value === categoryFilter)?.label ?? 'Danh mục';

  const hasActiveFilters =
    Boolean(search.trim()) ||
    sortBy !== SORT_DEFAULT ||
    levelFilter !== FILTER_ALL ||
    categoryFilter !== FILTER_ALL;

  const handleSelect = (course) => {
    onSelect?.(course);
    resetDialogFilters({ setSearch, setSortBy, setLevelFilter, setCategoryFilter });
    onClose();
  };

  const handleClose = () => {
    resetDialogFilters({ setSearch, setSortBy, setLevelFilter, setCategoryFilter });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: alpha('#0F172A', 0.35),
          },
        },
        paper: {
          sx: {
            borderRadius: '28px',
            border: 'none',
            boxShadow: theme.ios18?.shadow?.lg ?? '0 8px 32px rgba(8, 145, 178, 0.08)',
            overflow: 'hidden',
            bgcolor: '#FFFFFF',
          },
        },
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 17, color: '#0F172A', lineHeight: 1.35 }}>
              Chọn khóa học để tạo câu hỏi
            </Typography>
            <Typography variant="body2" sx={{ color: MUTED, mt: 0.5 }}>
              Chọn chương tại mục lục trên trang tạo bank
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              width: 32,
              height: 32,
              bgcolor: alpha('#0F172A', 0.05),
              color: MUTED,
              flexShrink: 0,
              '&:hover': { bgcolor: alpha('#0F172A', 0.08) },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <SearchBox
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm khóa học..."
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
          <FilterTrigger
            icon={SortOutlinedIcon}
            label={sortLabel}
            hasValue={sortBy !== SORT_DEFAULT}
            open={Boolean(sortAnchor)}
            onClick={(e) => setSortAnchor(e.currentTarget)}
            iconColor="#7C3AED"
          />
          <FilterTrigger
            icon={SignalCellularAltOutlinedIcon}
            label={levelLabel}
            hasValue={levelFilter !== FILTER_ALL}
            open={Boolean(levelAnchor)}
            onClick={(e) => setLevelAnchor(e.currentTarget)}
            iconColor="#0891B2"
          />
          <FilterTrigger
            icon={CategoryOutlinedIcon}
            label={categoryLabel}
            hasValue={categoryFilter !== FILTER_ALL}
            open={Boolean(categoryAnchor)}
            onClick={(e) => setCategoryAnchor(e.currentTarget)}
            iconColor="#047857"
          />
        </Box>
      </Box>

      <FilterMenu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={() => setSortAnchor(null)}
        options={SORT_OPTIONS}
        value={sortBy}
        onSelect={setSortBy}
      />
      <FilterMenu
        anchorEl={levelAnchor}
        open={Boolean(levelAnchor)}
        onClose={() => setLevelAnchor(null)}
        options={levelOptions}
        value={levelFilter}
        onSelect={setLevelFilter}
      />
      <FilterMenu
        anchorEl={categoryAnchor}
        open={Boolean(categoryAnchor)}
        onClose={() => setCategoryAnchor(null)}
        options={categoryOptions}
        value={categoryFilter}
        onSelect={setCategoryFilter}
      />

      <DialogContent
        sx={{
          px: 2,
          pt: 0,
          pb: 2.5,
          maxHeight: 420,
          overflowY: 'auto',
        }}
      >
        {filtered.length === 0 ? (
          <Box
            sx={{
              py: 5,
              mx: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
              borderRadius: '20px',
              bgcolor: alpha('#0891B2', 0.04),
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '16px',
                bgcolor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: theme.ios18?.shadow?.sm,
              }}
            >
              <MenuBookOutlinedIcon sx={{ fontSize: 26, color: alpha('#0891B2', 0.45) }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500, color: MUTED, px: 2, textAlign: 'center' }}>
              {hasActiveFilters
                ? 'Không tìm thấy khóa học phù hợp'
                : 'Không có khóa học khả dụng'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map((course) => (
              <Box
                key={course.CourseId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.75,
                    py: 1.5,
                    mx: 0.5,
                    borderRadius: '18px',
                    bgcolor: alpha('#F8FAFC', 0.9),
                    border: `1px solid ${alpha('#0F172A', 0.05)}`,
                    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                    '&:hover': {
                      bgcolor: '#FFFFFF',
                      borderColor: alpha('#0891B2', 0.15),
                      boxShadow: theme.ios18?.shadow?.sm,
                    },
                  }}
                >
                  <ThumbnailImage
                    src={course.Thumbnail ?? course.thumbnail}
                    label={course.CourseName}
                    alt={course.CourseName}
                    iconSize={22}
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '14px',
                      flexShrink: 0,
                    }}
                  />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#0F172A',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {course.CourseName}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                      {course.CategoryDisplayName && (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          {course.CategoryDisplayName}
                        </Typography>
                      )}
                      {course.LevelDisplayName && (
                        <Chip
                          size="small"
                          label={course.LevelDisplayName}
                          sx={{
                            ...PILL_CHIP_SX,
                            ...resolveLevelChipSx({
                              id: course.LevelId ?? course.levelId,
                              displayName: course.LevelName ?? course.LevelDisplayName,
                            }),
                          }}
                        />
                      )}
                    </Box>

                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.35 }}>
                      Cập nhật: {formatMentorCourseDate(course.UpdatedAt ?? course.updatedAt)}
                      {' · '}
                      {Number(course.StudentCount ?? course.studentCount ?? 0) || 0} học viên
                    </Typography>
                  </Box>

                  <AppButton
                    size="small"
                    onClick={() => handleSelect(course)}
                    sx={{
                      height: 34,
                      px: 2.25,
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: '999px',
                      bgcolor: '#0891B2',
                      color: '#fff',
                      flexShrink: 0,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#0E7490', boxShadow: 'none' },
                    }}
                  >
                    Tạo
                  </AppButton>
                </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
