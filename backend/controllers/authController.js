const { sql } = require('../config/db');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const ROLE_STUDENT = 'Student';

// ============================================================
// Helpers
// ============================================================

/**
 * Kiểm tra cấu trúc Email hợp lệ (có @, dấu chấm, tên miền và không chứa khoảng trắng).
 */
const validateEmail = (email) => {
  if (!email || email.includes(' ')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
};

//const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString(); Hàm tạo OTP chỉ giới hạn từ 100000-> 999999
/**
 * Sinh mã OTP ngẫu nhiên gồm đúng 6 chữ số dưới dạng chuỗi (hỗ trợ số 0 ở đầu nhờ padStart).
 */
const generateOTP = () => Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Kiểm tra xem tài khoản và mật khẩu email gửi thư đã được cấu hình trong file .env chưa.
 */
const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim());

/**
 * Khởi tạo cấu hình kết nối SMTP gửi thư của thư viện Nodemailer (sử dụng dịch vụ Gmail).
 */
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER?.trim(),
      pass: process.env.EMAIL_PASS?.replace(/\s/g, ''),
    },
  });

/** Gửi OTP qua email; dev fallback in OTP ra console khi chưa cấu hình hoặc SMTP lỗi. */
const sendOtpEmail = async ({ to, subject, html, otpCode, label }) => {
  if (!isEmailConfigured()) {
    console.warn(`[Email] Chưa cấu hình EMAIL_USER/EMAIL_PASS — OTP ${label}: ${otpCode} → ${to}`);
    return { emailSent: false };
  }

  try {
    await createTransporter().sendMail({
      from: `"S.T.A.R Learning Path" <${process.env.EMAIL_USER.trim()}>`,
      to,
      subject,
      html,
    });
    return { emailSent: true };
  } catch (err) {
    console.error(`[Email Error] ${label}:`, err.message);
    // test trc khi có email tổng để gửi
    // đang chạy localhost thì bỏ vào terminal
    if (!isProduction) {
      console.warn(`[Email Dev Fallback] OTP ${label}: ${otpCode} → ${to}`);
      return { emailSent: false };
    }
    throw err;
  }
};

/**
 * Tạo câu thông báo phản hồi thân thiện dựa trên việc email thực sự được gửi hay in ra console.
 */
const otpDeliveryMessage = (email, emailSent) =>
  emailSent
    ? `Mã OTP đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư (kể cả Spam).`
    : `Mã OTP đã được tạo. Môi trường dev: xem mã OTP trong terminal backend.`;

/** Email OTP cho đăng ký tài khoản (gradient tím) */
/**
 * Tạo giao diện email dạng HTML chứa mã OTP để xác nhận đăng ký tài khoản học viên.
 */
const buildRegisterOtpHtml = (fullName, otpCode) => `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0f0e17;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6c63ff,#a78bfa);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:1px;">⭐ STAR Learning Path</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Xác thực tài khoản của bạn</p>
    </div>
    <div style="padding:32px 24px;background:#1a1830;">
      <p style="color:#c4c3d0;font-size:15px;">Xin chào bạn <strong style="color:#a78bfa;">${fullName}</strong>,</p>
      <p style="color:#c4c3d0;font-size:15px;">Dưới đây là mã OTP để hoàn tất đăng ký tài khoản:</p>
      <div style="text-align:center;margin:28px 0;">
        <span style="display:inline-block;font-size:38px;font-weight:800;letter-spacing:12px;color:#fff;background:linear-gradient(135deg,#6c63ff,#a78bfa);padding:16px 32px;border-radius:12px;">${otpCode}</span>
      </div>
      <p style="color:#8885a0;font-size:13px;text-align:center;">⏰ Mã có hiệu lực trong <strong style="color:#f6b93b;">3 phút</strong>. Vui lòng không chia sẻ với bất kỳ ai.</p>
    </div>
    <div style="padding:16px 24px;background:#0f0e17;text-align:center;">
      <p style="color:#555;font-size:12px;margin:0;">© ${new Date().getFullYear()} STAR Learning Path. All rights reserved.</p>
    </div>
  </div>
`;

/** Email OTP cho đặt lại mật khẩu (gradient cam-đỏ) */
/**
 * Tạo giao diện email dạng HTML chứa mã OTP để khôi phục/đặt lại mật khẩu.
 */
const buildResetPasswordHtml = (fullName, otpCode) => `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0f0e17;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#f6b93b,#ff6b6b);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:1px;">🔑 S.T.A.R Learning Path</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Yêu cầu đặt lại mật khẩu</p>
    </div>
    <div style="padding:32px 24px;background:#1a1830;">
      <p style="color:#c4c3d0;font-size:15px;">Xin chào <strong style="color:#f6b93b;">${fullName}</strong>,</p>
      <p style="color:#c4c3d0;font-size:15px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mã OTP:</p>
      <div style="text-align:center;margin:28px 0;">
        <span style="display:inline-block;font-size:38px;font-weight:800;letter-spacing:12px;color:#fff;background:linear-gradient(135deg,#f6b93b,#ff6b6b);padding:16px 32px;border-radius:12px;">${otpCode}</span>
      </div>
      <p style="color:#8885a0;font-size:13px;text-align:center;">⏰ Mã có hiệu lực trong <strong style="color:#f6b93b;">5 phút</strong>. Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
    </div>
    <div style="padding:16px 24px;background:#0f0e17;text-align:center;">
      <p style="color:#555;font-size:12px;margin:0;">© ${new Date().getFullYear()} S.T.A.R Learning Path. All rights reserved.</p>
    </div>
  </div>
`;

// ============================================================
// POST /api/auth/login
// Works for ALL roles: Admin, Mentor, Student
// ============================================================
/**
 * API: Đăng nhập tài khoản. Xác thực email, password và cấp quyền tương ứng (Student/Mentor/Admin) kèm ký mã JWT.
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email và mật khẩu không được để trống.' });
  if (!validateEmail(email))
    return res.status(400).json({ success: false, message: 'Định dạng email không hợp lệ.' });

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Lấy thông tin user
    const userReq = new sql.Request();
    userReq.input('email', sql.NVarChar(150), normalizedEmail);
    const userResult = await userReq.query('SELECT UserId, FullName, Email, Phone, Password, IsFirstLogin, IsActive FROM Users WHERE Email = @email');

    if (userResult.recordset.length === 0)
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });

    const user = userResult.recordset[0];

    if (user.Password !== password)
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });

    // Kiểm tra tài khoản có bị khóa không
    if (user.IsActive === 0 || user.IsActive === false) {
      return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.' });
    }

    // 2. Lấy danh sách roles của user từ User_Roles
    const roleReq = new sql.Request();
    roleReq.input('userId', sql.Int, user.UserId);
    const roleResult = await roleReq.query(`
      SELECT r.RoleName
      FROM   User_Roles ur
      JOIN   Roles      r ON r.RoleId = ur.RoleId
      WHERE  ur.UserId = @userId
    `);

    // Mảng tên roles, ví dụ: ['Admin'] | ['Student'] | ['Mentor']
    let roles = roleResult.recordset.map((r) => r.RoleName);

    // Tài khoản đăng ký qua OTP là Student; fallback nếu chưa có bản ghi User_Roles
    if (roles.length === 0) {
      roles = [ROLE_STUDENT];
    }

    // Tạo JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'star_learning_secret';
    const token = jwt.sign(
      { userId: user.UserId, email: user.Email, roles },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        userId: user.UserId,
        fullName: user.FullName,
        email: user.Email,
        phone: user.Phone,
        isFirstLogin: user.IsFirstLogin === true || user.IsFirstLogin === 1,
        roles,
      },
    });
  } catch (err) {
    console.error('[Login Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server. Vui lòng thử lại sau.' });
  }
};

// ============================================================
// POST /api/auth/register  (Student only — Admin/Mentor được seed thẳng vào DB)
// ============================================================
/**
 * API: Đăng ký tài khoản Student. Kiểm tra trùng lặp email/SĐT và gửi mã xác thực OTP.
 */
const register = async (req, res) => {
  let { fullName, dateOfBirth, phone, email, password } = req.body;

  if (!fullName || !dateOfBirth || !phone || !email || !password)
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ tất cả các trường.' });

  email = email.toLowerCase().trim();
  phone = phone.trim();

  if (!validateEmail(email))
    return res.status(400).json({
      success: false,
      message: 'Email không hợp lệ. Phải có @, dấu chấm và tên miền, không có khoảng trắng.',
    });

  try {
    // Kiểm tra email đã tồn tại trong Users
    const emailCheckReq = new sql.Request();
    emailCheckReq.input('email', sql.NVarChar(150), email);
    const emailCheck = await emailCheckReq.query('SELECT UserId FROM Users WHERE Email = @email');
    if (emailCheck.recordset.length > 0)
      return res.status(409).json({ success: false, message: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });

    // Kiểm tra phone đã tồn tại trong Users
    const phoneCheckReq = new sql.Request();
    phoneCheckReq.input('phone', sql.NVarChar(20), phone);
    const phoneCheck = await phoneCheckReq.query('SELECT UserId FROM Users WHERE Phone = @phone');
    if (phoneCheck.recordset.length > 0)
      return res.status(409).json({ success: false, message: 'Số điện thoại này đã được đăng ký.' });

    // Xoá OTP cũ nếu có
    const deleteReq = new sql.Request();
    deleteReq.input('email', sql.NVarChar(150), email);
    await deleteReq.query('DELETE FROM OTP_Verification WHERE Email = @email');

    // Tạo OTP + thời hạn 3 phút
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    // Chèn thông tin đăng ký và mã OTP vào bảng tạm OTP_Verification
    const insertReq = new sql.Request();
    insertReq.input('email', sql.NVarChar(150), email);
    insertReq.input('fullName', sql.NVarChar(100), fullName);
    insertReq.input('phone', sql.NVarChar(20), phone);
    insertReq.input('password', sql.NVarChar(255), password);
    insertReq.input('dateOfBirth', sql.Date, new Date(dateOfBirth));
    insertReq.input('otpCode', sql.NVarChar(6), otpCode);
    insertReq.input('expiresAt', sql.DateTime, expiresAt);

    await insertReq.query(`
      INSERT INTO OTP_Verification (Email, FullName, Phone, Password, DateOfBirth, OtpCode, ExpiresAt)
      VALUES (@email, @fullName, @phone, @password, @dateOfBirth, @otpCode, @expiresAt)
    `);

    const { emailSent } = await sendOtpEmail({
      to: email,
      subject: 'Mã xác thực OTP của bạn - S.T.A.R Learning Path',
      html: buildRegisterOtpHtml(fullName, otpCode),
      otpCode,
      label: 'đăng ký',
    });

    return res.json({
      success: true,
      message: otpDeliveryMessage(email, emailSent),
    });
  } catch (err) {
    console.error('[Register Error]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi email OTP. Vui lòng thử lại sau.',
    });
  }
};

// ============================================================
// POST /api/auth/verify-otp
// ============================================================
/**
 * API: Xác thực mã OTP đăng ký. Nếu hợp lệ, chính thức chèn thông tin người dùng vào bảng Users và User_Roles.
 */
const verifyOtp = async (req, res) => {
  const { email, otpCode } = req.body;

  if (!email || !otpCode)
    return res.status(400).json({ success: false, message: 'Email và mã OTP không được để trống.' });

  try {
    const findReq = new sql.Request();
    findReq.input('email', sql.NVarChar(150), email.toLowerCase().trim());
    findReq.input('otpCode', sql.NVarChar(6), otpCode.trim());

    const result = await findReq.query(
      'SELECT * FROM OTP_Verification WHERE Email = @email AND OtpCode = @otpCode'
    );

    if (result.recordset.length === 0)
      return res.status(400).json({ success: false, message: 'Mã OTP không đúng. Vui lòng kiểm tra lại.' });

    const record = result.recordset[0];

    if (new Date() > new Date(record.ExpiresAt))
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn (quá 3 phút). Vui lòng yêu cầu mã mới.',
      });

    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // Chèn user mới vào Users
      const insertReq = new sql.Request(transaction);
      insertReq.input('fullName', sql.NVarChar(100), record.FullName);
      insertReq.input('email', sql.NVarChar(150), record.Email);
      insertReq.input('phone', sql.NVarChar(20), record.Phone);
      insertReq.input('password', sql.NVarChar(255), record.Password);
      insertReq.input('dateOfBirth', sql.Date, record.DateOfBirth);

      const userResult = await insertReq.query(`
        INSERT INTO Users (FullName, Email, Phone, Password, DateOfBirth)
        OUTPUT INSERTED.UserId
        VALUES (@fullName, @email, @phone, @password, @dateOfBirth)
      `);

      const newUserId = userResult.recordset[0]?.UserId;

      if (newUserId) {
        const assignRoleReq = new sql.Request(transaction);
        assignRoleReq.input('userId', sql.Int, newUserId);
        assignRoleReq.input('roleName', sql.NVarChar(50), ROLE_STUDENT);
        await assignRoleReq.query(`
          INSERT INTO User_Roles (UserId, RoleId)
          SELECT @userId, RoleId FROM Roles WHERE RoleName = @roleName
        `);
      }

      // Xoá bản ghi OTP
      const deleteReq = new sql.Request(transaction);
      deleteReq.input('email', sql.NVarChar(150), record.Email);
      await deleteReq.query('DELETE FROM OTP_Verification WHERE Email = @email');
      // lưu thẳng vào db
      await transaction.commit();
    } catch (dbErr) {
      // nếu lỗi thì undo thì bảng OTP vẫn mới
      await transaction.rollback();
      throw dbErr;
    }

    return res.json({
      success: true,
      message: 'Xác thực thành công. Tài khoản đã được tạo. Bạn có thể đăng nhập ngay.',
    });
  } catch (err) {
    console.error('[VerifyOTP Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
  }
};
// ============================================================
// POST /api/auth/onboarding
// Lấy kết quả 3 câu hỏi (Category, Level, Goal) lưu vào Users
// ============================================================
// POST /api/auth/onboarding
/**
 * API: Lưu thông tin khảo sát ban đầu (Onboarding) bao gồm danh mục quan tâm, trình độ và mục tiêu học tập.
 */
const saveOnboarding = async (req, res) => {
  // Thay vì lấy 1 categoryId, ta lấy mảng categoryIds
  const { userId, categoryIds, levelId, goal } = req.body;

  // Validate kiểm tra mảng rỗng
  if (!userId || !categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0 || !levelId || !goal)
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin (chọn ít nhất 1 Lĩnh vực).' });

  try {
    const userCheck = new sql.Request();
    userCheck.input('userId', sql.Int, userId);
    const userResult = await userCheck.query('SELECT UserId FROM Users WHERE UserId = @userId');

    if (userResult.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });

    // 1. Cập nhật bảng Users (Chỉ còn Level, Goal)
    const updateReq = new sql.Request();
    updateReq.input('userId', sql.Int, userId);
    updateReq.input('levelId', sql.Int, levelId);
    updateReq.input('goal', sql.NVarChar(100), goal);
    await updateReq.query(`
      UPDATE Users 
      SET CurrentLevelId = @levelId, 
          LearningGoal = @goal, 
          IsFirstLogin = 0 
      WHERE UserId = @userId
    `);

    // 2. Xóa dữ liệu cũ trong bảng User_Categories (nếu có)
    const deleteReq = new sql.Request();
    deleteReq.input('userId', sql.Int, userId);
    await deleteReq.query('DELETE FROM User_Categories WHERE UserId = @userId');

    // 3. Vòng lặp Insert các lĩnh vực đã chọn vào bảng User_Categories
    for (const catId of categoryIds) {
      const insertReq = new sql.Request();
      insertReq.input('userId', sql.Int, userId);
      insertReq.input('categoryId', sql.Int, catId);
      await insertReq.query('INSERT INTO User_Categories (UserId, CategoryId) VALUES (@userId, @categoryId)');
    }

    return res.json({ success: true, message: 'Đã lưu kết quả khảo sát thành công!' });
  } catch (err) {
    console.error('[SaveOnboarding Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
  }
};



// ============================================================
// POST /api/auth/forgot-password
// Works for ALL roles — Admin, Mentor, Student
// ============================================================
/**
 * API: Xử lý Quên mật khẩu. Tìm kiếm tài khoản và gửi mã OTP đặt lại mật khẩu về email người dùng.
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email || !validateEmail(email.trim()))
    return res.status(400).json({ success: false, message: 'Vui lòng nhập email hợp lệ.' });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const findReq = new sql.Request();
    findReq.input('email', sql.NVarChar(150), normalizedEmail);
    const result = await findReq.query('SELECT UserId, FullName FROM Users WHERE Email = @email');

    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Email này chưa được đăng ký trong hệ thống.' });

    const user = result.recordset[0];
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // Lưu OTP vào cột ResetOtpCode, ResetOtpExpires trên bảng Users
    const updateReq = new sql.Request();
    updateReq.input('email', sql.NVarChar(150), normalizedEmail);
    updateReq.input('otpCode', sql.NVarChar(6), otpCode);
    updateReq.input('expiresAt', sql.DateTime, expiresAt);
    await updateReq.query(
      'UPDATE Users SET ResetOtpCode = @otpCode, ResetOtpExpires = @expiresAt WHERE Email = @email'
    );

    const { emailSent } = await sendOtpEmail({
      to: normalizedEmail,
      subject: '🔑 Mã OTP đặt lại mật khẩu - S.T.A.R Learning Path',
      html: buildResetPasswordHtml(user.FullName, otpCode),
      otpCode,
      label: 'đặt lại mật khẩu',
    });

    return res.json({
      success: true,
      message: otpDeliveryMessage(normalizedEmail, emailSent),
    });
  } catch (err) {
    console.error('[ForgotPassword Error]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi email OTP. Vui lòng thử lại sau.',
    });
  }
};

// ============================================================
// POST /api/auth/reset-password
// Works for ALL roles — Admin, Mentor, Student
// ============================================================
/**
 * API: Đặt lại mật khẩu mới. So khớp mã OTP quên mật khẩu và tiến hành cập nhật mật khẩu mới vào database.
 */
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword)
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ email, OTP và mật khẩu mới.' });

  if (!validateEmail(email.trim()))
    return res.status(400).json({ success: false, message: 'Định dạng email không hợp lệ.' });

  if (newPassword.length < 6)
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const findReq = new sql.Request();
    findReq.input('email', sql.NVarChar(150), normalizedEmail);
    const result = await findReq.query(
      'SELECT UserId, ResetOtpCode, ResetOtpExpires FROM Users WHERE Email = @email'
    );

    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Email này không tồn tại trong hệ thống.' });

    const user = result.recordset[0];

    if (!user.ResetOtpCode)
      return res.status(400).json({ success: false, message: 'Không có yêu cầu đặt lại mật khẩu nào. Vui lòng thử lại từ đầu.' });

    if (user.ResetOtpCode !== otp.trim())
      return res.status(400).json({ success: false, message: 'Mã OTP không đúng. Vui lòng kiểm tra lại.' });

    if (new Date() > new Date(user.ResetOtpExpires))
      return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn (quá 5 phút). Vui lòng yêu cầu mã mới.' });

    // Cập nhật mật khẩu và xoá OTP
    const updateReq = new sql.Request();
    updateReq.input('email', sql.NVarChar(150), normalizedEmail);
    updateReq.input('newPassword', sql.NVarChar(255), newPassword);
    await updateReq.query(
      'UPDATE Users SET Password = @newPassword, ResetOtpCode = NULL, ResetOtpExpires = NULL, UpdatedAt = GETDATE() WHERE Email = @email'
    );

    return res.json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới.',
    });
  } catch (err) {
    console.error('[ResetPassword Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
  }
};

module.exports = { login, register, verifyOtp, forgotPassword, resetPassword, saveOnboarding };
