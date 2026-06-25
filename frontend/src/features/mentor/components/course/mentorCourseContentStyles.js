import { MUTED, PRIMARY, TEXT } from './mentorCourseCreateStyles';

export const BORDER = 'rgba(15,23,42,0.08)';
export const BORDER_STRONG = 'rgba(15,23,42,0.12)';

/** Accent colors — dùng cho line/icon/focus, không tô nền block. */
export const CHAPTER_THEME = {
  color: PRIMARY,
  bg: 'transparent',
  border: BORDER,
  focus: 'rgba(8,145,178,0.35)',
  accent: PRIMARY,
};

export const LESSON_THEME = {
  color: '#475569',
  bg: 'transparent',
  border: BORDER,
  focus: 'rgba(71,85,105,0.25)',
  accent: '#94A3B8',
  headerBg: 'rgba(241,245,249,0.95)',
};

export const MATERIAL_SECTION_THEME = {
  color: MUTED,
  bg: 'transparent',
  border: BORDER,
  focus: 'rgba(100,116,139,0.25)',
  accent: '#CBD5E1',
};

export const MATERIAL_TYPE_THEME = {
  VIDEO: { color: '#E11D48', soft: 'transparent', border: BORDER, bg: '#FFFFFF' },
  TEXT: { color: PRIMARY, soft: 'transparent', border: BORDER, bg: '#FFFFFF' },
  DOC: { color: '#2563EB', soft: 'transparent', border: BORDER, bg: '#FFFFFF' },
  TEST: { color: '#7C3AED', soft: 'transparent', border: BORDER, bg: '#FFFFFF' },
};

export const CONTENT_FIELD_LABEL_SX = {
  fontSize: 12,
  fontWeight: 600,
  color: MUTED,
  mb: 0.75,
  lineHeight: 1.35,
};

export const CONTENT_SECTION_LABEL_SX = {
  fontSize: 11,
  fontWeight: 700,
  color: MUTED,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  mb: 1.25,
  mt: 0.5,
  lineHeight: 1.3,
};

export const CONTENT_CARD_META_SX = {
  fontSize: 12,
  fontWeight: 500,
  color: MUTED,
  lineHeight: 1.35,
};

export const CONTENT_CARD_TITLE_SX = {
  fontSize: 14,
  fontWeight: 600,
  color: TEXT,
  lineHeight: 1.35,
};

export function contentInputSx(hasError = false) {
  return {
    fontSize: 14,
    fontWeight: 500,
    color: TEXT,
    px: 1.25,
    py: 0.75,
    minHeight: 40,
    borderRadius: '10px',
    border: `1px solid ${hasError ? '#DC2626' : BORDER_STRONG}`,
    bgcolor: '#fff',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
    '&:focus-within': {
      borderColor: hasError ? '#DC2626' : PRIMARY,
    },
    '& .MuiInputBase-input::placeholder': {
      color: MUTED,
      opacity: 0.65,
      fontWeight: 400,
    },
  };
}

export function contentFieldSx(hasError, _theme = CHAPTER_THEME) {
  return contentInputSx(hasError);
}

export const TEST_ADD_QUESTION_THEME = {
  color: '#059669',
  bg: 'transparent',
  border: BORDER,
  focus: 'rgba(5,150,105,0.22)',
};

export const TEST_ADD_SECTION_THEME = {
  color: '#7C3AED',
  bg: 'transparent',
  border: BORDER,
  focus: 'rgba(124,58,237,0.22)',
};

export function contentAddButtonSx(_theme = CHAPTER_THEME) {
  return {
    border: `1px dashed ${BORDER_STRONG}`,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    color: MUTED,
    px: 1.5,
    py: 0.85,
    borderRadius: '10px',
    bgcolor: 'transparent',
    transition: 'color 0.15s, border-color 0.15s, background-color 0.15s',
    '&:hover': {
      color: PRIMARY,
      borderColor: 'rgba(8,145,178,0.35)',
      bgcolor: 'rgba(8,145,178,0.03)',
    },
  };
}

export const CONTENT_DIVIDER_SX = {
  borderBottom: `1px solid ${BORDER}`,
};

export function contentNestedSx(_theme = LESSON_THEME) {
  return {
    pl: { xs: 1.25, sm: 2 },
    ml: { xs: 0.5, sm: 0.75 },
  };
}

export const BUILDER_PANEL_SX = {
  bgcolor: '#fff',
  borderRadius: '14px',
  border: `1px solid ${BORDER}`,
  boxShadow: 'none',
};

/** @deprecated — không dùng nền header màu nữa */
export const CHAPTER_HEADER_BG = 'transparent';

export function chapterCardSx(_expanded = true) {
  return {
    bgcolor: '#fff',
    borderRadius: '14px',
    border: `1px solid ${BORDER}`,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: 'none',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      bgcolor: CHAPTER_THEME.accent,
      borderRadius: '14px 14px 0 0',
    },
  };
}

export function lessonBlockSx() {
  return {
    bgcolor: '#fff',
    borderRadius: '12px',
    border: `1px solid ${BORDER}`,
    mb: 2,
    overflow: 'hidden',
  };
}

export function lessonHeaderSx(expanded = true) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 0.75,
    px: 1.75,
    py: 1.1,
    bgcolor: LESSON_THEME.headerBg,
    borderBottom: expanded ? `1px solid ${BORDER}` : 'none',
  };
}

export function lessonBodySx() {
  return {
    px: 1.75,
    py: 2,
    pb: 1.75,
    bgcolor: '#fff',
  };
}

export function materialRowSx(isDragOver = false) {
  return {
    py: 2,
    px: { xs: 0, sm: 0.25 },
    borderTop: `1px solid ${BORDER}`,
    borderBottom: isDragOver ? `2px solid ${PRIMARY}` : 'none',
    opacity: 1,
    transition: 'border-color 0.15s ease, opacity 0.15s ease',
    '&:first-of-type': { borderTop: 'none', pt: 1.5 },
  };
}

export const ICON_BTN_SX = {
  color: MUTED,
  p: 0.5,
  '&:hover': { color: TEXT, bgcolor: 'rgba(15,23,42,0.04)' },
};

export const DELETE_ICON_BTN_SX = {
  color: MUTED,
  p: 0.5,
  '&:hover': { color: '#DC2626', bgcolor: 'rgba(220,38,38,0.05)' },
};
