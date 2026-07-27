const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { sql } = require('../config/db');

/* ─── Multer storage: saves avatars to backend/uploads/avatars/ ──────────── */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
//check thư mục đã tồn tại chưa
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  //Nơi cất giấu: Chỉ định cất bức ảnh vào đúng cái thư mục UPLOAD_DIR vừa tạo ở trên
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  // Đặt lại tên file (Chống trùng lặp)
  filename: (req, _file, cb) => {
      // lấy ID của user đang gửi ảnh lên
    const userId = req.user?.userId || 'unknown';
    // chuyển thành .png
    const ext = '.png';
    //một con số tính bằng Mili-giây (ms)
    cb(null, `avatar_${userId}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max
  fileFilter: (_req, file, cb) => {
    // Nếu mác của file là hình ảnh (image/png, image/jpeg...) thì cho phép đi qua (true)
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

/* ─── Export multer middleware for use in routes ─────────────────────────── */
module.exports.avatarUploadMiddleware = upload.single('avatar');

/* ─── POST /api/users/avatar ─────────────────────────────────────────────── */
module.exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không nhận được file ảnh.' });
    }

    const userId = req.user.userId;

    // Tạo cái đường link ảo để Frontend có thể lấy ảnh hiển thị lên web
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Bỏ vào sql
    const updateReq = new sql.Request();
    updateReq.input('userId', sql.Int, userId);
    updateReq.input('avatarUrl', sql.NVarChar(500), avatarUrl);

    await updateReq.query(`
      UPDATE Users
      SET AvatarUrl = @avatarUrl, UpdatedAt = GETDATE()
      WHERE UserId = @userId
    `);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công.',
      avatarUrl: avatarUrl,
    });
  } catch (err) {
    console.error('[UploadAvatar Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tải ảnh.' });
  }
};
