import { Box, InputBase, Typography } from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { FormFieldSelect, FormFieldText } from '@/features/admin/components/AdminAccountFormFields';
import MentorCourseImageBox from '@/features/mentor/components/course/MentorCourseImageBox';
import { ADMIN_NEWS_FORM_STATUS_OPTIONS } from '@/features/admin/data/adminNewsMock';
import { ADMIN_NEWS_STATUS_CHIP_SX } from '@/features/admin/utils/adminNewsUtils';
import { contentInputSx } from '@/features/mentor/components/course/mentorCourseContentStyles';
import { MUTED, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';

function FormFieldTextarea({
  label,
  value,
  onChange,
  error = '',
  placeholder = '',
  optional = false,
  rows = 4,
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: MUTED, mb: 0.5, lineHeight: 1.35 }}>
        {label}
        {optional ? (
          <Box
            component="span"
            sx={{ fontSize: 10.5, fontWeight: 500, color: '#94A3B8', ml: 0.5 }}
          >
            (tùy chọn)
          </Box>
        ) : null}
      </Typography>
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        multiline
        minRows={rows}
        fullWidth
        sx={{
          ...contentInputSx(Boolean(error)),
          fontSize: 14,
          fontWeight: 500,
          color: TEXT,
          px: 1.25,
          py: 1,
          alignItems: 'flex-start',
        }}
      />
      {error ? (
        <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.5 }}>{error}</Typography>
      ) : null}
    </Box>
  );
}

export default function AdminNewsForm({
  form,
  errors = {},
  categoryOptions = [],
  onChange,
  disabled = false,
}) {
  const updateField = (field, value) => onChange?.({ ...form, [field]: value });

  return (
    <Box
      component="form"
      onSubmit={(event) => event.preventDefault()}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 3.5fr) minmax(0, 6.5fr)' },
          gap: { xs: 2.5, md: 3 },
          alignItems: 'start',
        }}
      >
        <MentorCourseImageBox
          value={form.thumbnail}
          error={errors.thumbnail}
          title="Ảnh thumbnail"
          disabled={disabled}
          onChange={(event) => updateField('thumbnail', event.target.value)}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormFieldText
            label="Tiêu đề"
            value={form.title}
            onChange={(value) => updateField('title', value)}
            error={errors.title}
            placeholder="Nhập tiêu đề tin tức"
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <FormFieldSelect
              label="Danh mục"
              icon={CategoryOutlinedIcon}
              iconColor="#0891B2"
              value={form.categoryId}
              options={categoryOptions}
              onChange={(value) => updateField('categoryId', value)}
              error={errors.categoryId}
            />

            <FormFieldSelect
              label="Trạng thái"
              icon={FactCheckOutlinedIcon}
              iconColor="#047857"
              value={form.status}
              options={ADMIN_NEWS_FORM_STATUS_OPTIONS}
              colorMap={ADMIN_NEWS_STATUS_CHIP_SX}
              onChange={(value) => updateField('status', value)}
              error={errors.status}
            />
          </Box>

          <FormFieldText
            label="Tác giả"
            value={form.author}
            onChange={(value) => updateField('author', value)}
            error={errors.author}
            placeholder="Tên người đăng"
          />

          <FormFieldTextarea
            label="Mô tả ngắn"
            value={form.excerpt}
            onChange={(value) => updateField('excerpt', value)}
            error={errors.excerpt}
            placeholder="Tóm tắt nội dung hiển thị trên danh sách"
            optional
            rows={3}
          />
        </Box>
      </Box>
    </Box>
  );
}
