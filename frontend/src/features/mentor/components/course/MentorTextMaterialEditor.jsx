import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import RedoRoundedIcon from '@mui/icons-material/RedoRounded';
import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded';
import FormatItalicRoundedIcon from '@mui/icons-material/FormatItalicRounded';
import FormatUnderlinedRoundedIcon from '@mui/icons-material/FormatUnderlinedRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import FormatAlignLeftRoundedIcon from '@mui/icons-material/FormatAlignLeftRounded';
import FormatAlignCenterRoundedIcon from '@mui/icons-material/FormatAlignCenterRounded';
import FormatAlignRightRoundedIcon from '@mui/icons-material/FormatAlignRightRounded';
import FormatClearRoundedIcon from '@mui/icons-material/FormatClearRounded';
import AppButton from '@/shared/ui/AppButton';
import { isHtmlContentEmpty } from '@/features/mentor/utils/mentorCourseContentUtils';
import { fetchTextMaterialHtml } from '@/features/mentor/services/materialUploadService';
import { ContentFieldLabel } from './MentorContentSectionHeading';
import { MUTED, TEXT } from './mentorCourseCreateStyles';
import { MATERIAL_TYPE_THEME } from './mentorCourseContentStyles';

// TODO: backend should support Content for TEXT material

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];
const DEFAULT_FONT_SIZE = 14;

const EMPTY_FORMATS = {
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
  align: 'left',
  fontSize: DEFAULT_FONT_SIZE,
};

/** Treat blank HTML as empty — covers <br>, <p><br></p>, tags-only, etc. */
function isHtmlEmpty(html) {
  return isHtmlContentEmpty(html);
}

function snapFontSize(px) {
  if (!px || Number.isNaN(px)) return DEFAULT_FONT_SIZE;
  if (FONT_SIZES.includes(px)) return px;
  return FONT_SIZES.reduce((best, curr) =>
    Math.abs(curr - px) < Math.abs(best - px) ? curr : best,
  );
}

function getFontSizeAtNode(node, editorEl) {
  let current = node;
  if (current?.nodeType === Node.TEXT_NODE) current = current.parentElement;
  while (current && current !== editorEl) {
    const inline = current.style?.fontSize;
    if (inline) {
      const px = parseInt(inline, 10);
      if (!Number.isNaN(px)) return px;
    }
    current = current.parentElement;
  }
  if (node) {
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (el) {
      const computed = parseInt(window.getComputedStyle(el).fontSize, 10);
      if (!Number.isNaN(computed)) return computed;
    }
  }
  return DEFAULT_FONT_SIZE;
}

function readFormats(editorEl) {
  if (!editorEl) return { ...EMPTY_FORMATS };

  let fontSize = DEFAULT_FONT_SIZE;
  try {
    const sel = window.getSelection();
    if (sel?.rangeCount && editorEl.contains(sel.anchorNode)) {
      fontSize = getFontSizeAtNode(sel.anchorNode, editorEl);
    }
  } catch {
    /* ignore */
  }

  try {
    let align = 'left';
    if (document.queryCommandState('justifyCenter')) align = 'center';
    else if (document.queryCommandState('justifyRight')) align = 'right';

    return {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      unorderedList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
      align,
      fontSize: snapFontSize(fontSize),
    };
  } catch {
    return { ...EMPTY_FORMATS, fontSize: snapFontSize(fontSize) };
  }
}

function saveSelection(editorEl, savedRangeRef) {
  const sel = window.getSelection();
  if (!sel?.rangeCount || !editorEl) return;
  const anchor = sel.anchorNode;
  if (anchor && editorEl.contains(anchor)) {
    savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection(editorEl, savedRangeRef) {
  const sel = window.getSelection();
  if (!sel || !savedRangeRef.current || !editorEl) return false;
  try {
    sel.removeAllRanges();
    sel.addRange(savedRangeRef.current);
    return editorEl.contains(sel.anchorNode);
  } catch {
    return false;
  }
}

function cleanHtml(html) {
  return String(html ?? '').replace(/\u200B|\uFEFF/g, '');
}

/** Wrap selection (or prepare empty span for next typing) with font-size */
function applyFontSizeToSelection(px) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;

  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style.fontSize = `${px}px`;

  if (range.collapsed) {
    span.appendChild(document.createTextNode(''));
    range.insertNode(span);
    const next = document.createRange();
    next.setStart(span, 0);
    next.collapse(true);
    sel.removeAllRanges();
    sel.addRange(next);
    return;
  }

  try {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
    const next = document.createRange();
    next.selectNodeContents(span);
    next.collapse(false);
    sel.removeAllRanges();
    sel.addRange(next);
  } catch {
    document.execCommand('insertHTML', false, `<span style="font-size:${px}px">${range.toString()}</span>`);
  }
}

function ToolbarBtn({ title, active, disabled, onMouseDown, children }) {
  const theme = MATERIAL_TYPE_THEME.TEXT;
  return (
    <Tooltip title={title} arrow>
      <span>
        <IconButton
          size="small"
          disabled={disabled}
          onMouseDown={onMouseDown}
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            color: active ? theme.color : '#475569',
            bgcolor: active ? 'rgba(8,145,178,0.10)' : 'transparent',
            '&:hover': { bgcolor: 'rgba(8,145,178,0.08)', color: theme.color },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

const RICH_CONTENT_SX = {
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: 1.65,
  color: TEXT,
  wordBreak: 'break-word',
  fontSynthesis: 'style',
  fontFamily: '"Segoe UI", system-ui, -apple-system, "Noto Sans", sans-serif',
  '& p': { margin: '0 0 6px' },
  '& ul, & ol': { paddingLeft: '1.5rem', marginBottom: '6px' },
  '& li': { marginBottom: '3px' },
  '& i, & em': { fontStyle: 'italic' },
  '& b, & strong': { fontWeight: 700 },
  '& u': { textDecoration: 'underline' },
  '& [style*="font-style"]': { fontStyle: 'italic' },
  '& [style*="font-weight: bold"], & [style*="font-weight:bold"]': { fontWeight: 700 },
  '& [style*="text-decoration: underline"], & [style*="text-decoration:underline"]': {
    textDecoration: 'underline',
  },
};

const PREVIEW_CONTENT_SX = {
  minHeight: 280,
  p: 2,
  borderRadius: '14px',
  bgcolor: '#fff',
  border: '1px solid rgba(15,23,42,0.08)',
  ...RICH_CONTENT_SX,
};

export default function MentorTextMaterialEditor({
  material,
  errors = {},
  onChange,
  disabled = false,
}) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const lastHtmlRef = useRef('');
  const isComposingRef = useRef(false);
  const syncTimerRef = useRef(null);
  const materialTempIdRef = useRef(material.tempId);
  const onChangeRef = useRef(onChange);
  const [showPreview, setShowPreview] = useState(false);
  const [formats, setFormats] = useState({ ...EMPTY_FORMATS });
  const [editorEmpty, setEditorEmpty] = useState(true);
  const [editorFocused, setEditorFocused] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const theme = MATERIAL_TYPE_THEME.TEXT;

  materialTempIdRef.current = material.tempId;
  onChangeRef.current = onChange;

  const updateEditorEmptyState = useCallback((html) => {
    setEditorEmpty(isHtmlEmpty(html));
  }, []);

  const flushSyncFromDom = useCallback(() => {
    if (!editorRef.current || isComposingRef.current) return;

    const html = cleanHtml(editorRef.current.innerHTML);
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      onChangeRef.current(materialTempIdRef.current, { Content: html });
    }
    updateEditorEmptyState(html);
  }, [updateEditorEmptyState]);

  const scheduleSyncFromDom = useCallback(() => {
    if (isComposingRef.current) return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null;
      flushSyncFromDom();
    }, 300);
  }, [flushSyncFromDom]);

  const refreshFormats = useCallback(() => {
    if (isComposingRef.current) return;
    setFormats(readFormats(editorRef.current));
  }, []);

  const captureSelection = useCallback(() => {
    saveSelection(editorRef.current, savedRangeRef);
  }, []);

  const runCommand = useCallback(
    (runner) => {
      const el = editorRef.current;
      if (!el || disabled) return;
      el.focus();
      restoreSelection(el, savedRangeRef);
      runner();
      saveSelection(el, savedRangeRef);
      flushSyncFromDom();
      refreshFormats();
    },
    [disabled, flushSyncFromDom, refreshFormats],
  );

  const handleExec = useCallback(
    (cmd, value = null) => {
      runCommand(() => {
        document.execCommand(cmd, false, value);
      });
    },
    [runCommand],
  );

  const handleFontSizeChange = useCallback(
    (e) => {
      const px = Number(e.target.value);
      if (!px || Number.isNaN(px)) return;
      runCommand(() => {
        applyFontSizeToSelection(px);
      });
    },
    [runCommand],
  );

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (!text) return;
      runCommand(() => {
        document.execCommand('insertText', false, text);
      });
    },
    [runCommand],
  );

  const handleEditorInput = useCallback(() => {
    if (isComposingRef.current) return;
    scheduleSyncFromDom();
  }, [scheduleSyncFromDom]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    window.requestAnimationFrame(() => {
      flushSyncFromDom();
      captureSelection();
      refreshFormats();
    });
  }, [flushSyncFromDom, captureSelection, refreshFormats]);

  const handleEditorFocus = useCallback(() => {
    setEditorFocused(true);
    captureSelection();
  }, [captureSelection]);

  const handleEditorBlur = useCallback(() => {
    setEditorFocused(false);
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    window.requestAnimationFrame(() => {
      flushSyncFromDom();
    });
  }, [flushSyncFromDom]);

  const handleEditorMouseUp = useCallback(() => {
    if (isComposingRef.current) return;
    captureSelection();
    refreshFormats();
  }, [captureSelection, refreshFormats]);

  const preventToolbarFocusLoss = useCallback(
    (e, action) => {
      e.preventDefault();
      action();
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initEditorContent() {
      let html = material.Content || '';

      if (isHtmlEmpty(html) && material.MaterialUrl) {
        setLoadingRemote(true);
        try {
          html = await fetchTextMaterialHtml(material.MaterialUrl);
          if (!cancelled && html && !isHtmlEmpty(html)) {
            onChangeRef.current(materialTempIdRef.current, { Content: html });
          }
        } catch {
          /* giữ editor trống nếu không tải được */
        } finally {
          if (!cancelled) setLoadingRemote(false);
        }
      }

      if (!cancelled && editorRef.current) {
        editorRef.current.innerHTML = html || '';
        lastHtmlRef.current = cleanHtml(html || '');
        updateEditorEmptyState(html || '');
      }
    }

    initEditorContent();
    return () => { cancelled = true; };
    // Chỉ khởi tạo lại khi đổi học liệu — không phụ thuộc Content để tránh reset khi gõ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.tempId]);

  useEffect(() => {
    const onSelectionChange = () => {
      if (isComposingRef.current) return;
      const el = editorRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (sel?.anchorNode && el.contains(sel.anchorNode)) {
        saveSelection(el, savedRangeRef);
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  const editorSx = {
    minHeight: 320,
    maxHeight: 520,
    overflowY: 'auto',
    p: 2,
    borderRadius: '14px',
    bgcolor: '#fff',
    border: `1.5px solid ${errors.Content ? '#DC2626' : 'rgba(15,23,42,0.10)'}`,
    outline: 'none',
    cursor: disabled ? 'default' : 'text',
    transition: 'border-color 0.15s',
    '&:focus': { borderColor: errors.Content ? '#DC2626' : theme.color },
    ...RICH_CONTENT_SX,
  };

  return (
    <Box
      sx={{
        mt: 1.25,
        ml: { xs: 0, sm: 0.25 },
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: '16px',
        border: `1px solid ${errors.Content ? '#FECACA' : 'rgba(15,23,42,0.08)'}`,
        bgcolor: '#F8FAFC',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1.25,
          flexWrap: 'wrap',
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>
          Soạn nội dung văn bản
        </Typography>
        <AppButton
          variant="outlined"
          size="small"
          onClick={() => setShowPreview((v) => !v)}
          sx={{
            minWidth: 0,
            height: 30,
            px: 1.25,
            borderRadius: '999px',
            fontSize: 12,
            fontWeight: 600,
            borderColor: 'rgba(15,23,42,0.12)',
            color: MUTED,
            '&:hover': { borderColor: theme.color, color: theme.color, bgcolor: 'rgba(8,145,178,0.06)' },
          }}
        >
          {showPreview ? 'Soạn thảo' : 'Xem trước'}
        </AppButton>
      </Box>

      {!showPreview && (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 0.25,
              p: '5px 8px',
              mb: 1,
              borderRadius: '12px',
              bgcolor: '#fff',
              border: '1px solid rgba(15,23,42,0.08)',
            }}
          >
            <ToolbarBtn
              title="Hoàn tác (Ctrl+Z)"
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('undo'))}
            >
              <UndoRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Làm lại (Ctrl+Y)"
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('redo'))}
            >
              <RedoRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />

            <Select
              value={formats.fontSize}
              onMouseDown={captureSelection}
              onChange={handleFontSizeChange}
              disabled={disabled}
              size="small"
              renderValue={(v) => v}
              sx={{
                height: 30,
                minWidth: 56,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: '8px',
                bgcolor: '#F8FAFC',
                mr: 0.25,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(15,23,42,0.10)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.color },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.color },
                '& .MuiSelect-select': { py: 0, px: 1, display: 'flex', alignItems: 'center' },
              }}
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 280, '& .MuiMenuItem-root': { fontSize: 13, minHeight: 32 } },
                },
              }}
            >
              {FONT_SIZES.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </Select>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />

            <ToolbarBtn
              title="In đậm (Ctrl+B)"
              active={formats.bold}
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('bold'))}
            >
              <FormatBoldRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>
            <ToolbarBtn
              title="In nghiêng (Ctrl+I)"
              active={formats.italic}
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('italic'))}
            >
              <FormatItalicRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Gạch chân (Ctrl+U)"
              active={formats.underline}
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('underline'))}
            >
              <FormatUnderlinedRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />

            <ToolbarBtn
              title="Gạch đầu dòng"
              active={formats.unorderedList}
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('insertUnorderedList'))}
            >
              <FormatListBulletedRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Đánh số"
              active={formats.orderedList}
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('insertOrderedList'))}
            >
              <FormatListNumberedRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />

            <ToolbarBtn
              title="Căn trái"
              active={formats.align === 'left'}
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('justifyLeft'))}
            >
              <FormatAlignLeftRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Căn giữa"
              active={formats.align === 'center'}
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('justifyCenter'))}
            >
              <FormatAlignCenterRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Căn phải"
              active={formats.align === 'right'}
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('justifyRight'))}
            >
              <FormatAlignRightRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />

            <ToolbarBtn
              title="Xóa định dạng"
              disabled={disabled}
              onMouseDown={(e) => preventToolbarFocusLoss(e, () => handleExec('removeFormat'))}
            >
              <FormatClearRoundedIcon sx={{ fontSize: 18 }} />
            </ToolbarBtn>
          </Box>

          <ContentFieldLabel sx={{ mb: 0.5, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
            Nội dung văn bản
          </ContentFieldLabel>

          <Box sx={{ position: 'relative' }}>
            {loadingRemote && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.72)',
                  borderRadius: '14px',
                }}
              >
                <CircularProgress size={28} sx={{ color: theme.color }} />
              </Box>
            )}
            {editorEmpty && !disabled && !editorFocused && !loadingRemote && (
              <Typography
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 18,
                  color: '#94A3B8',
                  fontSize: DEFAULT_FONT_SIZE,
                  lineHeight: 1.65,
                  pointerEvents: 'none',
                  userSelect: 'none',
                  zIndex: 1,
                }}
              >
                Nhập nội dung văn bản tại đây...
              </Typography>
            )}
            <Box
              ref={editorRef}
              component="div"
              contentEditable={!disabled && !loadingRemote}
              suppressContentEditableWarning
              lang="vi"
              role="textbox"
              aria-multiline="true"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              onInput={handleEditorInput}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onFocus={handleEditorFocus}
              onBlur={handleEditorBlur}
              onMouseUp={handleEditorMouseUp}
              onPaste={handlePaste}
              sx={editorSx}
            />
          </Box>

          {errors.Content && (
            <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.35 }}>
              {errors.Content}
            </Typography>
          )}
        </>
      )}

      {showPreview && (
        <Box>
          <ContentFieldLabel sx={{ mb: 0.5, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
            Xem trước
          </ContentFieldLabel>
          {loadingRemote ? (
            <Box sx={{ ...PREVIEW_CONTENT_SX, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={28} sx={{ color: theme.color }} />
            </Box>
          ) : (
            <Box
              sx={PREVIEW_CONTENT_SX}
              dangerouslySetInnerHTML={{
                __html: isHtmlEmpty(material.Content)
                  ? '<span style="color:#94A3B8">Chưa có nội dung để xem trước.</span>'
                  : material.Content,
              }}
            />
          )}
          {errors.Content && (
            <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.35 }}>
              {errors.Content}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
