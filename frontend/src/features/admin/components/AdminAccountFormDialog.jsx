// ===== AdminAccountFormDialog.jsx =====
// Dialog (hộp thoại) chỉnh sửa tài khoản - cho phép đổi vai trò và trạng thái.
//
// 📍 VỊ TRÍ TRONG LUỒNG CHỈNH SỬA (BƯỚC 4 - HIỂN THỊ FORM):
// File này hiển thị form chỉnh sửa khi người dùng bấm nút sửa. Nó nhận account
// từ trang chính, cho người dùng đổi vai trò/trạng thái, rồi gọi onSubmit để
// gửi dữ liệu lên trang chính.
// ➡️ Đến từ: AdminAccountManagementPage.jsx (dòng 271) — frontend/src/features/admin/pages/AdminAccountManagementPage.jsx
// ➡️ Đi tiếp: AdminAccountManagementPage.jsx (dòng 152) — frontend/src/features/admin/pages/AdminAccountManagementPage.jsx

import { useEffect, useMemo, useState } from 'react';

import {
  Avatar,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  alpha,
} from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import AppButton from '@/shared/ui/AppButton';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { toast } from '@/shared/ui/Toast';
import { FormFieldSelect } from '@/features/admin/components/AdminAccountFormFields';
import {
  ADMIN_ACCOUNT_FORM_ROLE_OPTIONS,
  ADMIN_ACCOUNT_FORM_STATUS_OPTIONS,
} from '@/features/admin/data/adminAccountsMock';
import {
  ADMIN_ACCOUNT_ROLE_CHIP_SX,
  ADMIN_ACCOUNT_ROLE_LABELS,
  ADMIN_ACCOUNT_STATUS_CHIP_SX,
  ADMIN_ACCOUNT_STATUS_LABELS,
  formatAccountDateOfBirth,
  getAccountInitials,
  hasAccountEditErrors,
  validateAccountEditForm,
} from '@/features/admin/utils/adminAccountUtils';
import { PRIMARY, TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

function SummaryField({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.25, lineHeight: 1.3 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 500,
          color: TEXT,
          lineHeight: 1.45,
          wordBreak: 'break-word',
        }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

function AdminAccountSummaryCard({ account }) {
  return (
    <Box
      sx={{
        p: 1.25,
        mb: 2,
        borderRadius: '12px',
        bgcolor: 'rgba(15,23,42,0.03)',
        border: '1px solid rgba(15,23,42,0.06)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
        <Avatar
          sx={{
            width: 44,
            height: 44,
            bgcolor: alpha(PRIMARY, 0.12),
            color: PRIMARY,
            fontSize: 15,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getAccountInitials(account.fullName)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>
            {account.fullName}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.25,
        }}
      >
        <SummaryField label="Email" value={account.email} />
        <SummaryField label="Số điện thoại" value={account.phone} />
        <SummaryField label="Ngày sinh" value={formatAccountDateOfBirth(account.dateOfBirth)} />
      </Box>
    </Box>
  );
}

function buildChangeSummary(account, role, status) {
  const lines = [];
  if (account.role !== role) {
    lines.push(
      `Vai trò: ${ADMIN_ACCOUNT_ROLE_LABELS[account.role] ?? account.role} → ${ADMIN_ACCOUNT_ROLE_LABELS[role] ?? role}`,
    );
  }
  if (account.status !== status) {
    lines.push(
      `Trạng thái: ${ADMIN_ACCOUNT_STATUS_LABELS[account.status] ?? account.status} → ${ADMIN_ACCOUNT_STATUS_LABELS[status] ?? status}`,
    );
  }
  return lines;
}

export default function AdminAccountFormDialog({
  open,
  onClose,
  account,
  onSubmit,
  saving = false,
  currentUserId = null,
}) {
  const [role, setRole] = useState('Student');
  const [status, setStatus] = useState('ACTIVE');
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open && account) {
      setRole(account.role ?? 'Student');
      setStatus(account.status ?? 'ACTIVE');
      setErrors({});
      setConfirmOpen(false);
    }
  }, [open, account]);

  const hasChanges = useMemo(() => {
    if (!account) return false;
    return account.role !== role || account.status !== status;
  }, [account, role, status]);

  const changeSummary = useMemo(() => {
    if (!account) return [];
    return buildChangeSummary(account, role, status);
  }, [account, role, status]);

  // ===== HÀM XỬ LÝ KHI BẤM "LƯU THAY ĐỔI" (BƯỚC 4a) =====
  // Đây là hàm được gọi khi người dùng bấm nút "Lưu thay đổi" trong dialog.
  // CÁCH HOẠT ĐỘNG: Kiểm tra form hợp lệ -> nếu không có thay đổi thì báo toast,
  // nếu có thay đổi thì mở hộp thoại xác nhận (ConfirmDialog).
  const handleSaveClick = () => {
    const validationErrors = validateAccountEditForm({ role, status });
    if (hasAccountEditErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    if (!hasChanges) {
      toast.info('Không có thay đổi nào để lưu');
      return;
    }

    setConfirmOpen(true);  // Mở hộp thoại xác nhận
  };

  // ===== HÀM XÁC NHẬN LƯU (BƯỚC 4b) =====
  // Đây là hàm được gọi khi người dùng bấm "Lưu thay đổi" trong hộp thoại xác nhận.
  // CÁCH HOẠT ĐỘNG: Gọi onSubmit với { role, status } để gửi dữ liệu lên trang chính.
  // ➡️ Đi tiếp: AdminAccountManagementPage.jsx (dòng 152) — frontend/src/features/admin/pages/AdminAccountManagementPage.jsx
  const handleConfirmSave = async () => {
    await onSubmit?.({ role, status });
    setConfirmOpen(false);
  };


  const isSelf = currentUserId && account?.id === currentUserId;

  if (!account) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={() => !saving && onClose?.()}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: 'blur(8px)',
              backgroundColor: alpha('#0F172A', 0.35),
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>Chỉnh sửa tài khoản</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography sx={{ fontSize: 13, color: MUTED, mb: 2, lineHeight: 1.5 }}>
            Chỉ có thể thay đổi vai trò và trạng thái của tài khoản.
          </Typography>

          <AdminAccountSummaryCard account={account} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <FormFieldSelect
              label="Vai trò"
              icon={BadgeOutlinedIcon}
              iconColor="#7C3AED"
              value={role}
              options={ADMIN_ACCOUNT_FORM_ROLE_OPTIONS}
              colorMap={ADMIN_ACCOUNT_ROLE_CHIP_SX}
              onChange={(value) => {
                setRole(value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.role;
                  return next;
                });
              }}
              error={errors.role}
            />

            <FormFieldSelect
              label="Trạng thái"
              icon={FactCheckOutlinedIcon}
              iconColor="#047857"
              value={status}
              options={ADMIN_ACCOUNT_FORM_STATUS_OPTIONS}
              colorMap={ADMIN_ACCOUNT_STATUS_CHIP_SX}
              disabledOptions={isSelf ? ['LOCKED'] : []}
              onChange={(value) => {
                setStatus(value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.status;
                  return next;
                });
              }}
              error={errors.status}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <AppButton variant="outlined" onClick={onClose} disabled={saving}>
            Hủy
          </AppButton>
          <AppButton
            loading={saving}
            disabled={!hasChanges}
            onClick={handleSaveClick}
            sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#0E7490' } }}
          >
            Lưu thay đổi
          </AppButton>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        loading={saving}
        title="Lưu thay đổi tài khoản?"
        message={[
          `Bạn sắp cập nhật tài khoản ${account.fullName}.`,
          ...changeSummary,
        ].join(' ')}
        confirmLabel="Lưu thay đổi"
        cancelLabel="Hủy"
      />
    </>
  );
}
