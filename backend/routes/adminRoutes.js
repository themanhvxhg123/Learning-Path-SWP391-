const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const {
  getDashboard,
  getUsers,
  createUser,
  getUserDetail,
  updateUser,
  deleteUser,
  toggleUserActive,
  updateUserRoles,
  getRoles,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getLevels,
  createLevel,
  updateLevel,
  deleteLevel,
  getCourses,
  updateCourse,
  deleteCourse,
} = require('../controllers/adminController');

// ========== DASHBOARD ==========
router.get('/dashboard', protect, adminOnly, getDashboard);

// ========== USERS ==========
// 📍 VỊ TRÍ TRONG LUỒNG CHỈNH SỬA TÀI KHOẢN (BƯỚC 8 - ĐỊNH TUYẾN BACKEND):
// Đây là nơi backend nhận request từ frontend. Khi admin sửa tài khoản:
//   - Đổi vai trò   -> PUT /users/:userId/roles  -> gọi updateUserRoles
//   - Đổi trạng thái -> PUT /users/:userId/active -> gọi toggleUserActive
// ➡️ Đến từ: adminApiClient.js (dòng 59) — frontend/src/features/admin/services/adminApiClient.js
// ➡️ Đi tiếp: adminController.js (hàm updateUserRoles, toggleUserActive) — backend/controllers/adminController.js
router.get('/users', protect, adminOnly, getUsers);
router.post('/users', protect, adminOnly, createUser);
router.get('/users/:userId', protect, adminOnly, getUserDetail);
router.put('/users/:userId', protect, adminOnly, updateUser);
router.delete('/users/:userId', protect, adminOnly, deleteUser);
router.put('/users/:userId/roles', protect, adminOnly, updateUserRoles);
router.put('/users/:userId/active', protect, adminOnly, toggleUserActive);


// ========== ROLES ==========
router.get('/roles', protect, adminOnly, getRoles);

// ========== CATEGORIES ==========
router.get('/categories', protect, adminOnly, getCategories);
router.post('/categories', protect, adminOnly, createCategory);
router.put('/categories/:categoryId', protect, adminOnly, updateCategory);
router.delete('/categories/:categoryId', protect, adminOnly, deleteCategory);

// ========== LEVELS ==========
router.get('/levels', protect, adminOnly, getLevels);
router.post('/levels', protect, adminOnly, createLevel);
router.put('/levels/:levelId', protect, adminOnly, updateLevel);
router.delete('/levels/:levelId', protect, adminOnly, deleteLevel);

// ========== COURSES ==========
router.get('/courses', protect, adminOnly, getCourses);
router.put('/courses/:courseId', protect, adminOnly, updateCourse);
router.delete('/courses/:courseId', protect, adminOnly, deleteCourse);

module.exports = router;
