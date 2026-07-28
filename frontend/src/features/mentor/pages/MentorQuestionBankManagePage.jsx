/**
 * MentorQuestionBankManagePage — workspace ngân hàng câu hỏi (chỉ giao diện).
 */
import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ScrollToTopButton from '@/shared/ui/ScrollToTopButton';
import { toast } from '@/shared/ui/Toast';
import MentorQuestionBankBuilderPanel from '@/features/mentor/components/questionBank/MentorQuestionBankBuilderPanel';
import MentorQuestionBankDetailHeader from '@/features/mentor/components/questionBank/MentorQuestionBankDetailHeader';
import MentorQuestionBankOutlinePanel from '@/features/mentor/components/questionBank/MentorQuestionBankOutlinePanel';
import MentorQuestionBankSkillNav from '@/features/mentor/components/questionBank/MentorQuestionBankSkillNav';
import useQuestionBankEditorUi from '@/features/mentor/hooks/useQuestionBankEditorUi';
import useQuestionBankSectionCommit from '@/features/mentor/hooks/useQuestionBankSectionCommit';
import {
  SECTION_USE_FOR_TEST_FILTER,
  countActiveQuestionsBySkill,
  countSectionsByUseForTest,
  filterSectionsByUseForTest,
  getFilledQuestionCount,
  getVisibleSectionsBySkill,
} from '@/features/mentor/utils/mentorTestContentUtils';

/** Chỉnh demo khóa học + chương tại đây (theo courseId) */
const MOCK_COURSES_BY_ID = {
  1: {
    CourseName: 'Tiếng Anh Thương Mại & Giao Tiếp Công Sở',
    IsPublished: 1,
    CategoryDisplayName: 'Tiếng Anh thương mại',
    LevelDisplayName: 'Trung cấp',
  },
  2: {
    CourseName: 'IELTS Band 6.5 – Luyện thi Toàn diện',
    IsPublished: 1,
    CategoryDisplayName: 'Luyện thi',
    LevelDisplayName: 'Nâng cao',
  },
  3: {
    CourseName: 'Tiếng Anh Giao Tiếp Đời Sống Hằng Ngày',
    IsPublished: 1,
    CategoryDisplayName: 'Giao tiếp',
    LevelDisplayName: 'Cơ bản',
  },
};

const MOCK_CHAPTERS_BY_COURSE_ID = {
  1: [
    { PathId: 1, PathName: 'Khởi động & Làm quen thuật ngữ', Order: 1 },
    { PathId: 2, PathName: 'Kỹ năng viết Email chuyên nghiệp', Order: 2 },
  ],
  3: [
    { PathId: 1, PathName: 'Chào hỏi & Giới thiệu bản thân', Order: 1 },
    { PathId: 2, PathName: 'Mua sắm & Hỏi giá', Order: 2 },
    { PathId: 3, PathName: 'Nhà hàng & Gọi món', Order: 3 },
  ],
};

export default function MentorQuestionBankManagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, pathId } = useParams();
  const navState = location.state ?? {};

  const mockCourse = MOCK_COURSES_BY_ID[Number(courseId)];
  const course = useMemo(
    () => ({
      CourseId: courseId,
      CourseName: navState.courseName ?? mockCourse?.CourseName ?? `Khóa học #${courseId}`,
      IsPublished: navState.coursePublished ?? Boolean(mockCourse?.IsPublished),
      CategoryDisplayName: navState.categoryName ?? mockCourse?.CategoryDisplayName,
      LevelDisplayName: navState.levelName ?? mockCourse?.LevelDisplayName,
    }),
    [courseId, mockCourse, navState],
  );

  const coursePaths = useMemo(
    () => MOCK_CHAPTERS_BY_COURSE_ID[Number(courseId)] ?? [],
    [courseId],
  );
  const selectedPath = coursePaths.find((item) => String(item.PathId) === String(pathId));
  const bankTitle =
    navState.pathName?.trim() ?? selectedPath?.PathName?.trim() ?? `Chương #${pathId}`;
  const courseCategory = [course.CategoryDisplayName, course.LevelDisplayName]
    .filter(Boolean)
    .join(' · ');

  const [sectionUseForTestFilter, setSectionUseForTestFilter] = useState(
    SECTION_USE_FOR_TEST_FILTER.ALL,
  );
  const [sectionBaselines] = useState({});
  const [sectionSourceBaselines] = useState({});
  const [updatingSectionId] = useState('');

  const {
    sections,
    sectionErrors,
    activeSkill,
    activeSection,
    activeSectionIndex,
    skillSections: skillSectionsFiltered,
    activeSectionId,
    handleSectionChange,
    handleSkillSelect,
    handleSectionSelect,
    handleAddBai,
    handleOutlineNavigate,
  } = useQuestionBankEditorUi({ resetKey: pathId });

  const { bindSectionControls, flushActiveSection } = useQuestionBankSectionCommit();

  const skillSectionsAll = useMemo(
    () => getVisibleSectionsBySkill(sections, activeSkill),
    [sections, activeSkill],
  );

  const skillSections = useMemo(
    () => filterSectionsByUseForTest(skillSectionsAll, sectionUseForTestFilter),
    [skillSectionsAll, sectionUseForTestFilter],
  );

  const sectionUseForTestCounts = useMemo(
    () => countSectionsByUseForTest(skillSectionsAll),
    [skillSectionsAll],
  );

  const questionCount = getFilledQuestionCount(sections);
  const questionCountBySkill = countActiveQuestionsBySkill(sections);

  const handleUpdateSection = () => {
    flushActiveSection();
    toast.info('Chỉ hiển thị giao diện — chưa lưu dữ liệu ngân hàng câu hỏi.');
  };

  const handleQuestionsFullyRestored = (tempId, nextSection) => {
    handleSectionChange(tempId, nextSection);
  };

  const handlePathSelect = (nextPathId) => {
    if (String(nextPathId) === String(pathId)) return;
    const nextPath = coursePaths.find((p) => String(p.PathId) === String(nextPathId));
    navigate(`/mentor/question-banks/${courseId}/${nextPathId}`, {
      replace: true,
      state: {
        ...navState,
        pathName: nextPath?.PathName,
        pathOrder: nextPath?.Order,
      },
    });
  };

  const handleBack = () => {
    navigate(`/mentor/question-banks/${courseId}`);
  };

  if (!courseId || !pathId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', color: '#64748B' }}>
        Thiếu courseId hoặc pathId. Ví dụ: /mentor/question-banks/3/1
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', lg: 1520 }, mx: 'auto' }}>
      <MentorQuestionBankDetailHeader
        isCreateMode
        breadcrumbMode="coursePath"
        bankTitle={bankTitle}
        courseId={courseId}
        courseName={course.CourseName}
        coursePublished={Boolean(course.IsPublished)}
        totalQuestionCount={questionCount}
        questionCountBySkill={questionCountBySkill}
        onBack={handleBack}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, lg: 2.5 },
          alignItems: 'start',
        }}
      >
        <MentorQuestionBankSkillNav
          sections={sections}
          activeSkill={activeSkill}
          sectionErrors={sectionErrors}
          chapterQuizConfig={null}
          onSkillChange={handleSkillSelect}
        />

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(280px, 3fr)' },
            gap: { xs: 2, lg: 2.5 },
            alignItems: 'start',
          }}
        >
          <MentorQuestionBankBuilderPanel
            sections={sections}
            activeSkill={activeSkill}
            activeSection={activeSection}
            activeSectionIndex={activeSectionIndex}
            activeSectionId={activeSectionId}
            skillSections={skillSections}
            skillSectionsAllCount={skillSectionsAll.length}
            sectionUseForTestFilter={sectionUseForTestFilter}
            sectionUseForTestCounts={sectionUseForTestCounts}
            onSectionUseForTestFilterChange={setSectionUseForTestFilter}
            sectionErrors={sectionErrors}
            sectionBaselines={sectionBaselines}
            sectionSourceBaselines={sectionSourceBaselines}
            activeSectionDirty={false}
            updatingSection={updatingSectionId === activeSectionId}
            questionCount={questionCount}
            coursePublished={Boolean(course.IsPublished)}
            chapterQuizConfig={null}
            onSectionSelect={handleSectionSelect}
            onAddBai={handleAddBai}
            onSectionChange={handleSectionChange}
            onQuestionsFullyRestored={handleQuestionsFullyRestored}
            onUpdateSection={handleUpdateSection}
            onRegisterSectionControls={bindSectionControls}
          />

          <MentorQuestionBankOutlinePanel
            sections={sections}
            activeSkill={activeSkill}
            activeSectionId={activeSectionId}
            sectionUseForTestFilter={sectionUseForTestFilter}
            onNavigateToItem={handleOutlineNavigate}
            courseName={course.CourseName}
            courseCategory={courseCategory}
            chapterTitle={bankTitle}
            courseChapters={coursePaths}
            selectedChapterId={pathId}
            courseId={courseId}
            chapterQuizConfig={null}
            onChapterSelect={handlePathSelect}
          />
        </Box>
      </Box>

      <ScrollToTopButton avoidSelectors={['#app-site-footer']} />
    </Box>
  );
}
