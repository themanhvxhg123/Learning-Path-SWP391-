import { Box, Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MentorCourseCreateStepIndicator from './MentorCourseCreateStepIndicator';
import { MUTED, PAGE_DESCRIPTION_SX, PAGE_TITLE_SX, TEXT } from './mentorCourseCreateStyles';

function BreadcrumbLink({ to, children, sx }) {
  const navigate = useNavigate();

  return (
    <MuiLink
      component="button"
      type="button"
      underline="hover"
      onClick={() => navigate(to)}
      sx={{
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        font: 'inherit',
        p: 0,
        ...sx,
      }}
    >
      {children}
    </MuiLink>
  );
}

export default function MentorCourseReviewHeader() {
  return (
    <>
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 } }}
      >
        <BreadcrumbLink to="/home" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Trang chủ
        </BreadcrumbLink>
        <BreadcrumbLink to="/mentor/courses" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          Khóa học của tôi
        </BreadcrumbLink>
        <BreadcrumbLink
          to="/mentor/courses/create"
          sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
        >
          Tạo khóa học
        </BreadcrumbLink>
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
          Xem lại & tạo
        </Typography>
      </Breadcrumbs>

      <Typography component="h1" sx={{ ...PAGE_TITLE_SX, mb: 0.75 }}>
        Xem lại & tạo khóa học
      </Typography>
      <Typography sx={{ ...PAGE_DESCRIPTION_SX, mb: 1.75 }}>
        Bước 3: Kiểm tra thông tin khóa học trước khi tạo (lưu dưới dạng bản nháp).
      </Typography>

      <MentorCourseCreateStepIndicator currentStep={3} />
    </>
  );
}
