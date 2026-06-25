import { Box, Typography, Button } from '@mui/material';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import { useNavigate } from 'react-router-dom';
import EmptyState from '@/shared/ui/EmptyState';
import MentorCourseContentOutline from './MentorCourseContentOutline';
import MentorCardSectionTitle from './MentorCardSectionTitle';
import {
  CARD_SECTION_META_SX,
  CREATE_CARD_SX,
  MUTED,
  PRIMARY,
} from './mentorCourseCreateStyles';
import { countMaterialsInPath, getCoursePaths } from '../../utils/mentorCourseContentUtils';

export default function MentorCourseContentTab({ course }) {
  const navigate = useNavigate();

  const paths = getCoursePaths(course);
  const courseId = course.CourseId;
  const editPath = `/mentor/courses/${courseId}/edit`;

  const materialCount = paths.reduce((sum, path) => {
    return sum + countMaterialsInPath(path);
  }, 0);

  return (
    <Box sx={CREATE_CARD_SX}>
      <Box sx={{ mb: paths.length > 0 ? 2 : 0 }}>
        <MentorCardSectionTitle
          title="Nội dung khóa học"
          mb={0.35}
          action={
            <Button
              variant="contained"
              sx={{
                bgcolor: PRIMARY,
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                textTransform: 'none',
                borderRadius: '10px',
                px: 2,
                py: 0.75,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#0E7490',
                  boxShadow: 'none',
                },
              }}
              onClick={() => navigate(`/mentor/courses/${courseId}/content/edit`)}
            >
              Xây nội dung
            </Button>
          }
        />

        <Typography sx={CARD_SECTION_META_SX}>
          {paths.length} chương · {course.TotalLessons ?? 0} bài học ·{' '}
          {materialCount ?? 0} học liệu
        </Typography>
      </Box>

      {paths.length === 0 ? (
        <EmptyState
          embedded
          icon={AutoStoriesOutlinedIcon}
          title="Khóa học chưa có nội dung"
          description="Thêm chương, bài học và học liệu để hoàn thiện khóa học."
          actionLabel="Xây nội dung"
          onAction={() => navigate(`/mentor/courses/${courseId}/content/edit`)}
        />
      ) : (
        <MentorCourseContentOutline paths={paths} />
      )}
    </Box>
  );
}