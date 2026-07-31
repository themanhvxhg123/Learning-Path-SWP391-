import { Box, InputBase } from '@mui/material';
import { ContentFieldLabel } from '../course/MentorContentSectionHeading';
import { contentMultilineInputSx } from '../course/mentorCourseContentStyles';
import MentorTestListeningSourceEditor from '../course/MentorTestListeningSourceEditor';
import MentorQuestionBankSectionQuestionsBlock from './MentorQuestionBankSectionQuestionsBlock';

const fieldLabelSx = { mb: 0.5, fontSize: 12, fontWeight: 700, color: '#64748B' };

export default function MentorQuestionBankSectionListeningForm({
  section,
  accentColor,
  disabled,
  onSectionChange,
  onRegisterControls,
  questionListProps,
}) {
  const listeningPrompt = [section.SectionTitle, section.Description].filter(Boolean).join('\n\n');

  return (
    <>
      <Box sx={{ mb: 1.5 }}>
        <ContentFieldLabel sx={fieldLabelSx}>Đề bài</ContentFieldLabel>
        <InputBase
          value={listeningPrompt}
          readOnly
          disabled={disabled}
          placeholder="Đề bài nghe..."
          fullWidth
          multiline
          minRows={2}
          sx={contentMultilineInputSx(false, { color: accentColor })}
        />
      </Box>
      <MentorTestListeningSourceEditor
        section={section}
        errors={{}}
        accentColor={accentColor}
        disabled={disabled}
        onChange={onSectionChange}
        onRegisterControls={onRegisterControls}
      />
      <MentorQuestionBankSectionQuestionsBlock {...questionListProps} />
    </>
  );
}
