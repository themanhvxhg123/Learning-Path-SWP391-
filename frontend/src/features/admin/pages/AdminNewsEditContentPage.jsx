import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';
import Loading from '@/shared/ui/Loading';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import AdminNewsCreateFooter from '@/features/admin/components/AdminNewsCreateFooter';
import AdminNewsCreateSummary from '@/features/admin/components/AdminNewsCreateSummary';
import MentorTextMaterialEditor from '@/features/mentor/components/course/MentorTextMaterialEditor';
import { updateNewsArticleContent } from '@/features/admin/services/adminNewsService';
import {
  ADMIN_NEWS_CONTENT_MATERIAL_TEMP_ID,
  createAdminNewsContentMaterial,
  hasAdminNewsFormErrors,
  validateAdminNewsContent,
} from '@/features/admin/utils/adminNewsFormUtils';
import {
  clearAdminNewsEditDraft,
  isAdminNewsEditDraftForArticle,
  loadAdminNewsEditDraft,
  saveAdminNewsEditContentToStorage,
  saveAdminNewsEditDraft,
} from '@/features/admin/utils/adminNewsEditStorage';
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

export default function AdminNewsEditContentPage() {
  const navigate = useNavigate();
  const { newsId } = useParams();
  const [step1, setStep1] = useState(null);
  const [material, setMaterial] = useState(() => createAdminNewsContentMaterial());
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [returnTo, setReturnTo] = useState('dialog');

  const categoryOptions = useMemo(() => buildAdminNewsCategoryFormOptions(), []);
  const editBasePath = `/admin/news/${newsId}/edit`;

  const categoryLabel = useMemo(
    () => categoryOptions.find((item) => String(item.value) === String(step1?.categoryId))?.label ?? '',
    [categoryOptions, step1?.categoryId],
  );

  useEffect(() => {
    const draft = loadAdminNewsEditDraft();
    if (!isAdminNewsEditDraftForArticle(newsId) || !draft?.step1?.title?.trim()) {
      navigate(draft?.returnTo === 'edit' ? editBasePath : '/admin/news', { replace: true });
      return;
    }

    setStep1(draft.step1);
    setMaterial(createAdminNewsContentMaterial(draft.content ?? ''));
    setReturnTo(draft.returnTo ?? 'dialog');
    setReady(true);
  }, [editBasePath, navigate, newsId]);

  const handleMaterialChange = useCallback((tempId, patch) => {
    if (tempId !== ADMIN_NEWS_CONTENT_MATERIAL_TEMP_ID) return;

    setMaterial((prev) => {
      const next = { ...prev, ...patch };
      if (patch.Content !== undefined) {
        saveAdminNewsEditContentToStorage(patch.Content);
      }
      return next;
    });

    if (patch.Content !== undefined) {
      setErrors((prev) => {
        if (!prev.Content) return prev;
        const next = { ...prev };
        delete next.Content;
        return next;
      });
    }
  }, []);

  const handleBack = () => {
    saveAdminNewsEditContentToStorage(material.Content ?? '');
    const draft = loadAdminNewsEditDraft();
    const backToDialog = draft?.returnTo === 'dialog' || draft?.returnTo === 'list';

    if (backToDialog) {
      navigate('/admin/news', { state: { reopenEditArticleId: Number(newsId) } });
      return;
    }

    navigate(editBasePath);
  };

  const handleSaveClick = () => {
    const validationErrors = validateAdminNewsContent(material.Content);
    if (hasAdminNewsFormErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setSubmitting(true);
    try {
      const res = await updateNewsArticleContent(newsId, material.Content);

      if (!res.ok) {
        toast.error(res.message ?? 'Không thể lưu nội dung');
        return;
      }

      toast.success('Đã lưu nội dung bài viết');
      setConfirmOpen(false);

      const draft = loadAdminNewsEditDraft();
      const backToDialog = returnTo === 'dialog' || returnTo === 'list';
      if (backToDialog) {
        saveAdminNewsEditDraft({
          articleId: Number(newsId),
          step1,
          content: material.Content ?? '',
          original: draft?.original ?? null,
          returnTo: 'dialog',
        });
        navigate('/admin/news', { state: { reopenEditArticleId: Number(newsId) } });
        return;
      }

      clearAdminNewsEditDraft();
      navigate('/admin/news');
    } catch {
      toast.error('Không thể lưu nội dung');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return <Loading message="Đang tải nội dung..." />;
  }

  const fromDialog = returnTo === 'dialog' || returnTo === 'list';

  return (
    <Box sx={{ width: '100%', maxWidth: 1080, mx: 'auto' }}>
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 } }}
      >
        <BreadcrumbLink to="/admin/news" onClick={() => navigate('/admin/news')}>
          Tin tức
        </BreadcrumbLink>
        {!fromDialog ? (
          <BreadcrumbLink to={editBasePath} onClick={handleBack}>
            Chỉnh sửa tin
          </BreadcrumbLink>
        ) : null}
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
          Sửa nội dung
        </Typography>
      </Breadcrumbs>

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
            disabled={submitting}
          />
        </Box>

        <AdminNewsCreateSummary
          step1={step1}
          categoryLabel={categoryLabel}
          footer={
            <AdminNewsCreateFooter
              layout="sidebar"
              cancelLabel="Quay lại"
              onCancel={handleBack}
              onPrimary={handleSaveClick}
              submitting={submitting}
              primaryLabel="Lưu thay đổi"
            />
          }
        />
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        loading={submitting}
        title="Lưu nội dung bài viết?"
        message={`Chỉ lưu nội dung bài viết "${step1?.title ?? ''}". Thông tin cơ bản sẽ không thay đổi.`}
        confirmLabel="Lưu thay đổi"
        cancelLabel="Hủy"
      />
    </Box>
  );
}
