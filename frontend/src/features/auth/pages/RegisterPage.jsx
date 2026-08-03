/**
 * RegisterPage  ─  Trang đăng ký tài khoản
 *
 * Props: không có (page component)
 *
 * State nội bộ:
 *   form     { fullName, email, phone, password, confirmPassword, dateOfBirth }
 *   errors   { fullName?, email?, phone?, password?, confirmPassword?, dateOfBirth?, general? }
 *   step     number  (1 = nhập thông tin, 2 = chờ OTP)
 *
 * ── API call ─────────────────────────────────────────────────────────────
 *   POST /api/auth/register  (qua registerApi)
 *
 *   Request JSON:
 *   {
 *     fullName:    string,
 *     email:       string,
 *     phone:       string,
 *     password:    string,
 *     dateOfBirth: string   // "YYYY-MM-DD"
 *   }
 *
 *   Response JSON (success):
 *   { success: true, message: "Mã OTP đã gửi đến email." }
 *
 *   Response JSON (fail):
 *   { success: false, message: "Email đã tồn tại." }
 *
 *   Sau khi gửi thành công → navigate('/verify-otp', { state: { email } })
 */
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import InputAdornment from '@mui/material/InputAdornment';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import { registerApi } from '@/features/auth/services/authService';
import Logo from '@/shared/ui/Logo';
import AuthPasswordField from '@/shared/ui/AuthPasswordField';
import { toast } from '@/shared/ui/Toast';
import '@/shared/styles/auth.css';

const validateEmail = (email) => {
  if (!email || email.includes(' ')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
};

const validatePhone = (phone) => /^[0-9]{9,11}$/.test(phone.replace(/\s/g, ''));

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm]                 = useState({ fullName: '', dateOfBirth: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors]             = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef                   = useRef(false);

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim())           errs.fullName        = 'Họ và tên không được để trống.';
    if (!form.dateOfBirth)               errs.dateOfBirth     = 'Ngày sinh không được để trống.';
    else if (new Date(form.dateOfBirth) > new Date()) errs.dateOfBirth = 'Ngày sinh không được lớn hơn ngày hiện tại.';
    if (!form.phone.trim())              errs.phone           = 'Số điện thoại không được để trống.';
    else if (!validatePhone(form.phone)) errs.phone           = 'Số điện thoại không hợp lệ (9-11 chữ số).';
    if (!form.email.trim())              errs.email           = 'Email không được để trống.';
    else if (!validateEmail(form.email)) errs.email           = 'Email không hợp lệ.';
    if (!form.password)                  errs.password        = 'Mật khẩu không được để trống.';
    else if (form.password.length < 6)   errs.password        = 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (!form.confirmPassword)           errs.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    return errs;
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const { ok, data } = await registerApi({
        fullName:    form.fullName.trim(),
        dateOfBirth: form.dateOfBirth,
        phone:       form.phone.trim(),
        email:       form.email.trim(),
        password:    form.password,
      });
      if (ok && data.success) {
        sessionStorage.setItem('pendingEmail', form.email.trim().toLowerCase());
        toast.success(data.message);
        navigate('/verify-otp');
      } else {
        toast.error(data.message || 'Đăng ký thất bại.');
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
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-brand">
          <Logo height={56} link={false} className="brand-logo" />
          <h1>S.T.A.R Learning Path</h1>
          <p>Tạo tài khoản mới - Bắt đầu hành trình</p>
        </div>

        <hr className="auth-divider" />

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reg-fullName">Họ và tên</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">
                <PersonOutlineOutlinedIcon />
              </span>
              <input id="reg-fullName" type="text" name="fullName"
                placeholder="Nguyễn Văn A" value={form.fullName} onChange={handleChange}
                disabled={isSubmitting} />
            </div>
            {errors.fullName && <p className="field-error">{errors.fullName}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-dob">Ngày sinh</label>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
              <DatePicker
                format="DD/MM/YYYY"
                maxDate={dayjs()}
                value={form.dateOfBirth ? dayjs(form.dateOfBirth) : null}
                onChange={(newVal) => {
                  setForm(prev => ({ ...prev, dateOfBirth: newVal ? newVal.format('YYYY-MM-DD') : '' }));
                  setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                }}
                disabled={isSubmitting}
                slotProps={{
                  textField: {
                    id: "reg-dob",
                    placeholder: "DD/MM/YYYY",
                    fullWidth: true,
                    error: !!errors.dateOfBirth,
                    InputProps: {
                      startAdornment: (
                        <InputAdornment position="start" sx={{ pl: '2px', '& svg': { color: 'var(--clr-text-dim)', fontSize: '20px', transition: 'color 0.25s' } }}>
                          <CakeOutlinedIcon />
                        </InputAdornment>
                      )
                    },
                    sx: {
                      "& .MuiOutlinedInput-root": {
                        height: "46px",
                        borderRadius: "12px",
                        backgroundColor: "var(--clr-input-bg)",
                        color: "var(--clr-text)",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "14px",
                        transition: "border-color 0.25s, background 0.25s, box-shadow 0.25s",
                        "& fieldset": { 
                          borderColor: "var(--clr-input-br)",
                          borderWidth: "1px",
                        },
                        "&:hover fieldset": { 
                          borderColor: "var(--clr-input-br)",
                        },
                        "&.Mui-focused": {
                          backgroundColor: "var(--clr-bg-paper)",
                          "& fieldset": {
                            borderColor: "var(--clr-primary)",
                            borderWidth: "1px",
                          },
                          boxShadow: "0 0 0 3px rgba(8, 145, 178, 0.2)",
                          "& .MuiInputAdornment-root svg": {
                            color: "var(--clr-primary)",
                          }
                        }
                      },
                      "& .MuiOutlinedInput-input": {
                        paddingLeft: "8px",
                        "&::placeholder": {
                          color: "var(--clr-placeholder)",
                          opacity: 1,
                        }
                      }
                    }
                  }
                }}
              />
            </LocalizationProvider>
            {errors.dateOfBirth && <p className="field-error">{errors.dateOfBirth}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-phone">Số điện thoại</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">
                <PhoneOutlinedIcon />
              </span>
              <input id="reg-phone" type="tel" name="phone"
                placeholder="0901234567" value={form.phone} onChange={handleChange}
                disabled={isSubmitting} />
            </div>
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">
                <EmailOutlinedIcon />
              </span>
              <input id="reg-email" type="email" name="email" autoComplete="email"
                placeholder="example@gmail.com" value={form.email} onChange={handleChange}
                disabled={isSubmitting} />
            </div>
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <AuthPasswordField
            id="reg-password"
            name="password"
            label="Mật khẩu"
            placeholder="Tối thiểu 6 ký tự"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isSubmitting}
            autoComplete="new-password"
          />

          <AuthPasswordField
            id="reg-confirm"
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            placeholder="Nhập lại mật khẩu"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            disabled={isSubmitting}
            autoComplete="new-password"
            Icon={VpnKeyOutlinedIcon}
          />

          <button id="btn-register" type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting
              ? <><CircularProgress size={16} thickness={5} sx={{ color: 'inherit', mr: 1 }} />Đang gửi OTP...</>
              : 'Đăng ký & Nhận OTP'}
          </button>
        </form>

        <div className="auth-footer">
          Đã có tài khoản?{' '}
          <Link to="/login">Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}
