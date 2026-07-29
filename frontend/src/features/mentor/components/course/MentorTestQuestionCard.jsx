import { useState } from 'react';
import { Box, Chip, Switch, Tooltip, Typography } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { MUTED, TEXT } from './mentorCourseCreateStyles';
import MentorQuestionTypeFields from './MentorQuestionTypeFields';
import {
  isQuestionActive,
  normalizeTestQuestion,
} from '@/features/mentor/utils/mentorTestContentUtils';

export default function MentorTestQuestionCard({
  question,
  index,
  errors = {},
  accentColor,
  disabled = false,
  contentLocked = false,
  hideDelete = false,
  useForTestLocked = false,
  useForTestLockMessage = '',
  showActiveToggle = false,
  collapsibleChoices = false,
  onChange,
  onDelete,
}) {
  const [choicesExpanded, setChoicesExpanded] = useState(false);
  const normalizedQuestion = normalizeTestQuestion(question);
  const isActive = isQuestionActive(normalizedQuestion);
  const fieldsDisabled = disabled || contentLocked;

  const handleChange = (nextQuestion) => onChange(normalizeTestQuestion(nextQuestion));

  const handleActiveToggle = (event) => {
    handleChange({ ...normalizedQuestion, isUseForTest: event.target.checked });
  };

  const isInactive = showActiveToggle && !isActive;
  const hasCorrectAnswerError = Boolean(errors._correctOption);

  return (
    <Box
      id={normalizedQuestion.tempId ? `qb-question-${normalizedQuestion.tempId}` : undefined}
      sx={{
        borderRadius: '10px',
        border: hasCorrectAnswerError
          ? '1px solid rgba(220,38,38,0.55)'
          : isInactive
            ? '1px solid #DC2626'
            : '1px solid rgba(15,23,42,0.08)',
        bgcolor: hasCorrectAnswerError
          ? 'rgba(220,38,38,0.04)'
          : '#fff',
        overflow: 'hidden',
        scrollMarginTop: 24,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: { xs: 1.25, sm: 1.35 },
          py: 0.65,
          borderBottom: '1px solid rgba(15,23,42,0.06)',
        }}
      >
        {!collapsibleChoices ? (
          <Typography
            component="span"
            sx={{ fontSize: 12, fontWeight: 700, color: TEXT, flexShrink: 0, lineHeight: 1.5 }}
          >
            Câu {index + 1}
          </Typography>
        ) : null}

        {contentLocked ? (
          <Chip
            size="small"
            label="Câu hỏi đã lưu"
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 600,
              bgcolor: 'rgba(100,116,139,0.08)',
              color: MUTED,
            }}
          />
        ) : null}

        {showActiveToggle && !collapsibleChoices && !isActive ? (
          <Chip
            size="small"
            icon={<VisibilityOffOutlinedIcon sx={{ fontSize: '14px !important' }} />}
            label="Ẩn khỏi quiz mới"
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 600,
              bgcolor: 'rgba(234,88,12,0.08)',
              color: '#C2410C',
            }}
          />
        ) : null}

        {showActiveToggle ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
            <Tooltip
              title={useForTestLockMessage}
              arrow
              disableHoverListener={!useForTestLocked}
            >
              <span>
                <Switch
                  size="small"
                  checked={isActive}
                  onChange={handleActiveToggle}
                  disabled={disabled || useForTestLocked}
                  inputProps={{
                    'aria-label': collapsibleChoices
                      ? 'Dùng câu hỏi trong bài kiểm tra'
                      : 'Bật câu hỏi cho quiz mới',
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: accentColor,
                      opacity: 0.5,
                    },
                  }}
                />
              </span>
            </Tooltip>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: MUTED, userSelect: 'none' }}>
              {collapsibleChoices ? 'Dùng trong bài kiểm tra' : 'Dùng cho quiz'}
            </Typography>
          </Box>
        ) : null}

        <Box sx={{ flex: 1 }} />

        {!contentLocked && !hideDelete ? (
          <Box
            component="button"
            type="button"
            onClick={onDelete}
            disabled={fieldsDisabled}
            aria-label="Xóa câu hỏi"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.35,
              flexShrink: 0,
              border: 'none',
              background: 'none',
              cursor: fieldsDisabled ? 'default' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(15,23,42,0.45)',
              px: 0.5,
              py: 0.35,
              borderRadius: '8px',
              opacity: fieldsDisabled ? 0.5 : 1,
              transition: 'color 0.15s, background-color 0.15s',
              '& .MuiSvgIcon-root': {
                fontSize: 17,
                color: 'inherit',
                transition: 'color 0.15s',
              },
              '&:hover': fieldsDisabled
                ? undefined
                : {
                    color: '#DC2626',
                    bgcolor: 'rgba(220,38,38,0.06)',
                  },
            }}
          >
            <DeleteOutlineRoundedIcon />
            Xóa
          </Box>
        ) : null}
      </Box>

      <Box sx={{ px: { xs: 1.25, sm: 1.35 }, pt: collapsibleChoices ? 0.85 : 1.15, pb: 1.35 }}>
        <MentorQuestionTypeFields
          question={normalizedQuestion}
          errors={errors}
          accentColor={accentColor}
          disabled={fieldsDisabled}
          onChange={handleChange}
          collapsibleChoices={collapsibleChoices}
          choicesExpanded={choicesExpanded}
          onChoicesExpandedChange={setChoicesExpanded}
          questionIndex={index}
        />
      </Box>
    </Box>
  );
}
