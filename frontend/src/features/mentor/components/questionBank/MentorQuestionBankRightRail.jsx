/**
 * Cột phải dùng chung — thứ tự cố định: mục lục nội dung → mục lục khóa học.
 */
import { Box } from '@mui/material';
import { HEADER_HEIGHT } from '@/shared/layout/MainLayout';
import MentorQuestionBankContentOutline from '@/features/mentor/components/questionBank/MentorQuestionBankContentOutline';
import { MentorQuestionBankCourseOutlinePanel } from '@/features/mentor/components/questionBank/MentorQuestionBankCourseOutline';

export default function MentorQuestionBankRightRail({
  sections = [],
  activeSkill = '',
  activeSectionId = '',
  onNavigateToItem,
  courseName = '',
  courseCategory = '',
  chapterTitle = '',
  coursePaths = [],
  pathsLoading = false,
  selectedPathId = '',
  chapterError = '',
  courseId = '',
  courseOutlineHint,
  onPathSelect,
  onChapterQuizSetup,
  onCourseQuizSetup,
  footer = null,
}) {
  return (
    <Box
      sx={{
        position: { lg: 'sticky' },
        top: { lg: HEADER_HEIGHT + 16 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignSelf: 'flex-start',
      }}
    >
      <MentorQuestionBankContentOutline
        sections={sections}
        activeSkill={activeSkill}
        activeSectionId={activeSectionId}
        onNavigateToItem={onNavigateToItem}
      />

      <MentorQuestionBankCourseOutlinePanel
        courseName={courseName}
        courseCategory={courseCategory}
        chapterTitle={chapterTitle}
        coursePaths={coursePaths}
        pathsLoading={pathsLoading}
        selectedPathId={selectedPathId}
        chapterError={chapterError}
        courseId={courseId}
        hint={courseOutlineHint}
        onPathSelect={onPathSelect}
        onChapterQuizSetup={onChapterQuizSetup}
        onCourseQuizSetup={onCourseQuizSetup}
      />

      {footer ? (
        <Box sx={{ display: { xs: 'none', lg: 'block' }, width: '100%' }}>{footer}</Box>
      ) : null}
    </Box>
  );
}
