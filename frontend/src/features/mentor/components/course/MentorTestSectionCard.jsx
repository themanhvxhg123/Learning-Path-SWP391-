import { useEffect, useState } from 'react';
import { Box, Collapse, IconButton, InputBase, Switch, Typography } from '@mui/material';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { MUTED, TEXT } from './mentorCourseCreateStyles';
import ListeningForm from '../questionBank/MentorQuestionBankSectionListeningForm';
import ReadingForm from '../questionBank/MentorQuestionBankSectionReadingForm';
import VocabularyForm from '../questionBank/MentorQuestionBankSectionVocabularyForm';
import MentorQuestionBankSectionEditDialog from '../questionBank/MentorQuestionBankSectionEditDialog';
import { TEST_SKILL_CHIP_COLORS, TEST_SKILL_LISTENING, TEST_SKILL_READING, TEST_SKILL_VOCABULARY } from '@/features/mentor/utils/mentorTestContentUtils';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { toast } from '@/shared/ui/Toast';
import axios from 'axios';
const FORM_BY_TYPE = {
  1: ListeningForm,
  2: ReadingForm,
  3: VocabularyForm,
};

const THEME_BY_TYPE = {
  1: TEST_SKILL_LISTENING,
  2: TEST_SKILL_READING,
  3: TEST_SKILL_VOCABULARY,
};


function toSectionList(sections) {
  if (Array.isArray(sections)) return sections;
  if (sections && typeof sections === 'object') return [sections];
  return [];
}

function readSectionSwitchOn(section) {
  const raw = section?.IsUseForTest ?? section?.isUseForTest;
  if (raw == null) return false;
  if (raw === false || raw === 0) return false;
  return true;
}

/** Cùng rule backend khi bật section dùng trong test */
function validateEnableSectionForTest(questions = []) {
  if (questions.length < 1) {
    return 'Section chưa có câu hỏi. Không thể bật dùng trong bài kiểm tra.';
  }
  const hasQuestionForTest = questions.some(
    (q) => q.IsUseForTest !== false && q.isUseForTest !== false,
  );
  if (!hasQuestionForTest) {
    return 'Cần ít nhất một câu hỏi được bật "Dùng trong bài kiểm tra".';
  }
  return null;
}

function SectionCard({ section, disabled, defaultExpanded, onSectionChange }) {
  //__State
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [switchIsUseForTest, setSwitchIsUseForTest] = useState(() => readSectionSwitchOn(section));

  //__State for dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState(null); // true/false sau khi user bấm switch
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const Form = FORM_BY_TYPE[section.TypeId];
  const accentColor = TEST_SKILL_CHIP_COLORS[THEME_BY_TYPE[section.TypeId]]?.color ?? '#64748B';
  const questions = section.Questions ?? [];
  // Tên tab: ưu tiên SectionName, fallback DisplayName
  const headerName = section.SectionName ?? section.DisplayName ?? '';

  useEffect(() => {
    if (confirmOpen || confirmLoading) return;
    setSwitchIsUseForTest(readSectionSwitchOn(section));
  }, [section.SectionId, section.IsUseForTest, section.isUseForTest, confirmOpen, confirmLoading]);

  const applySectionUseForTestLocal = (nextValue) => {
    setSwitchIsUseForTest(nextValue);
    onSectionChange?.({ IsUseForTest: nextValue, isUseForTest: nextValue });
  };

  //__handle dialog
  const handleConfirm = async () => {
    const nextValue = pendingValue;
    setConfirmLoading(true);

    try {
      if (nextValue) {
        const validationError = validateEnableSectionForTest(questions);
        if (validationError) {
          toast.error(validationError);
          return;
        }
      }

      if (section.isDraftSection) {
        applySectionUseForTestLocal(nextValue);
        setConfirmOpen(false);
        setPendingValue(null);
        return;
      }

      const { data } = await axios.post(
        'http://localhost:5000/api/questionBank/section/updateStatus',
        { sectionId: section.SectionId, status: nextValue },
      );
      if (data?.status === false) {
        toast.error(data.message ?? 'Không thể cập nhật trạng thái section.');
        return;
      }
      applySectionUseForTestLocal(nextValue);
      setConfirmOpen(false);
      setPendingValue(null);
    } catch (error) {
      const message =
        error.response?.data?.message ?? 'Không thể cập nhật trạng thái section.';
      toast.error(message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirmLoading) return;
    setConfirmOpen(false);
    setPendingValue(null);
    // switch giữ nguyên vì chưa setSwitchIsUseForTest
  };
  const handleSwitchClick = (event) => {
    // Switch MUI tự đổi UI khi onChange — chỉ mở confirm, chưa đổi state
    event.preventDefault();
    if (disabled || confirmLoading) return;
    setPendingValue(!switchIsUseForTest);
    setConfirmOpen(true);
  };

  const getQuestionKey = (question) => question.tempId ?? question.QuestionId;

  const handleQuestionChange = (questionKey, nextQuestion) => {
    if (!onSectionChange) return;
    const nextQuestions = questions.map((q) =>
      getQuestionKey(q) === questionKey ? nextQuestion : q,
    );
    onSectionChange({ Questions: nextQuestions });
  };

  const handleSaveSectionInfo = (patch) => {
    onSectionChange?.(patch);
    setEditSectionOpen(false);
  };

  const handleAddQuestion = (newQuestion) => {
    onSectionChange?.({ Questions: [...questions, newQuestion] });
  };

  return (
    <Box
      id={`qb-section-${section.tempId ?? section.SectionId}`}
      sx={{
        borderRadius: '14px',
        border: '1px solid rgba(15,23,42,0.08)',
        borderLeft: `3px solid ${accentColor}`,
        bgcolor: '#fff',
        boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: { xs: 1.25, sm: 1.5 },
          py: 0.9,
          borderBottom: expanded ? '1px solid rgba(15,23,42,0.07)' : 'none',
        }}
      >
        <InputBase
          value={headerName}
          readOnly
          placeholder="Tên section"
          fullWidth
          sx={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            color: TEXT,
            borderBottom: '1px solid rgba(15,23,42,0.12)',
            '& input::placeholder': { color: MUTED },
          }}
        />
        {questions.length > 0 && (
          <Typography sx={{ fontSize: 11, color: MUTED }}>{questions.length} câu</Typography>
        )}
        <Box
          component="button"
          type="button"
          onClick={() => setEditSectionOpen(true)}
          disabled={disabled}
          aria-label="Sửa thông tin section"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            flexShrink: 0,
            px: 1.1,
            py: 0.5,
            borderRadius: '8px',
            border: `1px solid ${accentColor}66`,
            bgcolor: `${accentColor}14`,
            color: accentColor,
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.2,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.55 : 1,
            transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
            boxShadow: `0 1px 2px ${accentColor}22`,
            '& .MuiSvgIcon-root': { fontSize: 16 },
            '&:hover': disabled
              ? undefined
              : {
                  bgcolor: `${accentColor}22`,
                  borderColor: accentColor,
                  boxShadow: `0 2px 6px ${accentColor}33`,
                },
          }}
        >
          <EditOutlinedIcon />
          Edit
        </Box>
        <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: MUTED, p: 0.45 }}>
          {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: { xs: 1.25, sm: 1.5 }, bgcolor: '#F8FAFC' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <Switch
              size="small"
              checked={Boolean(switchIsUseForTest)}
              disabled={disabled || confirmLoading}
              onChange={() => {}}
              slotProps={{ input: { readOnly: true } }}
              onClick={handleSwitchClick}
            />
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: MUTED }}>
              Section được dùng cho bài kiểm tra
            </Typography>
          </Box>
          <Form
            section={section}
            accentColor={accentColor}
            disabled={disabled}
            onSectionChange={() => { }}
            onRegisterControls={() => { }}
            questionListProps={{
              questions,
              emptyHint: section.TypeId === 3 ? 'Chưa có câu hỏi trong nhóm này.' : 'Chưa có câu hỏi trong bài này.',
              disabled,
              accentColor,
              skillType: THEME_BY_TYPE[section.TypeId],
              onQuestionAdd: handleAddQuestion,
              onQuestionChange: handleQuestionChange,
            }}
          />
        </Box>
      </Collapse>
      <ConfirmDialog
        open={confirmOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title="Đổi trạng thái dùng trong test?"
        message="Bạn có chắc muốn thay đổi section này?"
        confirmLabel="Đồng ý"
        cancelLabel="Hủy"
        loading={confirmLoading}
      />
      <MentorQuestionBankSectionEditDialog
        open={editSectionOpen}
        section={section}
        accentColor={accentColor}
        disabled={disabled}
        onClose={() => setEditSectionOpen(false)}
        onSave={handleSaveSectionInfo}
      />
    </Box>
  );
}

export default function MentorTestSectionCard({
  sections = [],
  disabled = false,
  defaultExpanded = true,
  onSectionChange,
}) {
  const sectionList = toSectionList(sections);

  if (sectionList.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {sectionList.map((section, index) => (
        <SectionCard
          key={section.SectionId}
          section={section}
          disabled={disabled}
          defaultExpanded={defaultExpanded}
          onSectionChange={
            onSectionChange
              ? (patch) => onSectionChange(section.SectionId, patch)
              : undefined
          }
        />
      ))}

    </Box>
  );
}
