import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';

/**
 * Cảnh báo rời trang khi create QB còn thay đổi chưa lưu nháp.
 * Không tự ghi storage — chỉ gọi onSaveDraft khi user chọn "Lưu nháp".
 */
export function useQuestionBankCreateLeaveGuard({ isDirty, onSaveDraft, workspaceKey = '' }) {
  const navigate = useNavigate();
  const allowLeaveRef = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    allowLeaveRef.current = false;
  }, [workspaceKey]);

  const completeLeave = useCallback(
    (action) => {
      setDialogOpen(false);
      setPendingAction(null);

      if (!action) return;

      if (action.kind === 'navigate') {
        allowLeaveRef.current = true;
        if (action.to === 'back') navigate(-1);
        else navigate(action.to);
        return;
      }

      if (action.kind === 'chapter') {
        action.onConfirm?.(action.chapterId);
        allowLeaveRef.current = false;
      }
    },
    [navigate],
  );

  const requestLeave = useCallback(
    (action) => {
      if (!isDirty) {
        completeLeave(action);
        return;
      }

      if (allowLeaveRef.current) {
        completeLeave(action);
        return;
      }

      setPendingAction(action);
      setDialogOpen(true);
    },
    [completeLeave, isDirty],
  );

  const handleStay = useCallback(() => {
    setDialogOpen(false);
    setPendingAction(null);
  }, []);

  const handleDiscard = useCallback(() => {
    completeLeave(pendingAction);
  }, [completeLeave, pendingAction]);

  const handleSaveDraft = useCallback(async () => {
    if (!onSaveDraft) {
      completeLeave(pendingAction);
      return;
    }

    setSaving(true);
    try {
      const saved = await onSaveDraft();
      if (saved === false) return;
      toast.success('Đã lưu bản nháp.');
      completeLeave(pendingAction);
    } finally {
      setSaving(false);
    }
  }, [completeLeave, onSaveDraft, pendingAction]);

  useEffect(() => {
    if (!isDirty) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return undefined;

    window.history.pushState({ qbCreateGuard: true }, '', window.location.href);

    const onPopState = () => {
      if (allowLeaveRef.current) return;

      window.history.pushState({ qbCreateGuard: true }, '', window.location.href);
      setPendingAction({ kind: 'navigate', to: 'back' });
      setDialogOpen(true);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isDirty]);

  return {
    dialogOpen,
    saving,
    requestLeave,
    handleStay,
    handleDiscard,
    handleSaveDraft,
  };
}
