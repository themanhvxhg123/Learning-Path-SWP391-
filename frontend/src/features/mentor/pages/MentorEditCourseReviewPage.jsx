/**
 * =============================================================================
 * LUỒNG CHỈNH SỬA KHÓA HỌC (MENTOR) — BƯỚC 3: XEM LẠI & GỌI API
 * =============================================================================
 *
 * Route: /mentor/courses/:courseId/review
 *
 * Nguồn draft:
 *   • location.state.editDraft (từ trang edit info hoặc wizard content)
 *   • fallback sessionStorage: mentorCourseEditStorage.saveEditCourseDraft
 *
 * profileOnly (draft.meta.profileOnly === true):
 *   Chỉ PATCH thông tin cơ bản — không gọi updateCourseContent.
 *
 * Ngược lại:
 *   updateCourseBasicInfo + updateCourseContent(paths) — upload Cloudinary pending materials,
 *   diff với server, saveAllCoursePaths (REST từng path/node/material).
 *
 * Thành công → clearEditCourseDraft → navigate /mentor/courses/:courseId
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Breadcrumbs, CircularProgress, Divider, Link as MuiLink, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import { toast } from '@/shared/ui/Toast';
import MentorCourseInfoReview from '@/features/mentor/components/course/MentorCourseInfoReview';
import MentorCourseContentReview from '@/features/mentor/components/course/MentorCourseContentReview';
import MentorCourseCreateForm from '@/features/mentor/components/course/MentorCourseCreateForm';
import MentorCardSectionTitle from '@/features/mentor/components/course/MentorCardSectionTitle';
import { CARD_SECTION_TITLE_SX, CREATE_CARD_SX, MUTED, PAGE_DESCRIPTION_SX, PAGE_TITLE_SX, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  fetchCourseCategories,
  fetchCourseLevels,
  fetchMentorCourseDetail,
  updateCourseBasicInfo,
  updateCourseContent,
} from '@/features/mentor/services/mentorCourseService';
import { getUser } from '@/features/auth/utils/authUtils';
import {
  buildCreateCourseStep1Payload,
  MENTOR_COURSE_FORM_INITIAL,
  validateMentorCourseForm,
} from '@/features/mentor/utils/mentorCourseFormUtils';
import {
  clearEditCourseDraft,
  loadEditCourseDraft,
  saveEditCourseDraft,
} from '@/features/mentor/utils/mentorCourseEditStorage';
import { countCourseStudents } from '@/features/mentor/utils/mentorCourseUtils';

function draftCourseToForm(course) {
  return {
    CourseName: course.CourseName ?? '',
    Description: course.Description ?? '',
    CategoryId: course.CategoryId != null ? String(course.CategoryId) : '',
    LevelId: course.LevelId != null ? String(course.LevelId) : '',
    Thumbnail: course.Thumbnail ?? '',
    IsPublished: Boolean(course.IsPublished),
  };
}

export default function MentorEditCourseReviewPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [draft, setDraft] = useState(null);
  const [ready, setReady] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState('');
  const [levelLabel, setLevelLabel] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [levelOptions, setLevelOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [hasStudents, setHasStudents] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [form, setForm] = useState(MENTOR_COURSE_FORM_INITIAL);
  const [formErrors, setFormErrors] = useState({});
  const [updating, setUpdating] = useState(false);

  const validationOptions = useMemo(
    () => ({
      skipCategoryLevel: hasStudents,
      skipThumbnail: hasStudents,
    }),
    [hasStudents],
  );

  useEffect(() => {
    const stateDraft = location.state?.editDraft;
    if (stateDraft?.course) {
      setDraft(stateDraft);
      saveEditCourseDraft(courseId, stateDraft);
      setReady(true);
      return;
    }

    const saved = loadEditCourseDraft(courseId);
    if (!saved?.course) {
      toast.error('Không tìm thấy dữ liệu chỉnh sửa. Vui lòng thử lại.');
      navigate(`/mentor/courses/${courseId}`, { replace: true });
      return;
    }
    setDraft(saved);
    setReady(true);
  }, [courseId, location.state, navigate]);

  useEffect(() => {
    if (!draft?.course) return undefined;
    let cancelled = false;

    (async () => {
      const [categoryResult, levelResult, courseResult] = await Promise.all([
        fetchCourseCategories(),
        fetchCourseLevels(),
        fetchMentorCourseDetail(courseId),
      ]);
      if (cancelled) return;

      if (categoryResult.ok) setCategoryOptions(categoryResult.categories);
      if (levelResult.ok) setLevelOptions(levelResult.levels);

      if (courseResult.success) {
        setHasStudents(countCourseStudents(courseResult.course) > 0);
      }

      const category = (categoryResult.categories ?? []).find(
        (item) => String(item.value) === String(draft.course.CategoryId),
      );
      const level = (levelResult.levels ?? []).find(
        (item) => String(item.value) === String(draft.course.LevelId),
      );
      setCategoryLabel(category?.label ?? '');
      setLevelLabel(level?.label ?? '');
      setOptionsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [courseId, draft]);

  const syncFormFromDraft = useCallback(() => {
    if (draft?.course) {
      setForm(draftCourseToForm(draft.course));
      setFormErrors({});
    }
  }, [draft?.course]);

  useEffect(() => {
    syncFormFromDraft();
  }, [syncFormFromDraft]);

  const paths = useMemo(() => draft?.paths ?? [], [draft]);
  const profileOnly = Boolean(draft?.meta?.profileOnly);
  const courseForUpdate = draft?.course ?? null;

  const handleStartEditInfo = () => {
    syncFormFromDraft();
    setEditingInfo(true);
  };

  const handleCancelEditInfo = () => {
    syncFormFromDraft();
    setEditingInfo(false);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    if (hasStudents && (name === 'CategoryId' || name === 'LevelId' || name === 'Thumbnail')) {
      return;
    }
    setForm((prev) => ({ ...prev, [name]: name === 'IsPublished' ? Boolean(value) : value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleApplyInfoEdit = (event) => {
    event.preventDefault();

    const fieldErrors = validateMentorCourseForm(form, validationOptions);
    if (Object.keys(fieldErrors).length > 0) {
      setFormErrors(fieldErrors);
      return;
    }

    const instructorId = getUser()?.userId;
    if (!instructorId) {
      toast.error('Không xác định được mentor. Vui lòng đăng nhập lại.');
      return;
    }

    const payload = buildCreateCourseStep1Payload(form, instructorId);
    const nextCourse = {
      ...courseForUpdate,
      ...payload,
      CourseId: Number(courseId),
    };

    if (hasStudents) {
      nextCourse.CategoryId = courseForUpdate?.CategoryId ?? nextCourse.CategoryId;
      nextCourse.LevelId = courseForUpdate?.LevelId ?? nextCourse.LevelId;
      nextCourse.Thumbnail = courseForUpdate?.Thumbnail ?? nextCourse.Thumbnail;
    }

    const nextDraft = { ...draft, course: nextCourse };
    setDraft(nextDraft);
    saveEditCourseDraft(courseId, nextDraft);

    const category = categoryOptions.find(
      (item) => String(item.value) === String(nextCourse.CategoryId),
    );
    const level = levelOptions.find(
      (item) => String(item.value) === String(nextCourse.LevelId),
    );
    setCategoryLabel(category?.label ?? '');
    setLevelLabel(level?.label ?? '');
    setEditingInfo(false);
    toast.success('Đã cập nhật thông tin trên trang xem lại.');
  };

  /** PATCH basic info; nếu không profileOnly thì sync toàn bộ paths qua updateCourseContent. */
  const handleUpdate = async () => {
    if (!courseForUpdate) return;

    setUpdating(true);
    try {
      const basicResult = await updateCourseBasicInfo(courseId, courseForUpdate);

      if (!basicResult.ok) {
        toast.error(basicResult.message || 'Không thể cập nhật khóa học. Vui lòng thử lại.');
        return;
      }

      if (!profileOnly) {
        const contentResult = await updateCourseContent(courseId, paths);
        if (!contentResult.ok) {
          toast.error(contentResult.message || 'Không thể cập nhật khóa học. Vui lòng thử lại.');
          return;
        }
        clearEditCourseDraft(courseId);
      }

      const freshResult = await fetchMentorCourseDetail(courseId);
      if (!freshResult.success) {
        toast.warning('Đã cập nhật nhưng không thể tải lại dữ liệu mới.');
      }

      toast.success('Đã cập nhật khóa học thành công.');
      navigate(`/mentor/courses/${courseId}`, {
        replace: true,
        state: { refreshedAt: Date.now() },
      });
    } catch {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setUpdating(false);
    }
  };

  if (!ready || !draft) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={32} sx={{ color: PRIMARY }} />
      </Box>
    );
  }

  const infoEditFooter = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 1.25, pt: 0.5 }}>
      <AppButton
        variant="outlined"
        onClick={handleCancelEditInfo}
        sx={{ minWidth: 100, height: 44, borderRadius: '999px', fontWeight: 700 }}
      >
        Hủy
      </AppButton>
      <AppButton
        onClick={handleApplyInfoEdit}
        sx={{
          minWidth: 148,
          height: 44,
          borderRadius: '999px',
          fontWeight: 700,
          bgcolor: PRIMARY,
          '&:hover': { bgcolor: '#0E7490' },
        }}
      >
        Áp dụng thay đổi
      </AppButton>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 } }}
      >
        <MuiLink component={Link} to="/home" underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Trang chủ
        </MuiLink>
        <MuiLink component={Link} to="/mentor/courses" underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Khóa học của tôi
        </MuiLink>
        <MuiLink component={Link} to={`/mentor/courses/${courseId}`} underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Chi tiết khóa học
        </MuiLink>
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
          Xem lại thay đổi
        </Typography>
      </Breadcrumbs>

      <Typography component="h1" sx={{ ...PAGE_TITLE_SX, mb: 0.5 }}>
        Xem lại thay đổi
      </Typography>
      <Typography sx={{ ...PAGE_DESCRIPTION_SX, mb: 2.5 }}>
        {profileOnly
          ? 'Kiểm tra các thay đổi thông tin cơ bản trước khi cập nhật khóa học.'
          : 'Kiểm tra các thay đổi trước khi cập nhật khóa học.'}
      </Typography>

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
          {editingInfo ? (
            <Box sx={CREATE_CARD_SX}>
              <MentorCardSectionTitle title="Thông tin khóa học" sx={{ mb: 2 }} />
              <MentorCourseCreateForm
                form={form}
                errors={formErrors}
                onChange={handleFormChange}
                onSubmit={handleApplyInfoEdit}
                disabled={updating}
                categoryOptions={categoryOptions}
                levelOptions={levelOptions}
                optionsLoading={optionsLoading}
                lockCategoryAndLevel={hasStudents}
                lockThumbnail={hasStudents}
                footer={infoEditFooter}
              />
            </Box>
          ) : (
            <MentorCourseInfoReview
              course={courseForUpdate}
              categoryLabel={categoryLabel}
              levelLabel={levelLabel}
              onEditInfo={handleStartEditInfo}
            />
          )}
          {!profileOnly && (
            <MentorCourseContentReview paths={paths} courseId={courseId} />
          )}
        </Box>

        <Box
          sx={{
            bgcolor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: '0 1px 2px rgba(8,145,178,0.04)',
            p: { xs: 2.25, sm: 2.5 },
            position: { lg: 'sticky' },
            top: { lg: 24 },
          }}
        >
          <Typography sx={{ ...CARD_SECTION_TITLE_SX, mb: 0.5 }}>
            Xác nhận cập nhật
          </Typography>
          <Typography sx={{ fontSize: 13, color: MUTED, mb: 2, lineHeight: 1.55 }}>
            Các thay đổi sẽ được áp dụng ngay khi bạn nhấn cập nhật.
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <AppButton
            onClick={handleUpdate}
            loading={updating}
            disabled={editingInfo}
            endIcon={!updating ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : undefined}
            sx={{
              width: '100%',
              height: 44,
              borderRadius: '999px',
              fontWeight: 700,
              bgcolor: PRIMARY,
              '&:hover': { bgcolor: '#0E7490' },
            }}
          >
            Cập nhật khóa học
          </AppButton>
        </Box>
      </Box>
    </Box>
  );
}
