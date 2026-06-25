import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  UNSAFE_NavigationContext as NavigationContext,
  useBeforeUnload,
} from 'react-router-dom';

/**
 * Cảnh báo khi học viên rời trang đang làm bài kiểm tra.
 * Chặn SPA navigation (sidebar, header, link…) qua navigator patch.
 */
export function useTestLeaveGuard(enabled) {
  const { navigator } = useContext(NavigationContext);
  const allowLeaveRef = useRef(false);
  const originalsRef = useRef(null);
  const pendingRef = useRef(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const allowLeave = useCallback(() => {
    allowLeaveRef.current = true;
  }, []);

  const cancelLeave = useCallback(() => {
    pendingRef.current = null;
    setDialogOpen(false);
  }, []);

  const confirmLeave = useCallback(() => {
    allowLeaveRef.current = true;
    setDialogOpen(false);

    const pending = pendingRef.current;
    pendingRef.current = null;
    const originals = originalsRef.current;
    if (!pending || !originals) return;

    if (pending.type === 'navigation') {
      originals[pending.method](...pending.args);
      return;
    }

    if (pending.type === 'historyBack') {
      originals.go(-1);
      return;
    }

    if (pending.type === 'reload') {
      window.location.reload();
    }
  }, []);

  const requestLeave = useCallback((pending) => {
    if (allowLeaveRef.current) {
      return true;
    }
    pendingRef.current = pending;
    setDialogOpen(true);
    return false;
  }, []);

  useEffect(() => {
    if (enabled) {
      allowLeaveRef.current = false;
    }
  }, [enabled]);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!enabled || allowLeaveRef.current) return;
        event.preventDefault();
        event.returnValue = TEST_LEAVE_DIALOG.beforeUnloadMessage;
        return TEST_LEAVE_DIALOG.beforeUnloadMessage;
      },
      [enabled],
    ),
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      if (allowLeaveRef.current || !isReloadShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      requestLeave({ type: 'reload' });
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled, requestLeave]);

  useEffect(() => {
    if (!enabled || !navigator) return undefined;

    const originals = {
      push: navigator.push.bind(navigator),
      replace: navigator.replace.bind(navigator),
      go: navigator.go.bind(navigator),
    };
    originalsRef.current = originals;

    const intercept =
      (method) =>
      (...args) => {
        if (allowLeaveRef.current) {
          originals[method](...args);
          return;
        }
        requestLeave({ type: 'navigation', method, args });
      };

    navigator.push = intercept('push');
    navigator.replace = intercept('replace');
    navigator.go = intercept('go');

    window.history.pushState({ testLeaveGuard: true }, '');

    const onPopState = () => {
      if (allowLeaveRef.current) return;
      window.history.pushState({ testLeaveGuard: true }, '');
      requestLeave({ type: 'historyBack' });
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      navigator.push = originals.push;
      navigator.replace = originals.replace;
      navigator.go = originals.go;
      window.removeEventListener('popstate', onPopState);
    };
  }, [enabled, navigator, requestLeave]);

  return {
    dialogOpen,
    confirmLeave,
    cancelLeave,
    allowLeave,
  };
}

export const TEST_LEAVE_DIALOG = {
  title: 'Lưu ý',
  message:
    'Bạn đang làm bài kiểm tra. Nếu thoát trang bây giờ, bạn sẽ mất 1 lượt làm bài và tiến trình hiện tại sẽ không được lưu. Bạn có chắc muốn thoát không?',
  confirmLabel: 'Thoát và mất lượt',
  cancelLabel: 'Tiếp tục làm bài',
  /** Dùng cho beforeunload — trình duyệt có thể vẫn hiện câu mặc định của hệ thống. */
  beforeUnloadMessage:
    'Bạn sẽ mất 1 lượt làm bài nếu rời trang. Tiến trình làm bài sẽ không được lưu.',
};

function isReloadShortcut(event) {
  if (event.key === 'F5') return true;
  const key = event.key?.toLowerCase();
  return key === 'r' && (event.ctrlKey || event.metaKey);
}
