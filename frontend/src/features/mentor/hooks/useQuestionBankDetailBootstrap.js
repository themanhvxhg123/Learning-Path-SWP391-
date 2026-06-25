/**
 * Bootstrap trang Question Bank:
 * - Không có chapterId → danh sách Questions_Path
 * - Có chapterId → editor câu hỏi 1 chương
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  TEST_SKILL_LISTENING,
  buildQuestionSnapshotMap,
  collectPersistedQuestionIds,
  ensureQuestionBankSkillSections,
  getSectionsBySkill,
} from '@/features/mentor/utils/mentorTestContentUtils';
import {
  fetchBankPathList,
  fetchCourseContentOutlineForQB,
  fetchCourseForQB,
  fetchQuestionBankById,
  findQuestionBankByChapter,
} from '@/features/mentor/services/questionBankService';

function getFirstListeningSectionId(sections) {
  return (
    getSectionsBySkill(sections, TEST_SKILL_LISTENING)[0]?.tempId ??
    sections[0]?.tempId ??
    ''
  );
}

export default function useQuestionBankDetailBootstrap() {
  const navigate = useNavigate();
  const { questionBankId } = useParams();
  const [searchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId') ?? '';
  const isPathListMode = !chapterIdFromUrl;
  const requestIdRef = useRef(0);
  const questionSnapshotRef = useRef(new Map());

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bank, setBank] = useState(null);
  const [bankPaths, setBankPaths] = useState([]);
  const [course, setCourse] = useState(null);
  const [coursePaths, setCoursePaths] = useState([]);
  const [pathsLoading, setPathsLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});
  const [activeSkill, setActiveSkill] = useState(TEST_SKILL_LISTENING);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [persistedQuestionIds, setPersistedQuestionIds] = useState(() => new Set());

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setNotFound(false);
    setBank(null);
    setBankPaths([]);
    setSections([]);
    setCourse(null);
    setCoursePaths([]);

    try {
      if (isPathListMode) {
        const res = await fetchBankPathList(questionBankId);
        if (requestIdRef.current !== requestId) return;
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setBank(res.bank);
        setBankPaths(res.paths);

        const courseRes = await fetchCourseForQB(res.bank.courseId);
        if (requestIdRef.current === requestId && courseRes.ok) {
          setCourse(courseRes.course);
        }
        return;
      }

      const res = await fetchQuestionBankById(questionBankId, {
        chapterId: chapterIdFromUrl,
      });
      if (requestIdRef.current !== requestId) return;
      if (!res.ok || !res.bank) {
        setNotFound(true);
        return;
      }

      const loadedBank = res.bank;
      const loadedSections = ensureQuestionBankSkillSections(loadedBank.sections ?? []);

      setBank(loadedBank);
      setSections(loadedSections);
      setSectionErrors({});
      setActiveSkill(TEST_SKILL_LISTENING);
      setActiveSectionId(getFirstListeningSectionId(loadedSections));
      setPersistedQuestionIds(collectPersistedQuestionIds(loadedSections));
      questionSnapshotRef.current = buildQuestionSnapshotMap(loadedSections);

      setPathsLoading(true);
      const [courseRes, outlineRes] = await Promise.all([
        fetchCourseForQB(loadedBank.courseId),
        fetchCourseContentOutlineForQB(loadedBank.courseId),
      ]);
      if (requestIdRef.current !== requestId) return;
      if (courseRes.ok) setCourse(courseRes.course);
      if (outlineRes.ok) setCoursePaths(outlineRes.chapters ?? []);
    } catch {
      if (requestIdRef.current === requestId) setNotFound(true);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        setPathsLoading(false);
      }
    }
  }, [chapterIdFromUrl, isPathListMode, questionBankId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openPath = useCallback(
    (path) => {
      navigate(
        `/mentor/question-banks/${questionBankId}?courseId=${bank?.courseId}&chapterId=${path.PathId}`,
      );
    },
    [bank?.courseId, navigate, questionBankId],
  );

  const backToPathList = useCallback(() => {
    navigate(`/mentor/question-banks/${questionBankId}?courseId=${bank?.courseId ?? ''}`);
  }, [bank?.courseId, navigate, questionBankId]);

  const selectChapter = useCallback(
    async (nextChapterId) => {
      if (!bank?.courseId || String(nextChapterId) === String(bank.chapterId)) return;

      const bankRes = await findQuestionBankByChapter(bank.courseId, nextChapterId);
      if (bankRes.ok) {
        navigate(
          `/mentor/question-banks/${bankRes.bank.BankId ?? bankRes.bank.id}?courseId=${bank.courseId}&chapterId=${nextChapterId}`,
        );
        return;
      }

      navigate(
        `/mentor/question-banks/create?courseId=${bank.courseId}&chapterId=${nextChapterId}`,
      );
    },
    [bank, navigate],
  );

  return {
    questionBankId,
    isPathListMode,
    loading,
    notFound,
    bank,
    bankPaths,
    setBank,
    course,
    coursePaths,
    pathsLoading,
    sections,
    setSections,
    sectionErrors,
    setSectionErrors,
    activeSkill,
    setActiveSkill,
    activeSectionId,
    setActiveSectionId,
    persistedQuestionIds,
    setPersistedQuestionIds,
    questionSnapshotRef,
    workspaceKey: `${questionBankId}-${chapterIdFromUrl || 'paths'}`,
    reloadBank: loadData,
    openPath,
    backToPathList,
    selectChapter,
  };
}
