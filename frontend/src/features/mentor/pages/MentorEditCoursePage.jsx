import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Link as MuiLink,
  Typography,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import { toast } from '@/shared/ui/Toast';
import MentorCourseCreateForm from '@/features/mentor/components/course/MentorCourseCreateForm';
import { MUTED, PAGE_DESCRIPTION_SX, PAGE_TITLE_SX, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  fetchCourseCategories,
  fetchCourseLevels,
  fetchMentorCourseDetail,
} from '@/features/mentor/services/mentorCourseService';
import { getUser } from '@/features/auth/utils/authUtils';
import {
  buildCreateCourseStep1Payload,
  MENTOR_COURSE_FORM_INITIAL,
  validateMentorCourseForm,
} from '@/features/mentor/utils/mentorCourseFormUtils';
import {
  courseDetailToEditCourse,
  courseDetailToEditForm,
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

export default function MentorEditCoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const instructorId = getUser()?.userId ?? null;

  const [form, setForm] = useState(MENTOR_COURSE_FORM_INITIAL);
  const [formErrors, setFormErrors] = useState({});
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [levelOptions, setLevelOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [coursePascal, setCoursePascal] = useState(null);
  const [studentCount, setStudentCount] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const hasStudents = studentCount > 0;

  const validationOptions = useMemo(
    () => ({
      skipCategoryLevel: hasStudents,
      skipThumbnail: hasStudents,
    }),
    [hasStudents],
  );

  useEffect(() => {
    let cancelled = false;
    const stateDraft = location.state?.editDraft;

    (async () => {
      const [categoryResult, levelResult, courseResult] = await Promise.all([
        fetchCourseCategories(),
        fetchCourseLevels(),
        fetchMentorCourseDetail(courseId),
      ]);

      if (cancelled) return;

      if (!courseResult.success) {
        toast.error('Không thể tải thông tin khóa học.');
        navigate(`/mentor/courses/${courseId}`, { replace: true });
        return;
      }

      const course = courseResult.course;
      const baseCourse = courseDetailToEditCourse(course);
      setCoursePascal(baseCourse);
      setStudentCount(countCourseStudents(course));

      if (stateDraft?.course && stateDraft.meta?.profileOnly) {
        setForm(draftCourseToForm(stateDraft.course));
      } else {
        setForm(courseDetailToEditForm(course));
      }

      if (categoryResult.ok) setCategoryOptions(categoryResult.categories);
      else toast.error(categoryResult.message || 'Không thể tải danh mục.');
      if (levelResult.ok) setLevelOptions(levelResult.levels);
      else toast.error(levelResult.message || 'Không thể tải trình độ.');

      setOptionsLoading(false);
      setPageLoading(false);
    })();

    return () => { cancelled = true; };
  }, [courseId, location.state, navigate]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    if (hasStudents && (name === 'CategoryId' || name === 'LevelId' || name === 'Thumbnail')) {
      return;
    }
    setForm((prev) => ({ ...prev, [name]: name === 'IsPublished' ? Boolean(value) : value }));
    if (formErrors[name]) {
      setFormErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const fieldErrors = validateMentorCourseForm(form, validationOptions);
    if (Object.keys(fieldErrors).length > 0) {
      setFormErrors(fieldErrors);
      return;
    }

    if (!instructorId) {
      toast.error('Không xác định được mentor. Vui lòng đăng nhập lại.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildCreateCourseStep1Payload(form, instructorId);
      const nextCourse = {
        ...coursePascal,
        ...payload,
        CourseId: Number(courseId),
      };

      if (hasStudents) {
        nextCourse.CategoryId = coursePascal?.CategoryId ?? nextCourse.CategoryId;
        nextCourse.LevelId = coursePascal?.LevelId ?? nextCourse.LevelId;
        nextCourse.Thumbnail = coursePascal?.Thumbnail ?? nextCourse.Thumbnail;
      }

      navigate(`/mentor/courses/${courseId}/review`, {
        state: {
          editDraft: {
            course: nextCourse,
            meta: { profileOnly: true },
          },
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={32} sx={{ color: PRIMARY }} />
      </Box>
    );
  }

  const footer = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 1.25, pt: 0.5 }}>
      <AppButton
        variant="outlined"
        onClick={() => navigate(`/mentor/courses/${courseId}`)}
        disabled={submitting}
        sx={{ minWidth: 100, height: 44, borderRadius: '999px', fontWeight: 700 }}
      >
        Hủy
      </AppButton>
      <AppButton
        onClick={handleSave}
        loading={submitting}
        endIcon={!submitting ? <SaveRoundedIcon /> : undefined}
        sx={{
          minWidth: 148, height: 44, borderRadius: '999px', fontWeight: 700,
          bgcolor: PRIMARY, '&:hover': { bgcolor: '#0E7490' },
        }}
      >
        Lưu thay đổi
      </AppButton>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      <Breadcrumbs separator="/" sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 } }}>
        <MuiLink component={Link} to="/home" underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Trang chủ
        </MuiLink>
        <MuiLink component={Link} to="/mentor/courses" underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Khóa học của tôi
        </MuiLink>
        <MuiLink component={Link} to={`/mentor/courses/${courseId}`} underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Chi tiết khóa học
        </MuiLink>
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>Chỉnh sửa thông tin</Typography>
      </Breadcrumbs>

      <Typography component="h1" sx={{ ...PAGE_TITLE_SX, mb: 0.5, maxWidth: 720 }}>
        Chỉnh sửa thông tin khóa học
      </Typography>
      <Typography sx={{ ...PAGE_DESCRIPTION_SX, mb: 2.5 }}>
        Cập nhật tên, mô tả và thông tin cơ bản của khóa học. Để chỉnh sửa nội dung bài học, hãy vào mục nội dung khóa học.
      </Typography>

      <Box sx={{ maxWidth: 1080 }}>
        <MentorCourseCreateForm
          form={form}
          errors={formErrors}
          onChange={handleFormChange}
          onSubmit={handleSave}
          disabled={submitting}
          categoryOptions={categoryOptions}
          levelOptions={levelOptions}
          optionsLoading={optionsLoading}
          lockCategoryAndLevel={hasStudents}
          lockThumbnail={hasStudents}
          footer={footer}
        />
      </Box>
    </Box>
  );
}
