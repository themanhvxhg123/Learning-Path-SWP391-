const { sql } = require('../config/db');

// ==========================================
// DASHBOARD STATS
// ==========================================
const getDashboardStats = async () => {
  const request = new sql.Request();
  const result = await request.query(`
    SELECT
      (SELECT COUNT(*) FROM Users) AS totalUsers,
      (SELECT COUNT(*) FROM Courses) AS totalCourses,
      (SELECT COUNT(*) FROM Courses WHERE IsPublished = 1) AS publishedCourses,
      (SELECT COUNT(*) FROM User_Courses) AS totalEnrollments,
      (SELECT COUNT(*) FROM Categories) AS totalCategories,
      (SELECT COUNT(*) FROM Levels) AS totalLevels
  `);
  return result.recordset[0];
};

// ==========================================
// USERS
// ==========================================
const getAllUsers = async () => {
  const request = new sql.Request();
  const result = await request.query(`
    SELECT u.UserId, u.FullName, u.Email, u.Phone, u.DateOfBirth,
           u.IsFirstLogin, u.CreatedAt, u.UpdatedAt, u.CurrentLevelId, u.LearningGoal,
           STRING_AGG(r.RoleName, ', ') AS Roles
    FROM Users u
    LEFT JOIN User_Roles ur ON u.UserId = ur.UserId
    LEFT JOIN Roles r ON ur.RoleId = r.RoleId
    GROUP BY u.UserId, u.FullName, u.Email, u.Phone, u.DateOfBirth,
             u.IsFirstLogin, u.CreatedAt, u.UpdatedAt, u.CurrentLevelId, u.LearningGoal
    ORDER BY u.UserId
  `);
  return result.recordset;
};

const getUserById = async (userId) => {
  const request = new sql.Request();
  request.input('userId', sql.Int, userId);
  const result = await request.query(`
    SELECT u.UserId, u.FullName, u.Email, u.Phone, u.DateOfBirth,
           u.IsFirstLogin, u.CreatedAt, u.UpdatedAt, u.CurrentLevelId, u.LearningGoal
    FROM Users u
    WHERE u.UserId = @userId
  `);
  return result.recordset[0] || null;
};

const updateUser = async (userId, data) => {
  const request = new sql.Request();
  request.input('userId', sql.Int, userId);
  request.input('FullName', sql.NVarChar(100), data.FullName);
  request.input('Email', sql.NVarChar(150), data.Email);
  request.input('Phone', sql.NVarChar(20), data.Phone || null);
  request.input('DateOfBirth', sql.Date, data.DateOfBirth || null);
  request.input('LearningGoal', sql.NVarChar(100), data.LearningGoal || null);
  request.input('CurrentLevelId', sql.Int, data.CurrentLevelId || null);

  await request.query(`
    UPDATE Users
    SET FullName = @FullName,
        Email = @Email,
        Phone = @Phone,
        DateOfBirth = @DateOfBirth,
        LearningGoal = @LearningGoal,
        CurrentLevelId = @CurrentLevelId,
        UpdatedAt = GETDATE()
    WHERE UserId = @userId
  `);
};

const createUser = async (data) => {
  const request = new sql.Request();
  request.input('FullName', sql.NVarChar(100), data.FullName);
  request.input('Email', sql.NVarChar(150), data.Email);
  request.input('Phone', sql.NVarChar(20), data.Phone || null);
  request.input('DateOfBirth', sql.Date, data.DateOfBirth || null);
  request.input('Password', sql.NVarChar(255), data.Password);

  // Check email exists
  const checkReq = new sql.Request();
  checkReq.input('email', sql.NVarChar(150), data.Email);
  const checkResult = await checkReq.query('SELECT UserId FROM Users WHERE Email = @email');
  if (checkResult.recordset.length > 0) {
    throw new Error('Email đã tồn tại');
  }

  const result = await request.query(`
    INSERT INTO Users (FullName, Email, Phone, DateOfBirth, Password, CreatedAt, UpdatedAt)
    OUTPUT INSERTED.*
    VALUES (@FullName, @Email, @Phone, @DateOfBirth, @Password, GETDATE(), GETDATE())
  `);

  const newUser = result.recordset[0];

  // Assign role if specified
  if (data.Role && newUser) {
    const roleReq = new sql.Request();
    roleReq.input('userId', sql.Int, newUser.UserId);
    roleReq.input('roleName', sql.NVarChar(50), data.Role);
    await roleReq.query(`
      INSERT INTO User_Roles (UserId, RoleId)
      SELECT @userId, RoleId FROM Roles WHERE RoleName = @roleName
    `);
  }

  return newUser;
};

const deleteUser = async (userId) => {
  const request = new sql.Request();
  request.input('userId', sql.Int, userId);
  // Xoá các bản ghi liên quan trước
  await request.query(`DELETE FROM User_Roles WHERE UserId = @userId`);
  await request.query(`DELETE FROM User_Categories WHERE UserId = @userId`);
  await request.query(`DELETE FROM User_Courses WHERE UserId = @userId`);
  await request.query(`DELETE FROM User_Nodes WHERE UserId = @userId`);
  await request.query(`DELETE FROM Users WHERE UserId = @userId`);
};


// ==========================================
// ROLES
// ==========================================
const getUserRoles = async (userId) => {
  const request = new sql.Request();
  request.input('userId', sql.Int, userId);
  const result = await request.query(`
    SELECT r.RoleId, r.RoleName
    FROM User_Roles ur
    JOIN Roles r ON ur.RoleId = r.RoleId
    WHERE ur.UserId = @userId
  `);
  return result.recordset;
};

const setUserRoles = async (userId, roleIds) => {
  const request = new sql.Request();
  request.input('userId', sql.Int, userId);
  // Xoá roles cũ
  await request.query(`DELETE FROM User_Roles WHERE UserId = @userId`);
  // Thêm roles mới
  for (const roleId of roleIds) {
    const ins = new sql.Request();
    ins.input('userId', sql.Int, userId);
    ins.input('roleId', sql.Int, roleId);
    await ins.query(`INSERT INTO User_Roles (UserId, RoleId) VALUES (@userId, @roleId)`);
  }
};

const getAllRoles = async () => {
  const result = await new sql.Request().query(`SELECT * FROM Roles ORDER BY RoleId`);
  return result.recordset;
};

// ==========================================
// CATEGORIES
// ==========================================
const getAllCategories = async () => {
  const result = await new sql.Request().query(`SELECT * FROM Categories ORDER BY CategoryId`);
  return result.recordset;
};

const createCategory = async (data) => {
  const request = new sql.Request();
  request.input('CategoryName', sql.NVarChar(50), data.CategoryName);
  request.input('DisplayName', sql.NVarChar(100), data.DisplayName);
  const result = await request.query(`
    INSERT INTO Categories (CategoryName, DisplayName, CreatedAt)
    OUTPUT INSERTED.*
    VALUES (@CategoryName, @DisplayName, GETDATE())
  `);
  return result.recordset[0];
};

const updateCategory = async (categoryId, data) => {
  const request = new sql.Request();
  request.input('CategoryId', sql.Int, categoryId);
  request.input('CategoryName', sql.NVarChar(50), data.CategoryName);
  request.input('DisplayName', sql.NVarChar(100), data.DisplayName);
  await request.query(`
    UPDATE Categories
    SET CategoryName = @CategoryName, DisplayName = @DisplayName
    WHERE CategoryId = @CategoryId
  `);
};

const deleteCategory = async (categoryId) => {
  const request = new sql.Request();
  request.input('CategoryId', sql.Int, categoryId);
  await request.query(`DELETE FROM Categories WHERE CategoryId = @CategoryId`);
};

// ==========================================
// LEVELS
// ==========================================
const getAllLevels = async () => {
  const result = await new sql.Request().query(`SELECT * FROM Levels ORDER BY SortOrder`);
  return result.recordset;
};

const createLevel = async (data) => {
  const request = new sql.Request();
  request.input('LevelName', sql.NVarChar(20), data.LevelName);
  request.input('DisplayName', sql.NVarChar(50), data.DisplayName);
  request.input('SortOrder', sql.Int, data.SortOrder);
  const result = await request.query(`
    INSERT INTO Levels (LevelName, DisplayName, SortOrder, CreatedAt)
    OUTPUT INSERTED.*
    VALUES (@LevelName, @DisplayName, @SortOrder, GETDATE())
  `);
  return result.recordset[0];
};

const updateLevel = async (levelId, data) => {
  const request = new sql.Request();
  request.input('LevelId', sql.Int, levelId);
  request.input('LevelName', sql.NVarChar(20), data.LevelName);
  request.input('DisplayName', sql.NVarChar(50), data.DisplayName);
  request.input('SortOrder', sql.Int, data.SortOrder);
  await request.query(`
    UPDATE Levels
    SET LevelName = @LevelName, DisplayName = @DisplayName, SortOrder = @SortOrder
    WHERE LevelId = @LevelId
  `);
};

const deleteLevel = async (levelId) => {
  const request = new sql.Request();
  request.input('LevelId', sql.Int, levelId);
  await request.query(`DELETE FROM Levels WHERE LevelId = @LevelId`);
};

// ==========================================
// COURSES (Admin view all)
// ==========================================
const getAllCourses = async () => {
  const request = new sql.Request();
  const result = await request.query(`
    SELECT crs.CourseId, crs.CourseName, crs.Description, crs.CategoryId, crs.LevelId,
           crs.InstructorId, crs.Thumbnail, crs.Rating, crs.TotalLessons,
           crs.IsPublished, crs.CreatedAt, crs.UpdatedAt,
           cate.DisplayName AS CategoryDisplayName,
           lv.DisplayName AS LevelDisplayName,
           u.FullName AS InstructorName,
           (SELECT COUNT(*) FROM User_Courses uc WHERE uc.CourseId = crs.CourseId) AS StudentCount
    FROM Courses crs
    LEFT JOIN Categories cate ON crs.CategoryId = cate.CategoryId
    LEFT JOIN Levels lv ON crs.LevelId = lv.LevelId
    LEFT JOIN Users u ON crs.InstructorId = u.UserId
    ORDER BY crs.CourseId DESC
  `);
  return result.recordset;
};

const adminUpdateCourse = async (courseId, data) => {
  const request = new sql.Request();
  request.input('CourseId', sql.Int, courseId);
  request.input('CourseName', sql.NVarChar(200), data.CourseName);
  request.input('Description', sql.NVarChar(sql.MAX), data.Description);
  request.input('CategoryId', sql.Int, data.CategoryId);
  request.input('LevelId', sql.Int, data.LevelId);
  request.input('IsPublished', sql.Bit, data.IsPublished ?? false);
  request.input('InstructorId', sql.Int, data.InstructorId || null);

  await request.query(`
    UPDATE Courses
    SET CourseName = @CourseName,
        Description = @Description,
        CategoryId = @CategoryId,
        LevelId = @LevelId,
        IsPublished = @IsPublished,
        InstructorId = @InstructorId,
        UpdatedAt = GETDATE()
    WHERE CourseId = @CourseId
  `);
};

const adminDeleteCourse = async (courseId) => {
  const request = new sql.Request();
  request.input('courseId', sql.Int, courseId);
  // Xoá dữ liệu liên quan
  await request.query(`
    DELETE un FROM User_Nodes un
      INNER JOIN Path_Nodes pn ON un.NodeId = pn.NodeId
      INNER JOIN Paths p ON pn.PathId = p.PathId WHERE p.CourseId = @courseId;
    DELETE nm FROM Node_Materials nm
      INNER JOIN Path_Nodes pn ON nm.NodeId = pn.NodeId
      INNER JOIN Paths p ON pn.PathId = p.PathId WHERE p.CourseId = @courseId;
    DELETE pn FROM Path_Nodes pn
      INNER JOIN Paths p ON pn.PathId = p.PathId WHERE p.CourseId = @courseId;
    DELETE FROM Paths WHERE CourseId = @courseId;
    DELETE FROM User_Courses WHERE CourseId = @courseId;
    DELETE FROM Courses WHERE CourseId = @courseId;
  `);
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  createUser,
  deleteUser,
  getUserRoles,
  setUserRoles,
  getAllRoles,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllLevels,
  createLevel,
  updateLevel,
  deleteLevel,
  getAllCourses,
  adminUpdateCourse,
  adminDeleteCourse,
};


