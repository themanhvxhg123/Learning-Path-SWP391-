import { Box, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import AppButton from '@/shared/ui/AppButton';
import { MUTED, PRIMARY } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const INLINE_BUTTON_SX = {
  flex: { xs: '1 1 0', sm: '0 0 auto' },
  minWidth: { xs: 0, sm: 100 },
  height: 44,
  borderRadius: '999px',
  fontWeight: 700,
  fontSize: { xs: 12, sm: 14 },
  px: { xs: 1.25, sm: 2.5 },
};

const SIDEBAR_BUTTON_SX = {
  flex: '1 1 0',
  minWidth: 0,
  height: 32,
  borderRadius: '999px',
  fontWeight: 700,
  fontSize: 11,
  px: 0.75,
  whiteSpace: 'nowrap',
};

function SaveStatusRow({ saveStatus }) {
  if (!saveStatus) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      {saveStatus === 'saved' ? (
        <>
          <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#059669', flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#059669', lineHeight: 1.4 }}>
            Đã lưu nháp
          </Typography>
        </>
      ) : (
        <>
          <CloudOffOutlinedIcon sx={{ fontSize: 16, color: MUTED, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: MUTED, lineHeight: 1.4 }}>
            Chưa lưu nháp
          </Typography>
        </>
      )}
    </Box>
  );
}

function FooterActions({
  cancelLabel,
  onCancel,
  cancelStartIcon,
  onSaveDraft,
  savingDraft,
  primaryLabel,
  onPrimary,
  submitting,
  primaryStartIcon,
  primaryEndIcon,
  actionsDisabled,
  buttonSx,
  layout,
}) {
  const isSidebar = layout === 'sidebar';

  return (
    <>
      <AppButton
        variant="outlined"
        startIcon={isSidebar ? undefined : cancelStartIcon}
        onClick={onCancel}
        disabled={actionsDisabled}
        sx={buttonSx}
      >
        {cancelLabel}
      </AppButton>

      {onSaveDraft ? (
        <AppButton
          variant="outlined"
          onClick={onSaveDraft}
          loading={savingDraft}
          disabled={actionsDisabled}
          sx={buttonSx}
        >
          Lưu nháp
        </AppButton>
      ) : null}

      <AppButton
        onClick={onPrimary}
        loading={submitting}
        startIcon={!submitting && !isSidebar ? primaryStartIcon : undefined}
        endIcon={!submitting && !isSidebar ? primaryEndIcon : undefined}
        disabled={actionsDisabled}
        sx={{
          ...buttonSx,
          bgcolor: PRIMARY,
          '&:hover': { bgcolor: '#0E7490' },
        }}
      >
        {primaryLabel}
      </AppButton>
    </>
  );
}

export default function AdminNewsCreateFooter({
  layout = 'inline',
  saveStatus = null,
  cancelLabel = 'Hủy',
  onCancel,
  cancelStartIcon,
  onSaveDraft,
  savingDraft = false,
  primaryLabel = 'Tiếp theo',
  onPrimary,
  submitting = false,
  primaryStartIcon,
  primaryEndIcon,
  disabled = false,
}) {
  const actionsDisabled = disabled || submitting || savingDraft;
  const isSidebar = layout === 'sidebar';
  const buttonSx = isSidebar ? SIDEBAR_BUTTON_SX : INLINE_BUTTON_SX;

  if (isSidebar) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: 0.5,
          pt: 1.5,
          mt: 1.5,
          borderTop: '1px solid rgba(15,23,42,0.06)',
          width: '100%',
        }}
      >
        <FooterActions
          cancelLabel={cancelLabel}
          onCancel={onCancel}
          onSaveDraft={onSaveDraft}
          savingDraft={savingDraft}
          primaryLabel={primaryLabel}
          onPrimary={onPrimary}
          submitting={submitting}
          actionsDisabled={actionsDisabled}
          buttonSx={buttonSx}
          layout={layout}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        pt: 2,
        mt: 2,
        borderTop: '1px solid rgba(15,23,42,0.06)',
        width: '100%',
      }}
    >
      {saveStatus ? (
        <SaveStatusRow saveStatus={saveStatus} />
      ) : (
        <Box sx={{ display: { xs: 'none', md: 'block' }, width: 1, flex: { xs: '1 1 100%', md: '0 0 auto' } }} />
      )}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
          flex: saveStatus ? { xs: '1 1 100%', sm: '0 0 auto' } : 1,
          width: saveStatus ? { xs: '100%', sm: 'auto' } : '100%',
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
          ml: saveStatus ? { xs: 0, sm: 'auto' } : 0,
        }}
      >
        <FooterActions
          cancelLabel={cancelLabel}
          onCancel={onCancel}
          cancelStartIcon={cancelStartIcon}
          onSaveDraft={onSaveDraft}
          savingDraft={savingDraft}
          primaryLabel={primaryLabel}
          onPrimary={onPrimary}
          submitting={submitting}
          primaryStartIcon={primaryStartIcon}
          primaryEndIcon={primaryEndIcon}
          actionsDisabled={actionsDisabled}
          buttonSx={buttonSx}
          layout={layout}
        />
      </Box>
    </Box>
  );
}
