/**
 * LoginPage  ─  Trang đăng nhập
 *
 * Props: không có (page component, mounted bởi React Router)
 *
 * State nội bộ:
 *   form        { email, password }
 *   errors      { email?, password?, general? }
 *   isSubmitting boolean
 *   remember    boolean  — lưu email vào localStorage
 *
 * ── Fetch / Side-effects ──────────────────────────────────────────────────
 *   useEffect: đọc localStorage[REMEMBER_KEY] khi mount để pre-fill email
 *
 * ── API call ─────────────────────────────────────────────────────────────
 *   POST /api/auth/login  (qua loginApi)
 *
 *   Request JSON:
 *   { email: string, password: string }
 *
 *   Response JSON (success):
 *   {
 *     success:  true,
 *     user: { userId, fullName, email, role, isFirstLogin }
 *   }
 *
 *   Response JSON (fail):
 *   { success: false, message: string }
 *
 *   Sau đăng nhập thành công:
 *   - Lưu user vào localStorage['star_user']
 *   - isFirstLogin === true  → navigate('/survey')
 *   - Admin                  → navigate('/admin/accounts')
 *   - Mentor                 → navigate('/mentor/courses')
 *   - otherwise              → navigate('/home')
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import { loginApi } from '@/features/auth/services/authService';
import { getPostLoginPath, isAuthenticatedUser } from '@/features/auth/utils/authUtils';
import Logo from '@/shared/ui/Logo';
import AuthPasswordField from '@/shared/ui/AuthPasswordField';
import { toast } from '@/shared/ui/Toast';
import '@/shared/styles/auth.css';
import { useAuth } from '@/context/AuthContext';

const REMEMBER_KEY = 'star_remember_email';

/**
 * Hàm kiểm tra cấu trúc email có hợp lệ không (đúng định dạng RegExp, có @, có dấu chấm và không chứa khoảng trắng).
 */
const validateEmail = (email) => {
  if (!email || email.includes(' ')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);
  const submittingRef = useRef(false);

  /**
   * Effect chạy 1 lần duy nhất khi component được dựng (mount) lên:
   * Kiểm tra xem localStorage có lưu email ghi nhớ đăng nhập không. Nếu có, điền sẵn vào form.
   */
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setForm((prev) => ({ ...prev, email: saved }));
      setRemember(true);
    }
  }, []);

  /**
   * Effect tự động chuyển hướng người dùng ra trang Dashboard tương ứng
   * nếu họ đã đăng nhập trước đó rồi (tránh việc vào lại trang Login khi đã có phiên làm việc).
   */
  useEffect(() => {
    if (isAuthenticatedUser()) {
      navigate(getPostLoginPath(), { replace: true });
    }
  }, [navigate]);

  /**
   * Hàm validate dữ liệu form Đăng nhập (kiểm tra rỗng, kiểm tra định dạng email).
   * Trả về danh sách các thông báo lỗi nếu có.
   */
  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email không được để trống.';
    else if (!validateEmail(form.email)) errs.email = 'Email không hợp lệ (phải có @, dấu chấm, tên miền, không khoảng trắng).';
    if (!form.password) errs.password = 'Mật khẩu không được để trống.';
    return errs;
  };

  /**
   * Hàm bắt sự kiện thay đổi dữ liệu trên các ô nhập input (email, password).
   * Đồng thời xóa bỏ thông báo lỗi tương ứng khi người dùng bắt đầu sửa dữ liệu.
   */
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };


  const handleSubmit = async (e) => {
    // 1. Chặn hành động reload trang mặc định.
    e.preventDefault();
    // Chống spam click 
    if (submittingRef.current) return;
    // 2. Gọi hàm validate.
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // 3. Gọi API Đăng nhập và nhận về JWT Token cùng thông tin User.
      const { ok, data, token } = await loginApi(form.email.trim(), form.password);
      if (ok) {
        // 4. Ghi nhớ/Xoá Email ghi nhớ đăng nhập trong localStorage.
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, form.email.trim());
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        // 5. Lưu JWT và thông tin người dùng vào AuthContext.
        login(data, token);
        toast.success('Đăng nhập thành công!');
        // 6. Điều hướng đến trang tương ứng với Role của User.
        navigate(getPostLoginPath(data, { isFirstLogin: data.isFirstLogin }));
      } else {
        toast.error(data?.message);
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    } catch {
      toast.error('Không thể kết nối server. Vui lòng kiểm tra backend.');
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-card">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-back-home"
          style={{
            background: 'none', border: 'none', color: '#008b8b', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            alignSelf: 'flex-start', marginBottom: '16px', padding: 0
          }}
        >
          &larr; Về trang chủ
        </button>
        <div className="auth-brand">
          <Logo height={56} link={false} className="brand-logo" />
          <h1>S.T.A.R Learning Path</h1>
          <p>Đăng nhập để tiếp tục hành trình học tập</p>
        </div>

        <hr className="auth-divider" />

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">
                <EmailOutlinedIcon />
              </span>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="example@gmail.com"
                value={form.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <AuthPasswordField
            id="login-password"
            name="password"
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isSubmitting}
            autoComplete="current-password"
          />

          <div className="auth-form-options">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isSubmitting}
              />
              Ghi nhớ đăng nhập
            </label>
            <div className="forgot-link">
              <Link to="/forgot-password">Quên mật khẩu?</Link>
            </div>
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <><CircularProgress size={16} thickness={5} sx={{ color: 'inherit', mr: 1 }} />Đang đăng nhập...</>
              : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-footer">
          Chưa có tài khoản?{' '}
          <Link to="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
