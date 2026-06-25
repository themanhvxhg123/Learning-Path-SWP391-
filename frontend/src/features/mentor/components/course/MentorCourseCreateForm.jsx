import { Box } from '@mui/material';
import MentorCourseBasicInfoForm from './MentorCourseBasicInfoForm';
import MentorCourseImageBox from './MentorCourseImageBox';
import { CREATE_CARD_SX } from './mentorCourseCreateStyles';

export default function MentorCourseCreateForm({
  form,
  errors = {},
  onChange,
  onSubmit,
  disabled = false,
  categoryOptions = [],
  levelOptions = [],
  optionsLoading = false,
  lockCategoryAndLevel = false,
  lockThumbnail = false,
  footer,
}) {
  return (
    <Box component="form" noValidate onSubmit={onSubmit}>
      <Box sx={{ ...CREATE_CARD_SX, mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 3.5fr) minmax(0, 6.5fr)' },
            gap: { xs: 2.5, md: 3 },
            alignItems: 'start',
          }}
        >
          <MentorCourseImageBox
            value={form.Thumbnail}
            error={errors.Thumbnail}
            onChange={onChange}
            disabled={disabled || lockThumbnail}
          />

          <MentorCourseBasicInfoForm
            form={form}
            errors={errors}
            onChange={onChange}
            disabled={disabled}
            categoryOptions={categoryOptions}
            levelOptions={levelOptions}
            optionsLoading={optionsLoading}
            lockCategoryAndLevel={lockCategoryAndLevel}
          />
        </Box>
      </Box>
      {/* Button (Hủy, Tiếp theo) */}
      {footer}
    </Box>
  );
}
