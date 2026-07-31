import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { MUTED } from '../course/mentorCourseCreateStyles';
import MentorTestQuestionCard from '../course/MentorTestQuestionCard';
import MentorQuestionBankQuestionEditDialog from './MentorQuestionBankQuestionEditDialog';
import { createEmptyTestQuestion } from '@/features/mentor/utils/mentorTestContentUtils';

function emptyHandler() { }

function getQuestionKey(question) {
  return question.tempId ?? question.QuestionId;
}

export default function MentorQuestionBankSectionQuestionsBlock({
  questions = [],
  emptyHint = 'Chưa có câu hỏi.',
  disabled = false,
  accentColor,
  skillType = null,
  onQuestionAdd = emptyHandler,
  onQuestionChange = emptyHandler,
}) {
  const hasQuestions = questions.length > 0;
  const [editTarget, setEditTarget] = useState(null);
  // Dialog thêm câu: draft tạo một lần khi mở, tránh tempId đổi mỗi lần render
  const [addDraft, setAddDraft] = useState(null);

  const editIndex = editTarget
    ? questions.findIndex((q) => getQuestionKey(q) === getQuestionKey(editTarget))
    : -1;

  const handleOpenAddDialog = () => {
    setAddDraft(createEmptyTestQuestion({ skillType }));
  };

  const handleCloseAddDialog = () => {
    setAddDraft(null);
  };

  const handleSaveAdd = (nextQuestion) => {
    onQuestionAdd(nextQuestion);
    setAddDraft(null);
  };

  const handleSaveEdit = (nextQuestion) => {
    const key = getQuestionKey(nextQuestion);
    onQuestionChange(key, nextQuestion);
    setEditTarget(null);
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase' }}>
          Câu hỏi
        </Typography>
        {hasQuestions ? (
          <Button size="small" startIcon={<AddRoundedIcon />} onClick={handleOpenAddDialog} disabled={disabled}>
            Thêm
          </Button>
        ) : null}
      </Box>

      {!hasQuestions ? (
        <Box
          sx={{
            py: 3.5,
            px: 2,
            textAlign: 'center',
            bgcolor: '#fff',
            borderRadius: '10px',
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          }}
        >
          <Typography sx={{ fontSize: 13, color: MUTED, mb: 1.5, lineHeight: 1.5 }}>
            {emptyHint}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenAddDialog}
            disabled={disabled}
            sx={{
              bgcolor: '#fff',
              borderColor: 'rgba(15,23,42,0.14)',
              fontWeight: 600,
            }}
          >
            Thêm câu hỏi
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {questions.map((question, index) => (
            <MentorTestQuestionCard
              key={getQuestionKey(question) ?? index}
              question={question}
              index={index}
              errors={{}}
              accentColor={accentColor}
              disabled={disabled}
              showActiveToggle
              collapsibleChoices
              questionBankChoices
              readOnlyTexts
              onChange={(nextQuestion) => onQuestionChange(getQuestionKey(question), nextQuestion)}
              onEdit={() => setEditTarget(question)}
            />
          ))}
        </Box>
      )}

      <MentorQuestionBankQuestionEditDialog
        open={Boolean(editTarget)}
        question={editTarget}
        questionIndex={editIndex >= 0 ? editIndex : 0}
        accentColor={accentColor}
        disabled={disabled}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />

      <MentorQuestionBankQuestionEditDialog
        open={Boolean(addDraft)}
        question={addDraft}
        questionIndex={questions.length}
        title="Thêm câu hỏi"
        accentColor={accentColor}
        disabled={disabled}
        onClose={handleCloseAddDialog}
        onSave={handleSaveAdd}
      />
    </Box>
  );
}
