import { useEffect, useMemo, useState } from 'react';
import { Box, Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useNavigate, useParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import Loading from '@/shared/ui/Loading';
import AdminNewsForm from '@/features/admin/components/AdminNewsForm';
import AdminNewsCreateStepIndicator from '@/features/admin/components/AdminNewsCreateStepIndicator';
import { getNewsArticleById } from '@/features/admin/services/adminNewsService';
import {
  ADMIN_NEWS_FORM_INITIAL,
  hasAdminNewsFormErrors,
  mapArticleToNewsFormStep1,
  validateAdminNewsFormStep1,
} from '@/features/admin/utils/adminNewsFormUtils';
import {
  clearAdminNewsEditDraft,
  isAdminNewsEditDraftForArticle,
  loadAdminNewsEditDraft,
  saveAdminNewsEditDraft,
  saveAdminNewsEditStep1ToStorage,
} from '@/features/admin/utils/adminNewsEditStorage';
import { buildAdminNewsCategoryFormOptions } from '@/features/admin/utils/adminNewsUtils';
import { CREATE_CARD_SX, MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';

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

export default function AdminNewsEditPage() {
  const navigate = useNavigate();
  const { newsId } = useParams();
  const [form, setForm] = useState(ADMIN_NEWS_FORM_INITIAL);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const categoryOptions = useMemo(() => buildAdminNewsCategoryFormOptions(), []);
  const editBasePath = `/admin/news/${newsId}/edit`;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      if (isAdminNewsEditDraftForArticle(newsId)) {
        const draft = loadAdminNewsEditDraft();
        if (!cancelled && draft?.step1) {
          setForm({ ...ADMIN_NEWS_FORM_INITIAL, ...draft.step1 });
          setLoading(false);
        }
        return;
      }

      const res = await getNewsArticleById(newsId);
      if (cancelled) return;

      if (!res.ok || !res.article) {
        navigate('/admin/news', { replace: true });
        return;
      }

      const step1 = mapArticleToNewsFormStep1(res.article);
      saveAdminNewsEditDraft({
        articleId: Number(newsId),
        step1,
        content: res.article.content ?? '',
      });
      setForm(step1);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, newsId]);

  const handleNavigate = (path) => navigate(path);

  const handleCancel = () => {
    clearAdminNewsEditDraft();
    navigate('/admin/news');
  };

  const handleNext = () => {
    const validationErrors = validateAdminNewsFormStep1(form);
    if (hasAdminNewsFormErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    saveAdminNewsEditStep1ToStorage(Number(newsId), form);
    navigate(`${editBasePath}/content`);
    setSubmitting(false);
  };

  if (loading) {
    return <Loading message="Đang tải tin tức..." />;
  }

  const formFooter = (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 1.25,
        pt: 0.5,
      }}
    >
      <AppButton
        variant="outlined"
        onClick={handleCancel}
        disabled={submitting}
        sx={{ minWidth: 100, height: 44, borderRadius: '999px', fontWeight: 700 }}
      >
        Hủy
      </AppButton>
      <AppButton
        loading={submitting}
        endIcon={!submitting ? <ArrowForwardRoundedIcon /> : undefined}
        onClick={handleNext}
        sx={{
          minWidth: 128,
          height: 44,
          borderRadius: '999px',
          fontWeight: 700,
          bgcolor: PRIMARY,
          '&:hover': { bgcolor: '#0E7490' },
        }}
      >
        Tiếp theo
      </AppButton>
    </Box>
  );

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
          Chỉnh sửa tin
        </Typography>
      </Breadcrumbs>

      <AdminNewsCreateStepIndicator currentStep={1} />

      <Box sx={{ ...CREATE_CARD_SX, mb: 3 }}>
        <AdminNewsForm
          form={form}
          errors={errors}
          categoryOptions={categoryOptions}
          onChange={(nextForm) => {
            setForm(nextForm);
            setErrors({});
          }}
          disabled={submitting}
          footer={formFooter}
        />
      </Box>
    </Box>
  );
}
