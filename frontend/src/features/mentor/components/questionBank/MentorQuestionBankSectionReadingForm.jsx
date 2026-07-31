import { Box, InputBase } from '@mui/material';
import { ContentFieldLabel } from '../course/MentorContentSectionHeading';
import { contentInputSx } from '../course/mentorCourseContentStyles';
import MentorTestReadingSourceEditor from '../course/MentorTestReadingSourceEditor';
import MentorQuestionBankSectionQuestionsBlock from './MentorQuestionBankSectionQuestionsBlock';

const fieldLabelSx = { mb: 0.5, fontSize: 12, fontWeight: 700, color: '#64748B' };

export default function MentorQuestionBankSectionReadingForm({
  section,
  accentColor,
  disabled,
  onSectionChange,
  onRegisterControls,
  questionListProps,
}) {
  return (
    <>
      <Box sx={{ mb: 1.25 }}>
        <ContentFieldLabel sx={fieldLabelSx}>Đề bài</ContentFieldLabel>
        <InputBase
          value={section.SectionTitle ?? ''}
          readOnly
          disabled={disabled}
          placeholder="Đề bài đọc..."
          fullWidth
          sx={contentInputSx(false, { color: accentColor })}
        />
      </Box>
      <MentorTestReadingSourceEditor
        section={section}
        errors={{}}
        accentColor={accentColor}
        disabled={disabled}
        questionBankMode
        onChange={onSectionChange}
        onRegisterControls={onRegisterControls}
      />
      <MentorQuestionBankSectionQuestionsBlock {...questionListProps} />
    </>
  );
}
