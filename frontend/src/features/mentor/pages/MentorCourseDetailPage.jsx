/**
 * MentorCourseDetailPage  ─  Trang chi tiết + quản lý một khóa học của Mentor
 *
 * Props: không có (page component, route: /mentor/courses/:courseId)
 *
 * URL params:
 *   courseId : string  — ID khóa học, từ useParams()
 *
 * URL search params:
 *   tab : "course" | "content" | "students" | "comments"
 *
 * ── Fetch data ───────────────────────────────────────────────────────────
 *   useEffect: gọi fetchMentorCourseDetail(courseId) khi mount
 *
 *   GET /api/mentor/courses/:courseId
 *   Header: x-user-id: "<mentorId>"
 *
 *   Response JSON:
 *   {
 *     success: true,
 *     course: {
 *       courseId, courseName, description, category, level,
 *       thumbnail, isPublished, isFree, createdAt, updatedAt,
 *       studentCount, rating,
 *       paths: [ ...chương → bài → học liệu... ]
 *     }
 *   }
 *
 * ── API call (publish/unpublish) ─────────────────────────────────────────
 *   PATCH /api/mentor/courses/:courseId/publish  (qua updateCoursePublishStatus)
 *
 *   Request JSON:  { isPublished: boolean }
 *   Response JSON: { success: true, course: { courseId, isPublished, ... } }
 *
 *   Hiển thị ConfirmDialog trước khi gọi API.
 *   Sau khi thành công → toast thông báo + cập nhật state cục bộ.
 */
import { useCallback, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import EmptyState from '@/shared/ui/EmptyState';
import Loading from '@/shared/ui/Loading';
import { toast } from '@/shared/ui/Toast';
import MentorCourseDetailHeader from '@/features/mentor/components/course/MentorCourseDetailHeader';
import MentorCourseOverviewTab from '@/features/mentor/components/course/MentorCourseOverviewTab';
import MentorCourseContentTab from '@/features/mentor/components/course/MentorCourseContentTab';
import MentorCourseStudentsTab from '@/features/mentor/components/course/MentorCourseStudentsTab';
import MentorCourseCommentsTab from '@/features/mentor/components/course/MentorCourseCommentsTab';
import {
  fetchMentorCourseDetail,
  updateCoursePublishStatus,
} from '@/features/mentor/services/mentorCourseService';
import {
  MENTOR_COURSE_DETAIL_TABS,
  parseMentorCourseDetailTab,
} from '@/features/mentor/utils/mentorCourseDetailUtils';

export default function MentorCourseDetailPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishDialog, setPublishDialog] = useState(null);

  const activeTab = parseMentorCourseDetailTab(searchParams);

  const loadCourse = useCallback(async () => {
    setLoading(true);
    setError(null);

    //Course's detail
    const result = await fetchMentorCourseDetail(courseId);
    // Fetch data api return a array with 1 element is course => get first element to execute continue
    if (!result.success || !result.course) {
      setCourse(null);
      setError(result.message ?? 'Không tìm thấy khóa học.');
    } else {
      setCourse(result.course);
    }

    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse, publishing, location.state?.refreshedAt]);

  const handleTabChange = (tab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  const renderActiveTabPanel = () => {
    switch (activeTab) {
      // ------Course-------
      case MENTOR_COURSE_DETAIL_TABS.COURSE:
        return <MentorCourseOverviewTab course={course} />;
      // ---------Content-----------
      case MENTOR_COURSE_DETAIL_TABS.CONTENT:
        return <MentorCourseContentTab course={course} />;
      // ---------Students-----------
      case MENTOR_COURSE_DETAIL_TABS.STUDENTS:
        return <MentorCourseStudentsTab courseId={course.CourseId} />;
      case MENTOR_COURSE_DETAIL_TABS.COMMENTS:
        return <MentorCourseCommentsTab courseId={course.CourseId} />;
      default:
        return <MentorCourseOverviewTab course={course} />;
    }
  };

  const handlePublishToggle = () => {
    if (!course || publishing) return;
    setPublishDialog(course.IsPublished === true ? 'unpublish' : 'publish');
  };

  const handleClosePublishDialog = () => {
    if (publishing) return;
    setPublishDialog(null);
  };

  const handleConfirmPublishToggle = async () => {
    if (!course || !publishDialog || publishing) return;

    const nextPublished = publishDialog === 'publish';
    setPublishing(true);

    // TODO: wire real API — updateCoursePublishStatus(courseId, isPublished)
    const result = await updateCoursePublishStatus(course.CourseId, nextPublished);
    if (result.ok && result.courseIdUpdate) {
      // setCourse(result.course);
      setPublishing(true);
      toast.success(
        nextPublished ? 'Đã xuất bản khóa học.' : 'Đã hủy xuất bản khóa học.',
      );
      setPublishDialog(null);
    } else {
      toast.error(result.message ?? 'Không thể cập nhật trạng thái khóa học.');
    }

    setPublishing(false);
  };

  const publishDialogConfig =
    publishDialog === 'unpublish'
      ? {
        title: 'Hủy xuất bản khóa học?',
        message:
          'Học viên đã đăng ký vẫn được giữ dữ liệu học tập, nhưng khóa học sẽ chuyển về trạng thái bản nháp/không công khai.',
        confirmLabel: 'Hủy xuất bản',
        destructive: true,
      }
      : publishDialog === 'publish'
        ? {
          title: 'Xuất bản khóa học?',
          message:
            'Khóa học sẽ hiển thị công khai và học viên mới có thể đăng ký. Bạn có thể hủy xuất bản bất cứ lúc nào.',
          confirmLabel: 'Xuất bản',
          destructive: false,
        }
        : null;

  if (loading) {
    return (
      <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
        <Loading message="Đang tải khóa học..." />
      </Box>
    );
  }

  if (error || !course) {
    return (
      <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
        <EmptyState
          variant="error"
          title="Không tìm thấy khóa học"
          description={error ?? 'Khóa học không tồn tại hoặc bạn không có quyền truy cập.'}
          actionLabel="Quay lại danh sách"
          onAction={() => navigate('/mentor/courses')}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      {/* Detail's header */}
      <MentorCourseDetailHeader
        course={course}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onPublishToggle={handlePublishToggle}
        publishing={publishing}
      />

      {/* 
      --------------------ACTIVE Tab Panel (Khóa học, nội dung, học viên)------------------------
       */}
      <Box key={activeTab}>{renderActiveTabPanel()}</Box>

      {/* --------------Dialog------------------------ */}
      <ConfirmDialog
        open={Boolean(publishDialogConfig)}
        onClose={handleClosePublishDialog}
        onConfirm={handleConfirmPublishToggle}
        title={publishDialogConfig?.title}
        message={publishDialogConfig?.message}
        confirmLabel={publishDialogConfig?.confirmLabel}
        cancelLabel="Hủy"
        destructive={publishDialogConfig?.destructive}
        loading={publishing}
      />
    </Box>
  );
}
