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
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import SortOutlinedIcon from '@mui/icons-material/SortOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { mentorQuestionBankFilterOptionsMock } from '@/features/mentor/data/mentorQuestionBankMock';
import { QB_LIST_DEFAULTS } from '@/features/mentor/utils/mentorQuestionBankListParams';

/**
 * =============================================================================
 * MentorQuestionBankToolbar — Thanh bộ lọc trang danh sách QB
 * =============================================================================
 *
 * MỤC ĐÍCH: Hiển thị dropdown lọc trạng thái KH, trạng thái câu hỏi, sắp xếp.
 * Toolbar filter/sort — search xử lý qua Header SearchBox (param q).
 */
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
        border: `1px solid ${hasValue
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
function ActiveFilterChip({ label, onDelete }) {
  return (
    <Chip
      label={label}
      size="small"
      onDelete={onDelete}
      sx={{
        height: 24,
        fontSize: 11.5,
        fontWeight: 600,
        borderRadius: '99px',
        bgcolor: 'rgba(8,145,178,0.08)',
        color: '#0891B2',
        border: '1px solid rgba(8,145,178,0.16)',
        '& .MuiChip-deleteIcon': {
          fontSize: 15,
          color: '#94A3B8',
          '&:hover': { color: '#0891B2' },
        },
      }}
    />
  );
}
export default function MentorQuestionBankToolbar({
  statusFilter = 'all',
  onStatusChange,
  questionStatusFilter = 'all',
  onQuestionStatusChange,
  sortBy,
  onSortChange,
  totalCount = 0,
  showReset = false,
  onReset,
  activeFilterChips = [],
  onRemoveFilterChip,
  // Filter Pay Attention to 3 line below
  statusOptions = mentorQuestionBankFilterOptionsMock.statusOptions,
  questionStatusOptions = mentorQuestionBankFilterOptionsMock.questionStatusOptions,
  sortOptions = mentorQuestionBankFilterOptionsMock.sortOptions,
}) {
  const theme = useTheme();
  const [statusAnchor, setStatusAnchor] = useState(null);
  const [questionStatusAnchor, setQuestionStatusAnchor] = useState(null);
  const [sortAnchor, setSortAnchor] = useState(null);
  const statusLabel = statusOptions.find((o) => o.value === statusFilter)?.label ?? 'Trạng thái KH';
  const questionStatusLabel =
    questionStatusOptions.find((o) => o.value === questionStatusFilter)?.label ?? 'Trạng thái câu hỏi';
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
            icon={FactCheckOutlinedIcon}
            label={statusLabel}
            hasValue={statusFilter !== QB_LIST_DEFAULTS.status}
            open={Boolean(statusAnchor)}
            onClick={(e) => setStatusAnchor(e.currentTarget)}
            iconColor="#047857"
          />
          <FilterTrigger
            icon={QuizOutlinedIcon}
            label={questionStatusLabel}
            hasValue={questionStatusFilter !== QB_LIST_DEFAULTS.questionStatus}
            open={Boolean(questionStatusAnchor)}
            onClick={(e) => setQuestionStatusAnchor(e.currentTarget)}
            iconColor="#0891B2"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5 }}>
            <QuizOutlinedIcon sx={{ fontSize: 14, color: '#0891B2' }} />
            <Typography
              variant="caption"
              sx={{ color: MUTED, fontWeight: 500, whiteSpace: 'nowrap', fontSize: 12 }}
            >
              {totalCount} khóa học
            </Typography>
          </Box>
          <FilterTrigger
            icon={SortOutlinedIcon}
            label={sortLabel}
            hasValue
            open={Boolean(sortAnchor)}
            onClick={(e) => setSortAnchor(e.currentTarget)}
            iconColor="#7C3AED"
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
      {/* Filter Menu IsPublished Course */}
      <FilterMenu
        anchorEl={statusAnchor}
        open={Boolean(statusAnchor)}
        onClose={() => setStatusAnchor(null)}
        options={statusOptions}
        value={statusFilter}
        onSelect={onStatusChange}
      />
      {/* Filter Menu TotalQuestionIsPublic Question */}
      <FilterMenu
        anchorEl={questionStatusAnchor}
        open={Boolean(questionStatusAnchor)}
        onClose={() => setQuestionStatusAnchor(null)}
        options={questionStatusOptions}
        value={questionStatusFilter}
        onSelect={onQuestionStatusChange}
      />
      {/* Filter Menu By Question's UpdatedAt  */}
      <FilterMenu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={() => setSortAnchor(null)}
        options={sortOptions}
        value={sortBy}
        onSelect={onSortChange}
      />
      {activeFilterChips.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.625, mt: 1 }}>
          {activeFilterChips.map((chip) => (
            <ActiveFilterChip
              key={chip.key}
              label={chip.label}
              onDelete={() => onRemoveFilterChip?.(chip)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
