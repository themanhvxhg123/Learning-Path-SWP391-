/**
 * Bootstrap trang Create Question Bank — URL-driven, an toàn khi F5 / đổi chương.
 * Dữ liệu khóa học / chương giữ PascalCase như API database.
 * Draft chỉ ghi khi user bấm "Lưu nháp" (không auto-save).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';
import {
  TEST_SKILL_LISTENING,
  consolidateWritingSections,
  createQuestionBankSkillSections,
  getSectionsBySkill,
} from '@/features/mentor/utils/mentorTestContentUtils';
import {
  fetchCourseContentOutlineForQB,
  fetchCourseForQB,
  fetchPathQuestionBank,
} from '@/features/mentor/services/questionBankService';

const DRAFT_KEY_PREFIX = 'mentor_qb_create_draft';

function getDraftStorageKey(courseId, chapterId) {
  if (!courseId || !chapterId) return '';
  return `${DRAFT_KEY_PREFIX}_${courseId}_${chapterId}`;
}

function readDraftSections(courseId, chapterId) {
  const key = getDraftStorageKey(courseId, chapterId);
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildQuestionBankSectionsSnapshot(sections = []) {
  return JSON.stringify(consolidateWritingSections(sections));
}

export function writeQuestionBankCreateDraft(courseId, chapterId, sections) {
  const key = getDraftStorageKey(courseId, chapterId);
  if (!key) return false;
  try {
    sessionStorage.setItem(key, JSON.stringify(consolidateWritingSections(sections)));
    return true;
  } catch {
    toast.error('Không thể lưu bản nháp. Bộ nhớ trình duyệt có thể đã đầy.');
    return false;
  }
}

export function clearQuestionBankCreateDraft(courseId, chapterId) {
  const key = getDraftStorageKey(courseId, chapterId);
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Xóa mọi draft create QB (gọi khi logout). */
export function clearAllQuestionBankCreateDrafts() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(DRAFT_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
}

function buildInitialSections(courseId, chapterId) {
  const draft = readDraftSections(courseId, chapterId);
  if (draft?.length) return consolidateWritingSections(draft);
  return createQuestionBankSkillSections();
}

function getFirstListeningSectionId(sections) {
  return (
    getSectionsBySkill(sections, TEST_SKILL_LISTENING)[0]?.tempId ??
    sections[0]?.tempId ??
    ''
  );
}

function getChapterKey(courseId, chapterId) {
  if (!courseId || !chapterId) return '';
  return `${courseId}-${chapterId}`;
}

export default function useQuestionBankCreateBootstrap() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const courseId = searchParams.get('courseId') ?? '';
  const chapterId = searchParams.get('chapterId') ?? '';

  const resolvedChapterKeyRef = useRef('');
  const prevCourseIdRef = useRef('');

  const [course, setCourse] = useState(null);
  const [coursePaths, setCoursePaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState(() => createQuestionBankSkillSections());
  const [activeSkill, setActiveSkill] = useState(TEST_SKILL_LISTENING);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [sectionErrors, setSectionErrors] = useState({});
  const [editorReadyKey, setEditorReadyKey] = useState('');

  const applyChapterState = useCallback((targetCourseId, targetChapterId) => {
    const nextSections = buildInitialSections(targetCourseId, targetChapterId);
    setSections(nextSections);
    setSectionErrors({});
    setActiveSkill(TEST_SKILL_LISTENING);
    setActiveSectionId(getFirstListeningSectionId(nextSections));
    const chapterKey = getChapterKey(targetCourseId, targetChapterId);
    resolvedChapterKeyRef.current = chapterKey;
    setEditorReadyKey(chapterKey);
    return nextSections;
  }, []);

  const resetEmptyEditor = useCallback(() => {
    const emptySections = createQuestionBankSkillSections();
    setSections(emptySections);
    setSectionErrors({});
    setActiveSkill(TEST_SKILL_LISTENING);
    setActiveSectionId(getFirstListeningSectionId(emptySections));
    resolvedChapterKeyRef.current = '';
    setEditorReadyKey('');
    return emptySections;
  }, []);

  const activateChapter = useCallback(
    async (targetChapterId) => {
      if (!courseId || !targetChapterId) return null;

      const path = coursePaths.find(
        (item) => String(item.PathId) === String(targetChapterId),
      );
      if (!path) return null;

      const existing = await fetchPathQuestionBank(courseId, targetChapterId);
      if (existing.ok) {
        toast.info('Chương này đã có ngân hàng câu hỏi.');
        navigate(
          `/mentor/question-banks/${existing.bank.BankId ?? existing.bank.id}?courseId=${courseId}&chapterId=${targetChapterId}`,
        );
        return null;
      }

      return applyChapterState(courseId, targetChapterId);
    },
    [applyChapterState, courseId, coursePaths, navigate],
  );

  useEffect(() => {
    if (!courseId) {
      navigate('/mentor/question-banks', { replace: true });
      return;
    }

    let mounted = true;
    setLoading(true);

    Promise.all([fetchCourseForQB(courseId), fetchCourseContentOutlineForQB(courseId)])
      .then(([courseRes, outlineRes]) => {
        if (!mounted) return;

        if (!courseRes.ok) {
          toast.error('Không tìm thấy khóa học.');
          navigate('/mentor/question-banks', { replace: true });
          return;
        }

        setCourse(courseRes.course);
        setCoursePaths(outlineRes.ok ? outlineRes.chapters ?? [] : []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [courseId, navigate]);

  useEffect(() => {
    if (prevCourseIdRef.current && prevCourseIdRef.current !== courseId) {
      resetEmptyEditor();
    }
    prevCourseIdRef.current = courseId;
    resolvedChapterKeyRef.current = '';
  }, [courseId, resetEmptyEditor]);

  useEffect(() => {
    if (loading || !courseId || coursePaths.length === 0) return;

    if (!chapterId) {
      resolvedChapterKeyRef.current = '';
      resetEmptyEditor();
      return;
    }

    const chapterKey = getChapterKey(courseId, chapterId);
    if (resolvedChapterKeyRef.current === chapterKey) return;

    activateChapter(chapterId);
  }, [loading, courseId, chapterId, coursePaths, activateChapter, resetEmptyEditor]);

  const selectChapter = useCallback(
    async (nextChapterId) => {
      if (String(nextChapterId) === String(chapterId)) return false;

      const nextSections = await activateChapter(nextChapterId);
      if (!nextSections) return false;

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('courseId', courseId);
          next.set('chapterId', String(nextChapterId));
          return next;
        },
        { replace: true },
      );
      return true;
    },
    [activateChapter, chapterId, courseId, setSearchParams],
  );

  const selectedPath = coursePaths.find(
    (item) => String(item.PathId) === String(chapterId),
  );

  const workspaceKey = getChapterKey(courseId, chapterId) || `course-${courseId}-none`;

  return {
    courseId,
    chapterId,
    course,
    coursePaths,
    loading,
    workspaceKey,
    editorReadyKey,
    sections,
    setSections,
    sectionErrors,
    setSectionErrors,
    activeSkill,
    setActiveSkill,
    activeSectionId,
    setActiveSectionId,
    selectedPath,
    hasPaths: coursePaths.length > 0,
    canUseGenerator: Boolean(chapterId) && coursePaths.length > 0 && !loading,
    selectChapter,
  };
}
