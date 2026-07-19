const { sql } = require("../config/db");
const { toPathIsActiveBit } = require("../utils/pathActiveUtils");
const {
  saveCourseThumbnailFromDataUrl,
} = require("../middlewares/courseThumbnailMiddleware");

// ==========================================
// 1. CÁC HÀM LẤY DANH SÁCH KHÓA HỌC CHUNG
// ==========================================

// Phân luồng lấy khóa học tùy theo vai trò (Mentor hay Student)
const getCoursesByUserRole = (userId, userRole) => {
  if (userRole.toLowerCase() === "mentor") {
    return getMentorCourses(userId);
  }
  if (userRole.toLowerCase() === "student") {
    return getStudentCourses(userId);
  }
  return null;
};
// lay khoa hoc noi bat theo so luong nguoi tham gia
const getFeaturedCourses = async () => {
  const request = new sql.Request();
  const result = await request.query(`
    SELECT TOP 4
      c.CourseId,
      c.CourseName,
      c.Description,
      c.Thumbnail,
      c.Rating,
      (SELECT COUNT(pn.NodeId) 
       FROM Paths p 
       JOIN Path_Nodes pn ON p.PathId = pn.PathId 
       WHERE p.CourseId = c.CourseId 
         AND ISNULL(p.IsActive, 1) = 1 
         AND ISNULL(pn.IsActive, 1) = 1) AS TotalLessons,
      cat.DisplayName AS CategoryName,
      lv.DisplayName  AS LevelName,
      u.FullName      AS InstructorName,
      COUNT(uc.UserId) AS TotalStudents
    FROM Courses c
    LEFT JOIN Categories  cat ON c.CategoryId  = cat.CategoryId
    LEFT JOIN Levels      lv  ON c.LevelId     = lv.LevelId
    LEFT JOIN Users       u   ON c.InstructorId = u.UserId
    LEFT JOIN User_Courses uc ON c.CourseId    = uc.CourseId
    WHERE c.IsPublished = 1
    GROUP BY
      c.CourseId, c.CourseName, c.Description,
      c.Thumbnail, c.Rating,
      cat.DisplayName, lv.DisplayName, u.FullName
      ORDER BY TotalStudents DESC, c.Rating DESC, c.CourseName ASC
  `);
  return result.recordset;
};
// lấy top 4 khóa học có đánh giá (Rating) cao nhất
const getFeaturedPaths = async () => {
  const request = new sql.Request();
  const result = await request.query(`
    SELECT TOP 4
      c.CourseId, c.CourseName, c.Description, c.Thumbnail,
      c.Rating,
      (SELECT COUNT(pn.NodeId) 
       FROM Paths p 
       JOIN Path_Nodes pn ON p.PathId = pn.PathId 
       WHERE p.CourseId = c.CourseId 
         AND ISNULL(p.IsActive, 1) = 1 
         AND ISNULL(pn.IsActive, 1) = 1) AS TotalLessons,
      cat.DisplayName AS CategoryName,
      lv.DisplayName  AS LevelName,
      u.FullName      AS InstructorName,
      COUNT(uc.UserId) AS TotalStudents
    FROM Courses c
    LEFT JOIN Categories  cat ON c.CategoryId   = cat.CategoryId
    LEFT JOIN Levels      lv  ON c.LevelId      = lv.LevelId
    LEFT JOIN Users       u   ON c.InstructorId = u.UserId
    LEFT JOIN User_Courses uc ON c.CourseId     = uc.CourseId
    WHERE c.IsPublished = 1
    GROUP BY
      c.CourseId, c.CourseName, c.Description,
      c.Thumbnail, c.Rating,
      cat.DisplayName, lv.DisplayName, u.FullName
    ORDER BY c.Rating DESC          -- ← chỗ duy nhất khác mục 3
  `);
  return result.recordset;
};

// Lấy tất cả khóa học cho màn hình Catalog (Có phân trang, bộ lọc)
const getStudentCoursesList = async (filters, userId) => {
  const request = new sql.Request();
  const { search, category, level, status, sort } = filters;
  // Luôn truyền UserId vào SQL (nếu không đăng nhập thì là null)
  request.input("UserId", sql.Int, userId || null);

  let baseQuery = `
        FROM Courses crs
        LEFT JOIN Categories cate ON crs.CategoryId = cate.CategoryId
        LEFT JOIN Levels lv ON crs.LevelId = lv.LevelId
        LEFT JOIN User_Courses uc ON crs.CourseId = uc.CourseId AND uc.UserId = @UserId
        WHERE crs.IsPublished = 1
    `;

  // Lọc theo từ khóa tìm kiếm
  if (search) {
    baseQuery += ` AND crs.CourseName LIKE @Search`;
    request.input("Search", sql.NVarChar(200), `%${search}%`);
  }

  // Lọc theo danh mục
  if (category) {
    const catIds = Array.isArray(category) ? category.join(",") : category;
    if (catIds && String(catIds).trim() !== "") {
      baseQuery += ` AND crs.CategoryId IN (${catIds})`;
    }
  }

  // Lọc theo cấp độ
  if (level) {
    const levIds = Array.isArray(level) ? level.join(",") : level;
    if (levIds && String(levIds).trim() !== "") {
      baseQuery += ` AND crs.LevelId IN (${levIds})`;
    }
  }

  // Lọc theo trạng thái đã đăng ký hay chưa
  if (status && userId) {
    if (status === "enrolled") {
      baseQuery += ` AND EXISTS (SELECT 1 FROM User_Courses uc WHERE uc.CourseId = crs.CourseId AND uc.UserId = @UserId)`;
    } else if (status === "not_enrolled") {
      baseQuery += ` AND NOT EXISTS (SELECT 1 FROM User_Courses uc WHERE uc.CourseId = crs.CourseId AND uc.UserId = @UserId)`;
    }
    if (!request.parameters.UserId) {
      request.input("UserId", sql.Int, userId);
    }
  }

  // Lấy tổng số lượng để làm phân trang
  const countQuery = `SELECT COUNT(*) AS totalCount ${baseQuery}`;
  const countResult = await request.query(countQuery);
  const totalCount = countResult.recordset[0].totalCount;

  // Truy vấn dữ liệu chi tiết
  let selectQuery = `
        SELECT crs.CourseId, crs.CourseName, crs.Description, crs.CategoryId, crs.LevelId,
               crs.Rating, 
               (SELECT COUNT(*) FROM User_Courses uc2 WHERE uc2.CourseId = crs.CourseId) AS StudentCount,
               lv.LevelName as levelName, lv.DisplayName as LevelDisplayName,
               crs.Thumbnail, crs.CreatedAt, crs.UpdatedAt,
               cate.DisplayName as CategoryDisplayName, cate.CategoryName as CategoryName,
               CASE WHEN uc.UserId IS NOT NULL THEN 1 ELSE 0 END AS isEnrolled
        ${baseQuery}
    `;

  // Sắp xếp
  if (sort === "newest") {
    selectQuery += ` ORDER BY crs.CreatedAt DESC`;
  } else {
    selectQuery += ` ORDER BY crs.CourseId DESC`; // Mặc định xếp mới nhất theo ID
  }

  const coursesResult = await request.query(selectQuery);
  // Đắp thêm cấu trúc Path -> Node -> Material vào từng khóa học
  const coursesWithPaths = await buildCourse(coursesResult.recordset, false);
  return { courses: coursesWithPaths, totalCount };
};

// ==========================================
// 2. CÁC HÀM XÂY DỰNG CẤU TRÚC KHÓA HỌC (BUILD COURSE)
// ==========================================

// Ghép nối cấu trúc: Course -> Paths -> Nodes -> Materials
const buildCourse = async (courses, isMentor = false) => {
  return await Promise.all(
    courses.map(async (course) => {
      const coursePaths = await getCoursePaths(course.CourseId, isMentor);
      const pathsWithNodes = await Promise.all(
        coursePaths.map(async (path) => {
          const pathId = path.PathId;
          const nodes = await getPathNodes(pathId, isMentor);

          const nodesWithMaterials = await Promise.all(
            nodes.map(async (node) => {
              const nodeId = node.NodeId;
              const materials = await getMaterials(nodeId);
              return { ...node, Materials: materials };
            }),
          );

          return { ...path, Nodes: nodesWithMaterials };
        }),
      );
      return { ...course, Paths: pathsWithNodes };
    }),
  );
};

const getCoursePaths = async (courseId, isMentor = false) => {
  const request = new sql.Request();
  request.input("courseId", sql.Int, courseId);
  const activeCondition = !isMentor ? "AND ISNULL(IsActive, 1) = 1" : "";
  const result = await request.query(
    `Select * From Paths Where CourseId = @courseId ${activeCondition} ORDER BY [Order] ASC`,
  );
  return result.recordset;
};

/** Mục lục chương + bài (không kèm học liệu) — dùng cho Question Bank, quiz setup, v.v. */
const getCourseChaptersOutline = async (courseId) => {
  const request = new sql.Request();
  request.input("courseId", sql.Int, Number(courseId));
  const courseCheck = await request.query(
    `SELECT CourseId FROM Courses WHERE CourseId = @courseId`,
  );
  if (courseCheck.recordset.length === 0) {
    return null;
  }

  const paths = await getCoursePaths(Number(courseId), true);
  return Promise.all(
    paths.map(async (path) => {
      const nodes = await getPathNodes(path.PathId, true);
      return {
        PathId: path.PathId,
        PathName: path.PathName,
        Order: path.Order,
        IsActive: toPathIsActiveBit(path.IsActive, 1),
        Nodes: nodes.map((node) => ({
          NodeId: node.NodeId,
          NodeName: node.NodeName,
          NodeOrder: node.NodeOrder,
          IsActive: toPathIsActiveBit(node.IsActive, 1),
        })),
      };
    }),
  );
};

const getPathNodes = async (pathId, isMentor = false) => {
  const request = new sql.Request();
  request.input("pathId", sql.Int, pathId);
  const activeCondition = !isMentor ? "AND ISNULL(IsActive, 1) = 1" : "";
  const result = await request.query(
    `SELECT * FROM [dbo].[Path_Nodes] Where PathId = @pathId ${activeCondition} Order by NodeOrder Asc`,
  );
  return result.recordset;
};

const getMaterials = async (nodeId) => {
  const request = new sql.Request();
  request.input("nodeId", sql.Int, nodeId);
  const result = await request.query(
    `SELECT * FROM [LearningPath_Base].[dbo].[Node_Materials] Where NodeId = @nodeId Order By MaterialOrder ASC`,
  );
  return result.recordset;
};

// ==========================================
// 3. CHI TIẾT KHÓA HỌC & MENTOR
// ==========================================

const getCourseById = async (courseId, userId = null) => {
  const request = new sql.Request();
  request.input("courseId", sql.Int, Number(courseId));
  request.input("userId", sql.Int, userId || null);
  const result = await request.query(`
       Select crs.CourseId, 
crs.InstructorId,
Users.FullName as InStructorName,
            crs.IsPublished,
               crs.CourseName, 
               crs.Description,
               crs.Rating,
               (SELECT COUNT(DISTINCT cc.UserId) FROM Course_Comments cc WHERE cc.CourseId = crs.CourseId AND cc.Rating IS NOT NULL) AS ReviewCount,
               (SELECT COUNT(*) FROM User_Courses uc WHERE uc.CourseId = crs.CourseId) AS StudentCount,
               crs.CreatedAt as CourseCreateAt,
			        crs.UpdatedAt,
               crs.Thumbnail,
               (SELECT COUNT(*) FROM Paths p WHERE p.CourseId = crs.CourseId AND ISNULL(p.IsActive, 1) = 1) AS TotalPaths,
               (SELECT COUNT(pn.NodeId) 
                FROM Paths p 
                JOIN Path_Nodes pn ON p.PathId = pn.PathId 
                WHERE p.CourseId = crs.CourseId 
                  AND ISNULL(p.IsActive, 1) = 1 
                  AND ISNULL(pn.IsActive, 1) = 1) AS TotalLessons,
               (SELECT COUNT(nm.MaterialId) 
                FROM Paths p 
                JOIN Path_Nodes pn ON p.PathId = pn.PathId 
                JOIN Node_Materials nm ON pn.NodeId = nm.NodeId 
                WHERE p.CourseId = crs.CourseId
                  AND ISNULL(p.IsActive, 1) = 1
                  AND ISNULL(pn.IsActive, 1) = 1) AS TotalMaterials, 
               Users.FullName,
               Levels.LevelId,
               Levels.LevelName,
               Levels.DisplayName as LevelDisplayName,
               cate.CategoryId,
               cate.CategoryName,
               cate.DisplayName as CategoryDisplayName,
               CASE WHEN uc.UserId IS NOT NULL THEN 1 ELSE 0 END AS isEnrolled,
               ISNULL((
                   SELECT CASE WHEN T.Total > 0 THEN (C.Completed * 100) / T.Total ELSE 0 END
                   FROM 
                   (SELECT COUNT(*) AS Total FROM Path_Nodes pn JOIN Paths p ON pn.PathId = p.PathId WHERE p.CourseId = crs.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) T,
                   (SELECT COUNT(*) AS Completed FROM User_Nodes un JOIN Path_Nodes pn ON un.NodeId = pn.NodeId JOIN Paths p ON pn.PathId = p.PathId WHERE un.UserId = @userId AND p.CourseId = crs.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) C
               ), ISNULL(uc.ProgressPercentage, 0)) AS progress
        from courses crs
        join Categories cate on crs.CategoryId = cate.CategoryId
        join Levels on Levels.LevelId = crs.LevelId
        join Users on Users.UserId = crs.InstructorId
		 left join User_Courses uc on crs.CourseId = uc.CourseId and uc.UserId = @userId
        Where crs.CourseId = @courseId
    `);
  const isMentor = userId != null && result.recordset.length > 0 && Number(result.recordset[0].InstructorId) === Number(userId);
  return await buildCourse(result.recordset, isMentor);
};
// lay khoa hoc dang hoc hien thi o homepage
const getContinueCourse = async (userId) => {
  const request = new sql.Request();
  request.input("UserId", sql.Int, userId);

  const result = await request.query(`
    WITH ComputedProgress AS (
      SELECT 
          c.CourseId,
          c.CourseName,
          c.Thumbnail,
          uc.EnrollmentDate,
          ISNULL((
              SELECT CASE WHEN T.Total > 0 THEN (C.Completed * 100) / T.Total ELSE 0 END
              FROM 
              (SELECT COUNT(*) AS Total FROM Path_Nodes pn JOIN Paths p ON pn.PathId = p.PathId WHERE p.CourseId = c.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) T,
              (SELECT COUNT(*) AS Completed FROM User_Nodes un JOIN Path_Nodes pn ON un.NodeId = pn.NodeId JOIN Paths p ON pn.PathId = p.PathId WHERE un.UserId = @UserId AND p.CourseId = c.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) C
          ), ISNULL(uc.ProgressPercentage, 0)) AS ProgressPercentage
      FROM User_Courses uc
      INNER JOIN Courses c ON c.CourseId = uc.CourseId
      WHERE uc.UserId = @UserId
    )
    SELECT TOP 1 *
    FROM ComputedProgress
    WHERE ProgressPercentage < 100
    ORDER BY EnrollmentDate DESC`);
  return await buildCourse(result.recordset, false);
};

const getMentorCourses = async (userId) => {
  const request = new sql.Request();
  request.input("InstructorId", sql.Int, userId);

  const result = await request.query(`
        Select crs.CourseId, crs.CourseName, crs.TotalLessons as TotalLessons, crs.Description, crs.CategoryId, crs.LevelId,
               -- 1. Tính điểm Đánh giá Trung bình (Rating)
              (SELECT ISNULL(ROUND(AVG(CAST(cc.Rating AS FLOAT)), 1), 0) FROM Course_Comments cc WHERE cc.CourseId = crs.CourseId AND cc.Rating IS NOT NULL) AS Rating,
               -- 2. Đếm tổng số lượt đánh giá (ReviewCount) theo số người
              (SELECT COUNT(DISTINCT cc.UserId) FROM Course_Comments cc WHERE cc.CourseId = crs.CourseId AND cc.Rating IS NOT NULL) AS ReviewCount,
               -- 3. Đếm số Học viên đang học (StudentCount)
               (SELECT COUNT(*) FROM User_Courses uc WHERE uc.CourseId = crs.CourseId) AS StudentCount,
               Levels.LevelName as levelName, Levels.Displayname as LevelDisplayName, Levels.SortOrder as LevelSortOrder,
               crs.Thumbnail, crs.IsPublished, crs.CreatedAt, crs.UpdatedAt,
               cate.DisplayName as CategoryDisplayName, cate.CategoryName as CategoryName
        from courses crs
        join Categories cate on crs.CategoryId = cate.CategoryId
        join Levels on Levels.LevelId = crs.LevelId
        Where InstructorId = @InstructorId
    `);
  return await buildCourse(result.recordset, true);
};

// ==========================================
// 4. API DÀNH CHO HỌC VIÊN (STUDENT) & ĐĂNG KÝ
// ==========================================

const getStudentCourses = async (userId, filterStatus = "all") => {
  const request = new sql.Request();
  request.input("userId", sql.Int, userId);

  let query = `
      WITH ComputedProgress AS (
          SELECT crs.CourseId, crs.CourseName, crs.Description, crs.Thumbnail,
                 crs.Rating, (SELECT COUNT(*) FROM User_Courses uc2 WHERE uc2.CourseId = crs.CourseId) AS StudentCount,
                 crs.TotalLessons,
                 ISNULL((
                     SELECT CASE WHEN T.Total > 0 THEN (C.Completed * 100) / T.Total ELSE 0 END
                     FROM 
                     (SELECT COUNT(*) AS Total FROM Path_Nodes pn JOIN Paths p ON pn.PathId = p.PathId WHERE p.CourseId = crs.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) T,
                     (SELECT COUNT(*) AS Completed FROM User_Nodes un JOIN Path_Nodes pn ON un.NodeId = pn.NodeId JOIN Paths p ON pn.PathId = p.PathId WHERE un.UserId = uc.UserId AND p.CourseId = crs.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) C
                 ), ISNULL(uc.ProgressPercentage, 0)) AS ProgressPercentage,
                 uc.EnrollmentDate
          FROM User_Courses uc
          JOIN Courses crs ON uc.CourseId = crs.CourseId
          WHERE uc.UserId = @userId
      )
      SELECT * FROM ComputedProgress WHERE 1=1
    `;

  if (filterStatus === "learning") {
    query += ` AND ProgressPercentage > 0 AND ProgressPercentage < 100`;
  } else if (filterStatus === "completed") {
    query += ` AND ProgressPercentage = 100`;
  } else if (filterStatus === "not_started") {
    query += ` AND ProgressPercentage = 0`;
  }

  query += ` ORDER BY EnrollmentDate DESC`;

  const result = await request.query(query);
  return result.recordset;
};

// Hàm lấy khóa học cá nhân
const getMyEnrolledCourses = async (userId, filterStatus = "all") => {
  const request = new sql.Request();
  request.input("UserId", sql.Int, userId);

  let query = `
      WITH ComputedProgress AS (
          SELECT crs.CourseId, crs.CourseName, crs.Description, crs.Thumbnail, 
                 crs.Rating, (SELECT COUNT(*) FROM User_Courses uc2 WHERE uc2.CourseId = crs.CourseId) AS StudentCount,
                 (SELECT COUNT(*) FROM Path_Nodes pn JOIN Paths p ON pn.PathId = p.PathId WHERE p.CourseId = crs.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) AS TotalLessons,
                 (SELECT COUNT(*) FROM Paths p WHERE p.CourseId = crs.CourseId AND ISNULL(p.IsActive, 1) = 1) AS TotalPaths,
                 (SELECT COUNT(*) FROM User_Nodes un JOIN Path_Nodes pn ON un.NodeId = pn.NodeId JOIN Paths p ON pn.PathId = p.PathId WHERE un.UserId = uc.UserId AND p.CourseId = crs.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) AS CompletedLessons,
                 ISNULL((
                     SELECT CASE WHEN T.Total > 0 THEN (C.Completed * 100) / T.Total ELSE 0 END
                     FROM 
                     (SELECT COUNT(*) AS Total FROM Path_Nodes pn JOIN Paths p ON pn.PathId = p.PathId WHERE p.CourseId = crs.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) T,
                     (SELECT COUNT(*) AS Completed FROM User_Nodes un JOIN Path_Nodes pn ON un.NodeId = pn.NodeId JOIN Paths p ON pn.PathId = p.PathId WHERE un.UserId = uc.UserId AND p.CourseId = crs.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) C
                 ), ISNULL(uc.ProgressPercentage, 0)) AS progress, 
                 uc.EnrollmentDate,
                 cate.CategoryName, cate.DisplayName as CategoryDisplayName,
                 lv.LevelName as levelName, lv.DisplayName as LevelDisplayName
          FROM User_Courses uc
          INNER JOIN Courses crs ON uc.CourseId = crs.CourseId
          LEFT JOIN Categories cate ON crs.CategoryId = cate.CategoryId
          LEFT JOIN Levels lv ON crs.LevelId = lv.LevelId
          WHERE uc.UserId = @UserId
      )
      SELECT * FROM ComputedProgress WHERE 1=1
    `;

  if (filterStatus === "learning") {
    query += ` AND progress > 0 AND progress < 100`;
  } else if (filterStatus === "completed") {
    query += ` AND progress = 100`;
  } else if (filterStatus === "not_started") {
    query += ` AND progress = 0`;
  }

  query += ` ORDER BY EnrollmentDate DESC`;

  const result = await request.query(query);
  return result.recordset;
};

// HÀM ĐĂNG KÝ KHÓA HỌC
const enrollCourse = async (userId, courseId) => {
  const request = new sql.Request();
  request.input("UserId", sql.Int, userId);
  request.input("CourseId", sql.Int, courseId);

  const checkExist = await request.query(`
        SELECT 1 FROM User_Courses 
        WHERE UserId = @UserId AND CourseId = @CourseId
    `);

  if (checkExist.recordset.length > 0) {
    return { success: false, message: "Bạn đã đăng ký khóa học này rồi!" };
  }
  const result = await request.query(`
        INSERT INTO User_Courses (UserId, CourseId, ProgressPercentage, EnrollmentDate)
        VALUES (@UserId, @CourseId, 0, GETDATE())
    `);

  return { success: true, rowsAffected: result.rowsAffected };
};

// ==========================================
// 5. CÁC HÀM TẠO KHÓA HỌC MỚI (CREATE COURSE)
// ==========================================

const createCourseStepOne = async (course) => {
  const request = new sql.Request();

  request.input("CourseName", sql.NVarChar(200), course.CourseName);
  request.input("Description", sql.NVarChar(sql.MAX), course.Description);
  request.input("CategoryId", sql.Int, Number(course.CategoryId));
  request.input("LevelId", sql.Int, Number(course.LevelId));
  request.input("InstructorId", sql.Int, Number(course.InstructorId));
  request.input("Thumbnail", sql.NVarChar(500), null);
  request.input("Rating", sql.Decimal(3, 1), course.Rating ?? 0.0);
  request.input("TotalLessons", sql.Int, course.TotalLessons ?? 0);
  request.input("IsPublished", sql.Bit, course.IsPublished ?? false);

  const result = await request.query(`
        INSERT INTO Courses (CourseName, Description, CategoryId, LevelId, InstructorId, Thumbnail, Rating, TotalLessons, CreatedAt, UpdatedAt, IsPublished)
        OUTPUT INSERTED.*
        VALUES (@CourseName, @Description, @CategoryId, @LevelId, @InstructorId, @Thumbnail, @Rating, @TotalLessons, GETDATE(), GETDATE(), @IsPublished)
    `);

  return result.recordset[0].CourseId;
};

const insertPath = async (path, courseId) => {
  const request = new sql.Request();
  request.input("CourseId", sql.Int, Number(courseId));
  request.input("PathName", sql.NVarChar(100), path.PathName);
  request.input("Description", sql.NVarChar(sql.MAX), path.Description || null);
  request.input("Order", sql.Int, Number(path.PathOrder ?? path.Order ?? 1));
  request.input("IsActive", sql.Bit, toPathIsActiveBit(path.IsActive, 1));

  const result = await request.query(`
      INSERT INTO [dbo].[Paths] ([CourseId], [PathName], [Description], [CreatedAt], [Order], [IsActive])
      OUTPUT INSERTED.PathId AS pathId
      VALUES (@CourseId, @PathName, @Description, GETDATE(), @Order, @IsActive)
    `);
  return result.recordset[0].pathId;
};

const insertNode = async (node, pathId) => {
  const nodeName = String(node.NodeName ?? node.nodeName ?? '').trim();
  if (!nodeName) {
    throw new Error('Mỗi bài học (Path_Nodes) phải có NodeName.');
  }

  const request = new sql.Request();
  request.input("PathId", sql.Int, pathId);
  request.input("NodeName", sql.NVarChar(255), nodeName);
  request.input("NodeOrder", sql.Int, node.NodeOrder);
  request.input("Description", sql.NVarChar(sql.MAX), node.Description ?? null);
  request.input("IsActive", sql.Bit, toPathIsActiveBit(node.IsActive, 1));

  const result = await request.query(`
        INSERT INTO [dbo].[Path_Nodes] ([PathId], [NodeName], [NodeOrder], [Description], [IsActive])
        OUTPUT INSERTED.NodeId
        VALUES (@PathId, @NodeName, @NodeOrder, @Description, @IsActive)
    `);
  return result.recordset[0].NodeId;
};

const insertMaterial = async (material, nodeId) => {
  const request = new sql.Request();
  const materialUrl = material.MaterialUrl ?? material.Content ?? null;

  request.input("NodeId", sql.Int, Number(nodeId));
  request.input("MaterialType", sql.NVarChar(20), material.MaterialType);
  request.input("Title", sql.NVarChar(255), material.Title);
  request.input("MaterialUrl", sql.NVarChar(sql.MAX), materialUrl);
  request.input("MaterialOrder", sql.Int, Number(material.MaterialOrder));
  request.input("SourceType", sql.NVarChar(20), material.SourceType ?? null);
  request.input("FileName", sql.NVarChar(255), material.FileName ?? null);
  request.input(
    "FileSize",
    sql.BigInt,
    material.FileSize != null ? Number(material.FileSize) : null,
  );

  const result = await request.query(`
        INSERT INTO [dbo].[Node_Materials]
            ([NodeId], [MaterialType], [Title], [MaterialUrl], [MaterialOrder], [SourceType], [FileName], [FileSize])
        OUTPUT INSERTED.MaterialId AS MaterialId
        VALUES (@NodeId, @MaterialType, @Title, @MaterialUrl, @MaterialOrder, @SourceType, @FileName, @FileSize)
    `);
  return result.recordset[0].MaterialId;
};

const increaseCourseTotalLessons = async (courseId) => {
  const request = new sql.Request();
  request.input("courseId", sql.Int, Number(courseId));
  await request.query(`
        UPDATE dbo.Courses
        SET TotalLessons = ISNULL(TotalLessons, 0) + 1, UpdatedAt = GETDATE()
        WHERE CourseId = @courseId
    `);
};

function assertValidCourseContentPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('Cần ít nhất 1 chương.');
  }

  paths.forEach((path, pathIndex) => {
    const pathName = String(path.PathName ?? path.pathName ?? '').trim();
    if (!pathName) {
      throw new Error(`Chương ${pathIndex + 1}: thiếu PathName.`);
    }

    const nodes = path.nodes ?? path.Nodes ?? [];
    if (nodes.length === 0) {
      throw new Error(`Chương ${pathIndex + 1}: cần ít nhất 1 bài học (Path_Nodes).`);
    }

    nodes.forEach((node, nodeIndex) => {
      const nodeName = String(node.NodeName ?? node.nodeName ?? '').trim();
      if (!nodeName) {
        throw new Error(
          `Chương ${pathIndex + 1}, bài ${nodeIndex + 1}: thiếu NodeName (Path_Nodes.NodeName).`,
        );
      }

      const materials = node.materials ?? node.Materials ?? [];
      if (!Array.isArray(materials) || materials.length === 0) {
        throw new Error(
          `Chương ${pathIndex + 1}, bài ${nodeIndex + 1}: cần ít nhất 1 học liệu.`,
        );
      }
    });
  });
}

const buildPathsNodes = async (paths, courseId) => {
  assertValidCourseContentPaths(paths);

  for (const p of paths ?? []) {
    const pathId = await insertPath(p, courseId);
    const nodes = p.Nodes ?? p.nodes ?? [];
    for (const node of nodes) {
      const nodeId = await insertNode(node, pathId);
      await increaseCourseTotalLessons(courseId);
      const materials = node.Materials ?? node.materials ?? [];
      for (const m of materials) {
        await insertMaterial(m, nodeId);
      }
    }
  }
};

const createFinalCourse = async (course, paths) => {
  const newCourseId = await createCourseStepOne(course);
  if (course.Thumbnail) {
    const thumbnailPath = saveCourseThumbnailFromDataUrl(
      course.Thumbnail,
      newCourseId,
    );
    await updateCourseThumbnail(newCourseId, thumbnailPath);
  }
  await buildPathsNodes(paths, newCourseId);
  return newCourseId;
};

const replaceCourseContent = async (courseId, paths) => {
  await clearCourseContent(courseId);
  await buildPathsNodes(paths, courseId);
};

const getCourseInstructorId = async (courseId) => {
  const request = new sql.Request();
  request.input("courseId", sql.Int, Number(courseId));
  const result = await request.query(`
        SELECT InstructorId FROM Courses WHERE CourseId = @courseId
    `);
  return result.recordset[0]?.InstructorId ?? null;
};

const clearCourseContent = async (courseId) => {
  const request = new sql.Request();
  request.input("courseId", sql.Int, Number(courseId));

  await request.query(`
        DELETE un
        FROM User_Nodes un
        INNER JOIN Path_Nodes pn ON un.NodeId = pn.NodeId
        INNER JOIN Paths p ON pn.PathId = p.PathId
        WHERE p.CourseId = @courseId;

        DELETE nm
        FROM Node_Materials nm
        INNER JOIN Path_Nodes pn ON nm.NodeId = pn.NodeId
        INNER JOIN Paths p ON pn.PathId = p.PathId
        WHERE p.CourseId = @courseId;

        DELETE pn
        FROM Path_Nodes pn
        INNER JOIN Paths p ON pn.PathId = p.PathId
        WHERE p.CourseId = @courseId;

        DELETE FROM Paths WHERE CourseId = @courseId;

        UPDATE Courses
        SET TotalLessons = 0, UpdatedAt = GETDATE()
        WHERE CourseId = @courseId;
    `);
};

const getCourseStudentCount = async (courseId) => {
  const request = new sql.Request();
  request.input("courseId", sql.Int, Number(courseId));
  const result = await request.query(`
        SELECT COUNT(*) AS StudentCount
        FROM User_Courses
        WHERE CourseId = @courseId
    `);
  return Number(result.recordset[0]?.StudentCount ?? 0) || 0;
};

const updateCourseById = async (courseId, course) => {
  const request = new sql.Request();
  request.input("CourseId", sql.Int, Number(courseId));
  request.input("CourseName", sql.NVarChar(200), course.CourseName);
  request.input("Description", sql.NVarChar(sql.MAX), course.Description);
  request.input("CategoryId", sql.Int, Number(course.CategoryId));
  request.input("LevelId", sql.Int, Number(course.LevelId));
  request.input("IsPublished", sql.Bit, course.IsPublished ?? false);

  const result = await request.query(`
        UPDATE Courses
        SET CourseName = @CourseName,
            Description = @Description,
            CategoryId = @CategoryId,
            LevelId = @LevelId,
            IsPublished = @IsPublished,
            UpdatedAt = GETDATE()
        OUTPUT INSERTED.CourseId
        WHERE CourseId = @CourseId
    `);

  return result.recordset[0]?.CourseId ?? null;
};

// update Thumbnail
const updateCourseThumbnail = async (courseId, thumbnailPath) => {
  const request = new sql.Request();

  request.input("CourseId", sql.Int, courseId);
  request.input("Thumbnail", sql.NVarChar(500), thumbnailPath);

  await request.query(`
        UPDATE Courses
        SET Thumbnail = @Thumbnail,
            UpdatedAt = GETDATE()
        WHERE CourseId = @CourseId
    `);
};

const assertCourseCanPublish = async (courseId) => {
  const request = new sql.Request();
  request.input("CourseId", sql.Int, Number(courseId));

  const result = await request.query(`
        SELECT COUNT(*) AS PublishedPathCount
        FROM dbo.Paths
        WHERE CourseId = @CourseId
          AND ISNULL(IsActive, 1) = 1
    `);

  if (Number(result.recordset[0]?.PublishedPathCount ?? 0) < 1) {
    const error = new Error(
      "Khóa học cần ít nhất 1 chương được xuất bản trước khi xuất bản.",
    );
    error.statusCode = 400;
    throw error;
  }
};

// set course => publish
const setPublishCourse = async (courseId) => {
  const request = new sql.Request();

  request.input("CourseId", sql.Int, Number(courseId));

  const result = await request.query(`
        UPDATE dbo.Courses
        SET 
            UpdatedAt = GETDATE(),
            IsPublished = 1
        OUTPUT inserted.CourseId
        WHERE CourseId = @CourseId
    `);

  return result.recordset[0]?.CourseId || null;
};

// set course  => draft
const setDraftCourse = async (courseId) => {
  const request = new sql.Request();

  request.input("CourseId", sql.Int, Number(courseId));

  const result = await request.query(`
        UPDATE dbo.Courses
        SET 
            UpdatedAt = GETDATE(),
            IsPublished = 0
        OUTPUT inserted.CourseId
        WHERE CourseId = @CourseId
    `);

  return result.recordset[0]?.CourseId || null;
};

//  Hàm lấy danh sách bài học (Kèm trạng thái hoàn thành): dùng để lấy toàn bộ lộ trình học của 1 khóa học
const getCourseLearningPath = async (courseId, userId) => {
  try {
    const query = `
             SELECT 
                p.PathId,
                p.PathName,
                p.Description AS PathDescription,
                pn.NodeId,
                pn.NodeName,
                pn.Description AS NodeDescription,
                pn.NodeOrder,
                nm.MaterialType,
                nm.MaterialUrl,
                CAST(CASE WHEN un.NodeId IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS IsCompleted,
                CAST(CASE WHEN EXISTS (
                    SELECT 1 FROM dbo.Test_Attempts ta
                    JOIN dbo.Tests t ON ta.TestId = t.TestId
                    WHERE t.PathId = p.PathId AND ta.UserId = @userId AND ta.IsPass = 1
                ) THEN 1 ELSE 0 END AS BIT) AS IsTestPassed
            FROM Paths p
            LEFT JOIN Path_Nodes pn ON p.PathId = pn.PathId
            LEFT JOIN Node_Materials nm ON pn.NodeId = nm.NodeId
            LEFT JOIN User_Nodes un ON pn.NodeId = un.NodeId AND un.UserId = @userId
            WHERE p.CourseId = @courseId
              AND ISNULL(p.IsActive, 1) = 1
              AND (pn.NodeId IS NULL OR ISNULL(pn.IsActive, 1) = 1)
            ORDER BY p.[Order], pn.NodeOrder, nm.MaterialOrder
        `;
    const result = await new sql.Request()
      .input("courseId", sql.Int, courseId)
      .input("userId", sql.Int, userId)
      .query(query);
    let finalModules = [];
    result.recordset.forEach((row) => {
      // Tìm Chương (Path) dựa vào PathId
      let existingModule = finalModules.find((m) => m.PathId === row.PathId);

      // Nếu chưa có thì tạo mới
      if (!existingModule) {
        existingModule = {
          PathId: row.PathId,
          PathName: row.PathName,
          Description: row.PathDescription ?? null,
          IsTestPassed: row.IsTestPassed,
          lessons: [],
        };
        finalModules.push(existingModule);
      }
      // Nhét Bài học (Node) vào Chương — mỗi Node chỉ xuất hiện một lần
      if (row.NodeId) {
        const existingLesson = existingModule.lessons.find((l) => l.NodeId === row.NodeId);
        if (!existingLesson) {
          existingModule.lessons.push({
            NodeId: row.NodeId,
            NodeName: row.NodeName,
            Description: row.NodeDescription ?? null,
            NodeOrder: row.NodeOrder,
            MaterialType: row.MaterialType,
            MaterialUrl: row.MaterialUrl,
            IsCompleted: row.IsCompleted,
          });
        }
      }
    });

    return finalModules;
  } catch (error) {
    console.error("Lỗi lấy danh sách bài học:", error);
    throw error;
  }
};
// Hàm lưu tiến độ : chạy khi User ấn nút "Đánh dấu hoàn thành"
const markNodeAsCompleted = async (courseId, userId, nodeId) => {
  try {
    //LƯU TRẠNG THÁI BÀI HỌC VÀO User_Nodes
    const insertQuery = `
            IF NOT EXISTS (SELECT 1 FROM User_Nodes WHERE UserId = @userId AND NodeId = @nodeId)
            BEGIN
                INSERT INTO User_Nodes (UserId, NodeId, IsCompleted, CompletedAt)
                VALUES (@userId, @nodeId, 1, GETDATE());
            END
            ELSE
            BEGIN
                UPDATE User_Nodes
                SET IsCompleted = 1, CompletedAt = GETDATE()
                WHERE UserId = @userId AND NodeId = @nodeId;
            END
        `;
    await new sql.Request()
      .input("userId", sql.Int, userId)
      .input("nodeId", sql.Int, nodeId)
      .query(insertQuery);
    // TÍNH LẠI % TIẾN ĐỘ TỔNG BẰNG CÁCH ĐẾM THỰC TẾ
    const updateProgressQuery = `
            DECLARE @Total INT = (
                SELECT COUNT(pn.NodeId) 
                FROM Path_Nodes pn
                JOIN Paths p ON pn.PathId = p.PathId
                WHERE p.CourseId = @courseId
                  AND ISNULL(pn.IsActive, 1) = 1
                  AND ISNULL(p.IsActive, 1) = 1
            );
            DECLARE @Completed INT = (
                SELECT COUNT(un.NodeId) 
                FROM User_Nodes un
                JOIN Path_Nodes pn ON un.NodeId = pn.NodeId
                JOIN Paths p ON pn.PathId = p.PathId
                WHERE un.UserId = @userId AND p.CourseId = @courseId
                  AND ISNULL(pn.IsActive, 1) = 1
                  AND ISNULL(p.IsActive, 1) = 1
            );
            
            DECLARE @Percent INT = 0;
            IF @Total > 0
                SET @Percent = (@Completed * 100) / @Total;
                
            UPDATE User_Courses 
            SET ProgressPercentage = @Percent 
            WHERE UserId = @userId AND CourseId = @courseId;
            
            SELECT @Percent as NewProgress;
        `;
    const result = await new sql.Request()
      .input("courseId", sql.Int, courseId)
      .input("userId", sql.Int, userId)
      .query(updateProgressQuery);
    return result.recordset[0].NewProgress;
  } catch (error) {
    console.error("Lỗi đánh dấu hoàn thành:", error);
    throw error;
  }
};
module.exports = {
  getCoursesByUserRole,
  getCourseById,
  getCourseChaptersOutline,
  createCourseStepOne,
  createFinalCourse,
  getStudentCoursesList,
  getMyEnrolledCourses,
  enrollCourse,
  setDraftCourse,
  assertCourseCanPublish,
  setPublishCourse,
  getCourseLearningPath,
  markNodeAsCompleted,
  getCourseInstructorId,
  getCourseStudentCount,
  updateCourseById,
  replaceCourseContent,
  updateCourseThumbnail,
  getFeaturedCourses,
  getFeaturedPaths,
  getContinueCourse,
};
