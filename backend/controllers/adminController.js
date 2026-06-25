const adminModel = require('../Models/adminModel');

// ==========================================
// DASHBOARD
// ==========================================
const getDashboard = async (req, res) => {
  try {
    const stats = await adminModel.getDashboardStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[Admin Dashboard Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ==========================================
// USERS
// ==========================================
const getUsers = async (req, res) => {
  try {
    const users = await adminModel.getAllUsers();
    return res.json({ success: true, data: users });
  } catch (err) {
    console.error('[Admin GetUsers Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createUser = async (req, res) => {
  try {
    const { FullName, Email, Phone, DateOfBirth, Password, Role } = req.body;
    if (!FullName || !Email || !Password) {
      return res.status(400).json({ success: false, message: 'Thiếu họ tên, email hoặc mật khẩu' });
    }
    const result = await adminModel.createUser({ FullName, Email, Phone, DateOfBirth, Password, Role });
    return res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', data: result });
  } catch (err) {
    console.error('[Admin CreateUser Error]', err.message);
    if (err.message.includes('Email')) {
      return res.status(409).json({ success: false, message: 'Email đã tồn tại trong hệ thống' });
    }
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


const getUserDetail = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await adminModel.getUserById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    const roles = await adminModel.getUserRoles(userId);
    return res.json({ success: true, data: { ...user, roles } });
  } catch (err) {
    console.error('[Admin GetUser Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { FullName, Email, Phone, DateOfBirth, LearningGoal, CurrentLevelId } = req.body;
    if (!FullName || !Email) {
      return res.status(400).json({ success: false, message: 'Thiếu họ tên hoặc email' });
    }
    await adminModel.updateUser(userId, { FullName, Email, Phone, DateOfBirth, LearningGoal, CurrentLevelId });
    return res.json({ success: true, message: 'Cập nhật user thành công' });
  } catch (err) {
    console.error('[Admin UpdateUser Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    await adminModel.deleteUser(userId);
    return res.json({ success: true, message: 'Xoá user thành công' });
  } catch (err) {
    console.error('[Admin DeleteUser Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ==========================================
// USER ROLES
// ==========================================
const updateUserRoles = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { roleIds } = req.body;
    if (!Array.isArray(roleIds)) {
      return res.status(400).json({ success: false, message: 'roleIds phải là mảng' });
    }
    await adminModel.setUserRoles(userId, roleIds);
    return res.json({ success: true, message: 'Cập nhật vai trò thành công' });
  } catch (err) {
    console.error('[Admin UpdateRoles Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ==========================================
// ROLES
// ==========================================
const getRoles = async (req, res) => {
  try {
    const roles = await adminModel.getAllRoles();
    return res.json({ success: true, data: roles });
  } catch (err) {
    console.error('[Admin GetRoles Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ==========================================
// CATEGORIES
// ==========================================
const getCategories = async (req, res) => {
  try {
    const data = await adminModel.getAllCategories();
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Admin GetCategories Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { CategoryName, DisplayName } = req.body;
    if (!CategoryName || !DisplayName) {
      return res.status(400).json({ success: false, message: 'Thiếu CategoryName hoặc DisplayName' });
    }
    const result = await adminModel.createCategory({ CategoryName, DisplayName });
    return res.status(201).json({ success: true, message: 'Tạo danh mục thành công', data: result });
  } catch (err) {
    console.error('[Admin CreateCategory Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const categoryId = Number(req.params.categoryId);
    const { CategoryName, DisplayName } = req.body;
    if (!CategoryName || !DisplayName) {
      return res.status(400).json({ success: false, message: 'Thiếu CategoryName hoặc DisplayName' });
    }
    await adminModel.updateCategory(categoryId, { CategoryName, DisplayName });
    return res.json({ success: true, message: 'Cập nhật danh mục thành công' });
  } catch (err) {
    console.error('[Admin UpdateCategory Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const categoryId = Number(req.params.categoryId);
    await adminModel.deleteCategory(categoryId);
    return res.json({ success: true, message: 'Xoá danh mục thành công' });
  } catch (err) {
    console.error('[Admin DeleteCategory Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ==========================================
// LEVELS
// ==========================================
const getLevels = async (req, res) => {
  try {
    const data = await adminModel.getAllLevels();
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Admin GetLevels Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createLevel = async (req, res) => {
  try {
    const { LevelName, DisplayName, SortOrder } = req.body;
    if (!LevelName || !DisplayName || SortOrder === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin trình độ' });
    }
    const result = await adminModel.createLevel({ LevelName, DisplayName, SortOrder: Number(SortOrder) });
    return res.status(201).json({ success: true, message: 'Tạo trình độ thành công', data: result });
  } catch (err) {
    console.error('[Admin CreateLevel Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateLevel = async (req, res) => {
  try {
    const levelId = Number(req.params.levelId);
    const { LevelName, DisplayName, SortOrder } = req.body;
    if (!LevelName || !DisplayName || SortOrder === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin trình độ' });
    }
    await adminModel.updateLevel(levelId, { LevelName, DisplayName, SortOrder: Number(SortOrder) });
    return res.json({ success: true, message: 'Cập nhật trình độ thành công' });
  } catch (err) {
    console.error('[Admin UpdateLevel Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteLevel = async (req, res) => {
  try {
    const levelId = Number(req.params.levelId);
    await adminModel.deleteLevel(levelId);
    return res.json({ success: true, message: 'Xoá trình độ thành công' });
  } catch (err) {
    console.error('[Admin DeleteLevel Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ==========================================
// COURSES
// ==========================================
const getCourses = async (req, res) => {
  try {
    const courses = await adminModel.getAllCourses();
    return res.json({ success: true, data: courses });
  } catch (err) {
    console.error('[Admin GetCourses Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const { CourseName, Description, CategoryId, LevelId, IsPublished, InstructorId } = req.body;
    if (!CourseName) {
      return res.status(400).json({ success: false, message: 'Thiếu tên khóa học' });
    }
    await adminModel.adminUpdateCourse(courseId, {
      CourseName, Description, CategoryId, LevelId, IsPublished, InstructorId
    });
    return res.json({ success: true, message: 'Cập nhật khóa học thành công' });
  } catch (err) {
    console.error('[Admin UpdateCourse Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    await adminModel.adminDeleteCourse(courseId);
    return res.json({ success: true, message: 'Xoá khóa học thành công' });
  } catch (err) {
    console.error('[Admin DeleteCourse Error]', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
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
};


