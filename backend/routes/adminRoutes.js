const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getDashboard,
  getUsers,
  createUser,
  getUserDetail,
  updateUser,
  deleteUser,
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


// Middleware kiểm tra quyền Admin
const adminOnly = (req, res, next) => {
  // Lấy userId từ protect middleware
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }
  // Kiểm tra role Admin từ header hoặc có thể query DB
  // Đơn giản: dùng header x-role-name hoặc query DB
  const roleName = req.headers['x-role-name'];
  if (roleName && roleName.toLowerCase() === 'admin') {
    return next();
  }
  // Fallback: kiểm tra từ DB
  const { sql } = require('../config/db');
  new sql.Request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT 1 FROM User_Roles ur
      JOIN Roles r ON ur.RoleId = r.RoleId
      WHERE ur.UserId = @userId AND r.RoleName = 'Admin'
    `)
    .then(result => {
      if (result.recordset.length > 0) {
        next();
      } else {
        return res.status(403).json({ success: false, message: 'Không có quyền Admin' });
      }
    })
    .catch(() => res.status(500).json({ success: false, message: 'Lỗi server' }));
};

// ========== DASHBOARD ==========
router.get('/dashboard', protect, adminOnly, getDashboard);

// ========== USERS ==========
router.get('/users', protect, adminOnly, getUsers);
router.post('/users', protect, adminOnly, createUser);
router.get('/users/:userId', protect, adminOnly, getUserDetail);
router.put('/users/:userId', protect, adminOnly, updateUser);
router.delete('/users/:userId', protect, adminOnly, deleteUser);
router.put('/users/:userId/roles', protect, adminOnly, updateUserRoles);


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
