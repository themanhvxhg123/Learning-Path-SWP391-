import { useState } from 'react';
import {
  alpha,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import SortOutlinedIcon from '@mui/icons-material/SortOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import {
  NEWS_LIST_DEFAULTS,
  NEWS_SORT_OPTIONS,
} from '@/features/news/utils/newsListParams';

const MUTED = '#64748B';
const ICON = '#94A3B8';

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
        minWidth: 118,
        maxWidth: 200,
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
      slotProps={{ paper: { sx: getMenuPaperSx(theme) } }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <MenuItem
            key={option.value}
            selected={selected}
            onClick={() => {
              onSelect?.(option.value);
              onClose();
            }}
            sx={{ fontSize: 13, fontWeight: selected ? 600 : 500, py: 1, px: 1.5, gap: 1, minHeight: 40 }}
          >
            <Typography component="span" sx={{ flex: 1, fontSize: 13 }}>
              {option.label}
            </Typography>
            {selected ? <CheckRoundedIcon sx={{ fontSize: 16, color: '#0891B2' }} /> : null}
          </MenuItem>
        );
      })}
    </Menu>
  );
}

function ActiveFilterChip({ label, onDelete }) {
  const theme = useTheme();
  return (
    <Chip
      size="small"
      label={label}
      onDelete={onDelete}
      sx={{
        height: 26,
        fontSize: 12,
        fontWeight: 600,
        borderRadius: theme.ios18?.radius?.pill ?? 9999,
        bgcolor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.text.primary,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
        '& .MuiChip-deleteIcon': {
          fontSize: 16,
          color: MUTED,
          '&:hover': { color: theme.palette.error.main },
        },
      }}
    />
  );
}

export default function NewsCatalogToolbar({
  categoryFilter = 'all',
  onCategoryChange,
  sortBy,
  onSortChange,
  totalCount = 0,
  showReset = false,
  onReset,
  activeFilterChips = [],
  onRemoveFilterChip,
  categoryOptions = [],
  sortOptions = NEWS_SORT_OPTIONS,
}) {
  const theme = useTheme();
  const [categoryAnchor, setCategoryAnchor] = useState(null);
  const [sortAnchor, setSortAnchor] = useState(null);

  const categoryLabel =
    categoryOptions.find((o) => String(o.value) === String(categoryFilter))?.label ?? 'Danh mục';
  const sortLabel = sortOptions.find((o) => o.value === sortBy)?.label ?? 'Sắp xếp';

  return (
    <Box
      sx={{
        mb: 3,
        pb: activeFilterChips.length ? 1.5 : 2,
        borderBottom: '1px solid rgba(15,23,42,0.08)',
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, flex: 1, minWidth: 0 }}>
          <FilterTrigger
            icon={CategoryOutlinedIcon}
            label={categoryLabel}
            hasValue={categoryFilter !== NEWS_LIST_DEFAULTS.category}
            open={Boolean(categoryAnchor)}
            onClick={(e) => setCategoryAnchor(e.currentTarget)}
            iconColor="#0891B2"
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5 }}>
            <ArticleRoundedIcon sx={{ fontSize: 14, color: '#0891B2' }} />
            <Typography
              variant="caption"
              sx={{ color: MUTED, fontWeight: 500, whiteSpace: 'nowrap', fontSize: 12 }}
            >
              {totalCount} bài
            </Typography>
          </Box>
          <FilterTrigger
            icon={SortOutlinedIcon}
            label={sortLabel}
            hasValue
            open={Boolean(sortAnchor)}
            onClick={(e) => setSortAnchor(e.currentTarget)}
            iconColor="#2563EB"
          />
          {showReset ? (
            <Tooltip title="Đặt lại bộ lọc">
              <IconButton
                size="small"
                aria-label="Đặt lại bộ lọc"
                onClick={onReset}
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: theme.ios18?.radius?.pill ?? 9999,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.22)}`,
                  color: theme.palette.error.main,
                  '&:hover': {
                    color: theme.palette.error.main,
                    bgcolor: alpha(theme.palette.error.main, 0.08),
                    borderColor: alpha(theme.palette.error.main, 0.35),
                  },
                }}
              >
                <RestartAltIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      </Box>

      <FilterMenu
        anchorEl={categoryAnchor}
        open={Boolean(categoryAnchor)}
        onClose={() => setCategoryAnchor(null)}
        options={categoryOptions}
        value={categoryFilter}
        onSelect={onCategoryChange}
      />
      <FilterMenu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={() => setSortAnchor(null)}
        options={sortOptions}
        value={sortBy}
        onSelect={onSortChange}
      />

      {activeFilterChips.length ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
          {activeFilterChips.map((chip) => (
            <ActiveFilterChip
              key={chip.key}
              label={chip.label}
              onDelete={() => onRemoveFilterChip?.(chip)}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
