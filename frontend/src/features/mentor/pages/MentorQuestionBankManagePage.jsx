/**

 * MentorQuestionBankManagePage — workspace ngân hàng câu hỏi (UI; chưa nối API/lưu).

 */
import { useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ScrollToTopButton from '@/shared/ui/ScrollToTopButton';
import MentorQuestionBankBuilderPanel from '@/features/mentor/components/questionBank/MentorQuestionBankBuilderPanel';
import MentorQuestionBankDetailHeader from '@/features/mentor/components/questionBank/MentorQuestionBankDetailHeader';
import MentorQuestionBankOutlinePanel from '@/features/mentor/components/questionBank/MentorQuestionBankOutlinePanel';
import MentorQuestionBankSkillNav from '@/features/mentor/components/questionBank/MentorQuestionBankSkillNav';
import useQuestionBankEditorUi from '@/features/mentor/hooks/useQuestionBankEditorUi';

// TypeId API (1/2/3) → skill constant cho mục lục
const SKILL_BY_TYPE_ID = {
  1: TEST_SKILL_LISTENING,
  2: TEST_SKILL_READING,
  3: TEST_SKILL_VOCABULARY,
};
import {
  SECTION_USE_FOR_TEST_FILTER,
  SKILL_TO_TYPE_ID,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
  scrollToQuestionBankItem,
} from '@/features/mentor/utils/mentorTestContentUtils';
import { loadPathSectionsForEditor } from '@/features/mentor/utils/questionBankApiMappers';
import axios from 'axios';

export default function MentorQuestionBankManagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, pathId } = useParams();
  const navState = location.state ?? {};
  //__State selected Section
  const [selectedSectionId, setSelectedSectionId] = useState(0);
  const [selectedSkillId, setSelectedSkillId] = useState(1)
  //__State to filter section is used for test or not used for test
  const [sectionIsUseForTest, setSectionIsUseForTest] = useState(SECTION_USE_FOR_TEST_FILTER.ALL)
  const course = useMemo(
    () => ({
      CourseId: courseId,
      CourseName: navState.CourseName ?? `Khóa học #${courseId}`,
      PathName: navState.PathName,
      IsPublished: navState.IsPublished,
      CategoryDisplayName: navState.CategoryDisplayName,
      LevelDisplayName: navState.LevelDisplayName,
    }),
    [courseId, navState],
  );

  const coursePaths = useMemo(
    () => [
      {
        PathId: pathId,
        PathName: navState.PathName ?? `Chương #${pathId}`,
        Order: navState.PathOrder ?? 1,
      },
    ],
    [pathId, navState.PathName, navState.PathOrder],
  );

  const courseCategory = [course.CategoryDisplayName, course.LevelDisplayName]
    .filter(Boolean)
    .join(' · ');


  const { sectionErrors } = useQuestionBankEditorUi({ resetKey: pathId });
  const handlePathSelect = (nextPathId) => {
    if (String(nextPathId) === String(pathId)) return;
    navigate(`/mentor/question-banks/${courseId}/${nextPathId}`, {
      replace: true,
      state: navState,
    });
  };

  const handleBack = () => {
    navigate(`/mentor/question-banks/${courseId}`);
  }

  if (!courseId || !pathId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', color: '#64748B' }}>
        Thiếu courseId hoặc pathId. Ví dụ: /mentor/question-banks/3/1
      </Box>
    );
  }
  //___Stat in question bank skill nav
  const [statsForSkillNav, setStatsForSkillNav] = useState([])
  //__State for path's sections in question bank
  const [sectionsPath, setSectionsPath] = useState([])
  useEffect(() => {
    (async () => {
      const [resPaths, resSectionsPath] = await Promise.all([
        axios.get(`http://localhost:5000/api/questionBank/courses/${courseId}/active-stats`),
        axios.get(`http://localhost:5000/api/questionBank/path/questions?pathId=${pathId}`)
      ])
      setStatsForSkillNav(resPaths.data.data.chapters)
      const rawSections = resSectionsPath.data.pathSections ?? []
      const sections = await loadPathSectionsForEditor(rawSections)
      setSectionsPath(sections)
      setSelectedSectionId(sections[0]?.SectionId)
    })()
  }, [courseId, pathId])
  //__Number question in path's question bank
  const questionCount = statsForSkillNav?.filter((statChapter) => Number(statChapter.PathId) === Number(pathId))[0]?.totalActive
  // list section use for test follow of skills
  const sectionUseForTest = (statsForSkillNav, pathId) => {
    const statOfPath = statsForSkillNav.filter((stat) => Number(stat.PathId) === Number(pathId))
    return statOfPath.map((stat) => ({
      PathId: stat.PathId,
      LISTENING: stat.listeningSectionGroups.filter((section) => section.isUseForTest === true),
      READING: stat.readingSectionGroups.filter((section) => section.isUseForTest === true),
      VOCABULARY: stat.vocabularySectionGroups.filter((section) => section.isUseForTest === true),
    }))
  }

  // Filter sections
  const filterSection = sectionsPath
    .filter((section) => {
      return Number(section.TypeId) === Number(selectedSkillId)
    })
    .filter((section) => {
      if (sectionIsUseForTest === 'ALL') return section;
      if (sectionIsUseForTest === 'YES') return section.IsUseForTest === true;
      if (sectionIsUseForTest === 'NO') return section.IsUseForTest === false;
    })


  const sectionsBySkill = sectionsPath.filter(
    (section) => Number(section.TypeId) === Number(selectedSkillId),
  )
  const filterSectionCounts = {
    [SECTION_USE_FOR_TEST_FILTER.ALL]: sectionsBySkill.length,
    [SECTION_USE_FOR_TEST_FILTER.YES]: sectionsBySkill.filter((section) => section.IsUseForTest === true).length,
    [SECTION_USE_FOR_TEST_FILTER.NO]: sectionsBySkill.filter((section) => section.IsUseForTest === false).length,
  }

  // useEffect auto set FIRST section of sections is selected
  useEffect(() => {
    setSelectedSectionId(filterSection[0]?.SectionId)
  }, [selectedSkillId, sectionIsUseForTest])

  // Kỹ năng + section đang chọn — đồng bộ với mục lục
  const activeSkill = SKILL_BY_TYPE_ID[Number(selectedSkillId)] ?? TEST_SKILL_LISTENING;
  const activeSectionKey = useMemo(() => {
    const section = sectionsPath.find((item) => Number(item.SectionId) === Number(selectedSectionId));
    return section?.tempId ?? '';
  }, [sectionsPath, selectedSectionId]);

  // Click mục lục → đổi tab kỹ năng/bài rồi scroll tới section/câu
  const handleOutlineNavigate = (target) => {
    if (target?.skill) {
      setSelectedSkillId(SKILL_TO_TYPE_ID[target.skill] ?? 1);
    }
    if (target?.sectionTempId) {
      const section = sectionsPath.find((item) => String(item.tempId) === String(target.sectionTempId));
      if (section) {
        setSelectedSkillId(Number(section.TypeId));
        setSelectedSectionId(section.SectionId);
      }
    }
    scrollToQuestionBankItem(target, { delayMs: 300 });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', lg: 1520 }, mx: 'auto' }}>
      <MentorQuestionBankDetailHeader
        isCreateMode
        breadcrumbMode="coursePath"
        bankTitle={course.PathName}
        courseId={courseId}
        courseName={course.CourseName}
        coursePublished={Boolean(course.IsPublished)}
        totalQuestionCount={questionCount}
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
          pathId={pathId}
          statsForSkillNav={statsForSkillNav}
          selectedSkillId={selectedSkillId}
          setSelectedSkillId={setSelectedSkillId}
          sectionErrors={sectionErrors}
          sectionUseForTest={sectionUseForTest(statsForSkillNav, pathId)}
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
            sectionsPath={filterSection}
            setSectionsPath={setSectionsPath}
            sectionsBySkill={sectionsBySkill}
            filterSectionCounts={filterSectionCounts}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
            sectionIsUseForTest={sectionIsUseForTest}
            sectionUseForTest={sectionUseForTest(statsForSkillNav, pathId)}
            setSectionIsUseForTest={setSectionIsUseForTest}
            statsForSkillNav={statsForSkillNav}
            selectedSkillId={selectedSkillId}
          />

          <MentorQuestionBankOutlinePanel
            sections={sectionsPath}
            activeSkill={activeSkill}
            activeSectionId={activeSectionKey}
            sectionUseForTestFilter={sectionIsUseForTest}
            onNavigateToItem={handleOutlineNavigate}
            courseName={course.CourseName}
            courseCategory={courseCategory}
            chapterTitle={course.PathName}
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
