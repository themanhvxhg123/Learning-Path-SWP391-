import { useEffect, useMemo, useState } from 'react';
import { Box, Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';
import AdminNewsForm from '@/features/admin/components/AdminNewsForm';
import AdminNewsCreateFooter from '@/features/admin/components/AdminNewsCreateFooter';
import AdminNewsCreateStepIndicator from '@/features/admin/components/AdminNewsCreateStepIndicator';
import { getUser } from '@/features/auth/utils/authUtils';
import {
  ADMIN_NEWS_FORM_INITIAL,
  hasAdminNewsFormErrors,
  validateAdminNewsFormStep1,
} from '@/features/admin/utils/adminNewsFormUtils';
import {
  clearAdminNewsCreateDraft,
  loadAdminNewsCreateDraft,
  saveAdminNewsStep1ToStorage,
} from '@/features/admin/utils/adminNewsCreateStorage';
import { buildAdminNewsCategoryFormOptions } from '@/features/admin/utils/adminNewsUtils';
import { CREATE_CARD_SX, MUTED, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';

function BreadcrumbLink({ to, children, onClick }) {
  return (
    <MuiLink
      component="button"
      type="button"
      underline="hover"
      onClick={() => onClick(to)}
      sx={{
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        font: 'inherit',
        p: 0,
        fontSize: 13,
        color: MUTED,
        fontWeight: 500,
      }}
    >
      {children}
    </MuiLink>
  );
}

function serializeStep1(form = {}) {
  return JSON.stringify({
    title: form.title ?? '',
    categoryId: form.categoryId ?? '',
    status: form.status ?? 'DRAFT',
    author: form.author ?? '',
    excerpt: form.excerpt ?? '',
    thumbnail: form.thumbnail ?? '',
  });
}

export default function AdminNewsCreatePage() {
  const navigate = useNavigate();
  const defaultAuthor = getUser()?.fullName ?? 'Admin';
  const [form, setForm] = useState({ ...ADMIN_NEWS_FORM_INITIAL, author: defaultAuthor });
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const categoryOptions = useMemo(() => buildAdminNewsCategoryFormOptions(), []);

  useEffect(() => {
    const draft = loadAdminNewsCreateDraft();
    if (draft?.step1) {
      const restored = {
        ...ADMIN_NEWS_FORM_INITIAL,
        ...draft.step1,
        author: draft.step1.author || defaultAuthor,
      };
      setForm(restored);
      setSavedSnapshot(serializeStep1(restored));
    }
  }, [defaultAuthor]);

  const handleNavigate = (path) => navigate(path);

  const handleCancel = () => {
    clearAdminNewsCreateDraft();
    navigate('/admin/news');
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      saveAdminNewsStep1ToStorage(form);
      setSavedSnapshot(serializeStep1(form));
      toast.success('Đã lưu nháp thông tin cơ bản.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleNext = () => {
    const validationErrors = validateAdminNewsFormStep1(form);
    if (hasAdminNewsFormErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    saveAdminNewsStep1ToStorage(form);
    setSavedSnapshot(serializeStep1(form));
    navigate('/admin/news/create/content');
    setSubmitting(false);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1080, mx: 'auto' }}>
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 } }}
      >
        <BreadcrumbLink to="/admin/news" onClick={handleNavigate}>
          Tin tức
        </BreadcrumbLink>
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
          Tạo tin
        </Typography>
      </Breadcrumbs>

      <AdminNewsCreateStepIndicator currentStep={1} />

      <Box sx={{ ...CREATE_CARD_SX, mb: 0 }}>
        <AdminNewsForm
          form={form}
          errors={errors}
          categoryOptions={categoryOptions}
          onChange={(nextForm) => {
            setForm(nextForm);
            setErrors({});
          }}
          disabled={submitting || savingDraft}
        />

        <AdminNewsCreateFooter
          onCancel={handleCancel}
          onSaveDraft={handleSaveDraft}
          onPrimary={handleNext}
          savingDraft={savingDraft}
          submitting={submitting}
          primaryLabel="Tiếp theo"
          primaryEndIcon={<ArrowForwardRoundedIcon />}
        />
      </Box>
    </Box>
  );
}
