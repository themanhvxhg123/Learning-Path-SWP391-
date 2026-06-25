import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';
import AdminNewsCreateFooter from '@/features/admin/components/AdminNewsCreateFooter';
import AdminNewsCreateStepIndicator from '@/features/admin/components/AdminNewsCreateStepIndicator';
import AdminNewsCreateSummary from '@/features/admin/components/AdminNewsCreateSummary';
import AdminNewsDraftSaveStatus from '@/features/admin/components/AdminNewsDraftSaveStatus';
import MentorTextMaterialEditor from '@/features/mentor/components/course/MentorTextMaterialEditor';
import { createNewsArticle } from '@/features/admin/services/adminNewsService';
import {
  ADMIN_NEWS_CONTENT_MATERIAL_TEMP_ID,
  createAdminNewsContentMaterial,
  hasAdminNewsFormErrors,
  validateAdminNewsContent,
} from '@/features/admin/utils/adminNewsFormUtils';
import {
  clearAdminNewsCreateDraft,
  loadAdminNewsCreateDraft,
  saveAdminNewsContentToStorage,
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

export default function AdminNewsCreateContentPage() {
  const navigate = useNavigate();
  const [step1, setStep1] = useState(null);
  const [material, setMaterial] = useState(() => createAdminNewsContentMaterial());
  const [savedContent, setSavedContent] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [ready, setReady] = useState(false);

  const categoryOptions = useMemo(() => buildAdminNewsCategoryFormOptions(), []);

  const categoryLabel = useMemo(
    () => categoryOptions.find((item) => String(item.value) === String(step1?.categoryId))?.label ?? '',
    [categoryOptions, step1?.categoryId],
  );

  const isContentSaved = (material.Content ?? '') === savedContent;

  useEffect(() => {
    const draft = loadAdminNewsCreateDraft();
    if (!draft?.step1?.title?.trim()) {
      navigate('/admin/news/create', { replace: true });
      return;
    }

    const content = draft.content ?? '';
    setStep1(draft.step1);
    setMaterial(createAdminNewsContentMaterial(content));
    setSavedContent(content);
    setReady(true);
  }, [navigate]);

  const handleMaterialChange = useCallback((tempId, patch) => {
    if (tempId !== ADMIN_NEWS_CONTENT_MATERIAL_TEMP_ID) return;

    setMaterial((prev) => ({ ...prev, ...patch }));

    if (patch.Content !== undefined) {
      setErrors((prev) => {
        if (!prev.Content) return prev;
        const next = { ...prev };
        delete next.Content;
        return next;
      });
    }
  }, []);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      saveAdminNewsContentToStorage(material.Content ?? '');
      setSavedContent(material.Content ?? '');
      toast.success('Đã lưu nháp nội dung.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleBack = () => {
    saveAdminNewsContentToStorage(material.Content ?? '');
    setSavedContent(material.Content ?? '');
    navigate('/admin/news/create');
  };

  const handleSubmit = async () => {
    const validationErrors = validateAdminNewsContent(material.Content);
    if (hasAdminNewsFormErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createNewsArticle({
        title: step1.title.trim(),
        categoryId: step1.categoryId,
        status: step1.status,
        author: step1.author.trim(),
        excerpt: step1.excerpt.trim(),
        thumbnail: step1.thumbnail.trim(),
        content: material.Content,
      });

      if (!res.ok) {
        toast.error(res.message ?? 'Không thể tạo tin tức');
        return;
      }

      clearAdminNewsCreateDraft();
      toast.success('Đã tạo tin tức mới');
      navigate('/admin/news');
    } catch {
      toast.error('Không thể tạo tin tức');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <Box sx={{ width: '100%', maxWidth: 1080, mx: 'auto' }}>
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 } }}
      >
        <BreadcrumbLink to="/admin/news" onClick={() => navigate('/admin/news')}>
          Tin tức
        </BreadcrumbLink>
        <BreadcrumbLink to="/admin/news/create" onClick={handleBack}>
          Tạo tin
        </BreadcrumbLink>
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
          Xây nội dung
        </Typography>
      </Breadcrumbs>

      <AdminNewsCreateStepIndicator currentStep={2} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(260px, 3fr)' },
          gap: { xs: 2, lg: 2.5 },
          alignItems: 'start',
        }}
      >
        <Box sx={CREATE_CARD_SX}>
          <MentorTextMaterialEditor
            material={material}
            errors={errors}
            onChange={handleMaterialChange}
            disabled={submitting || savingDraft}
          />

          <AdminNewsDraftSaveStatus saved={isContentSaved} />
        </Box>

        <AdminNewsCreateSummary
          step1={step1}
          categoryLabel={categoryLabel}
          footer={
            <AdminNewsCreateFooter
              layout="sidebar"
              cancelLabel="Quay lại"
              onCancel={handleBack}
              onSaveDraft={handleSaveDraft}
              onPrimary={handleSubmit}
              savingDraft={savingDraft}
              submitting={submitting}
              primaryLabel="Tạo tin"
            />
          }
        />
      </Box>
    </Box>
  );
}
