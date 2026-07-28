import { useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';
import MentorCourseReviewHeader from '@/features/mentor/components/course/MentorCourseReviewHeader';
import MentorCourseInfoReview from '@/features/mentor/components/course/MentorCourseInfoReview';
import MentorCourseContentReview from '@/features/mentor/components/course/MentorCourseContentReview';
import MentorCourseReviewActions from '@/features/mentor/components/course/MentorCourseReviewActions';
import MentorCourseReviewStatusPanel from '@/features/mentor/components/course/MentorCourseReviewStatusPanel';
import MentorCourseCreateSuccessDialog from '@/features/mentor/components/course/MentorCourseCreateSuccessDialog';
import {
  createCourseWithContent,
  fetchCourseCategories,
  fetchCourseLevels,
} from '@/features/mentor/services/mentorCourseService';
import {
  clearCreateCourseDraft,
  loadCreateCourseDraft,
  saveCreateCourseDraft,
} from '@/features/mentor/utils/mentorCourseCreateStorage';
import {
  buildCreateCoursePayload,
  buildReviewChecklist,
  getReviewOverviewStats,
  validateCourseDraft,
} from '@/features/mentor/utils/mentorCourseReviewUtils';

export default function MentorCreateCourseReviewPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [ready, setReady] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState('');
  const [levelLabel, setLevelLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [successCourseId, setSuccessCourseId] = useState(null);

  useEffect(() => {
    const saved = loadCreateCourseDraft();
    if (!saved?.course) {
      toast.error('Vui lòng hoàn thành thông tin cơ bản trước.');
      navigate('/mentor/courses/create', { replace: true });
      return;
    }

    setDraft(saved);
    setReady(true);
  }, [navigate]);

  useEffect(() => {
    if (!draft?.course) return undefined;

    let cancelled = false;

    (async () => {
      const [categoryResult, levelResult] = await Promise.all([
        fetchCourseCategories(),
        fetchCourseLevels(),
      ]);

      if (cancelled) return;

      const category = (categoryResult.categories ?? []).find(
        (item) => String(item.value) === String(draft.course.CategoryId),
      );
      const level = (levelResult.levels ?? []).find(
        (item) => String(item.value) === String(draft.course.LevelId),
      );

      setCategoryLabel(category?.label ?? '');
      setLevelLabel(level?.label ?? '');
    })();

    return () => {
      cancelled = true;
    };
  }, [draft]);

  const validation = useMemo(
    () => (draft ? validateCourseDraft(draft) : { isValid: false, errors: [], warnings: [] }),
    [draft],
  );

  const checklist = useMemo(
    () => (draft ? buildReviewChecklist(draft, validation) : []),
    [draft, validation],
  );

  const overview = useMemo(
    () => getReviewOverviewStats(draft?.paths ?? []),
    [draft],
  );

  const persistDraft = async () => {
    const payload = buildCreateCoursePayload(draft, false);
    const nextDraft = {
      ...draft,
      course: payload.course,
    };

    saveCreateCourseDraft(nextDraft);

    const result = await createCourseWithContent(payload.course, draft.paths ?? []);

    if (!result.success || result.courseId == null) {
      throw new Error(result.message ?? 'Không thể lưu khóa học.');
    }

    clearCreateCourseDraft();
    return { courseId: result.courseId };
  };

  const handleCreateCourse = async () => {
    setCreating(true);
    try {
      const { courseId } = await persistDraft();
      setSuccessCourseId(courseId);
    } catch {
      toast.error('Không thể tạo khóa học. Vui lòng thử lại.');
    } finally {
      setCreating(false);
    }
  };

  const handleManageContent = () => {
    if (successCourseId == null) return;
    navigate(`/mentor/courses/${successCourseId}`);
    setSuccessCourseId(null);
  };

  const handleCreateQuestionBank = () => {
    if (successCourseId == null) return;
    navigate(`/mentor/question-banks/${successCourseId}`);
    setSuccessCourseId(null);
  };

  const handleBackToCourseList = () => {
    navigate('/mentor/courses');
    setSuccessCourseId(null);
  };

  if (!ready || !draft) return null;

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      <MentorCourseReviewHeader />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(280px, 3fr)' },
          gap: { xs: 2, lg: 2.5 },
          alignItems: 'start',
          mt: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <MentorCourseInfoReview
            course={draft.course}
            categoryLabel={categoryLabel}
            levelLabel={levelLabel}
          />
          <MentorCourseContentReview paths={draft.paths ?? []} />
        </Box>

        <MentorCourseReviewStatusPanel
          checklist={checklist}
          validation={validation}
          overview={overview}
          onCreate={handleCreateCourse}
          creating={creating}
        />
      </Box>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, mt: 2.5 }}>
        <MentorCourseReviewActions onCreate={handleCreateCourse} creating={creating} />
      </Box>

      <MentorCourseCreateSuccessDialog
        open={successCourseId != null}
        courseId={successCourseId}
        isPublished={false}
        onManageContent={handleManageContent}
        onCreateQuestionBank={handleCreateQuestionBank}
        onBackToList={handleBackToCourseList}
      />
    </Box>
  );
}
