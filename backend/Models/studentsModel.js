const { sql } = require('../config/db.js');

const getStudentsInCourseModel = async (courseId) => {
    const request = new sql.Request();

    request.input('courseId', sql.Int, Number(courseId));

    const result = await request.query(`
    SELECT
      uc.UserId,
      u.FullName,
      u.Email,
      u.AvatarUrl,
      uc.CourseId,
      uc.ProgressPercentage,
      uc.EnrollmentDate,
      COALESCE(next_lesson.NodeName, last_lesson.NodeName) AS CurrentLessonName,
      COALESCE(next_lesson.PathName, last_lesson.PathName) AS CurrentChapterName,
      activity.LastAccessedAt,
      CASE
        WHEN uc.ProgressPercentage = 100 THEN activity.LastAccessedAt
        ELSE NULL
      END AS CompletedAt
    FROM [LearningPath_Base].[dbo].[User_Courses] uc
    INNER JOIN [LearningPath_Base].[dbo].[Users] u
      ON uc.UserId = u.UserId
    OUTER APPLY (
      SELECT TOP 1
        pn.NodeName,
        p.PathName
      FROM [LearningPath_Base].[dbo].[Paths] p
      INNER JOIN [LearningPath_Base].[dbo].[Path_Nodes] pn
        ON pn.PathId = p.PathId
      WHERE p.CourseId = uc.CourseId
        AND ISNULL(p.IsActive, 1) = 1
        AND ISNULL(pn.IsActive, 1) = 1
        AND NOT EXISTS (
          SELECT 1
          FROM [LearningPath_Base].[dbo].[User_Nodes] un
          WHERE un.UserId = uc.UserId
            AND un.NodeId = pn.NodeId
        )
      ORDER BY p.[Order], pn.NodeOrder
    ) next_lesson
    OUTER APPLY (
      SELECT TOP 1
        pn.NodeName,
        p.PathName
      FROM [LearningPath_Base].[dbo].[User_Nodes] un
      INNER JOIN [LearningPath_Base].[dbo].[Path_Nodes] pn
        ON un.NodeId = pn.NodeId
      INNER JOIN [LearningPath_Base].[dbo].[Paths] p
        ON pn.PathId = p.PathId
      WHERE un.UserId = uc.UserId
        AND p.CourseId = uc.CourseId
        AND ISNULL(pn.IsActive, 1) = 1
        AND ISNULL(p.IsActive, 1) = 1
      ORDER BY
        CASE WHEN un.CompletedAt IS NULL THEN 0 ELSE 1 END DESC,
        un.CompletedAt DESC,
        p.[Order] DESC,
        pn.NodeOrder DESC
    ) last_lesson
    OUTER APPLY (
      SELECT MAX(un.CompletedAt) AS LastAccessedAt
      FROM [LearningPath_Base].[dbo].[User_Nodes] un
      INNER JOIN [LearningPath_Base].[dbo].[Path_Nodes] pn
        ON un.NodeId = pn.NodeId
      INNER JOIN [LearningPath_Base].[dbo].[Paths] p
        ON pn.PathId = p.PathId
      WHERE un.UserId = uc.UserId
        AND p.CourseId = uc.CourseId
    ) activity
    WHERE uc.CourseId = @courseId
    ORDER BY uc.EnrollmentDate DESC
  `);

    return result.recordset;
};
async function getCompletionDates(userId) {
  const request = new sql.Request();

  request.input("userId", sql.Int, userId);

  const result = await request.query(`
        SELECT DISTINCT CONVERT(varchar(10), CompletedAt, 23) AS d
        FROM User_Nodes
        WHERE UserId = @userId
          AND IsCompleted = 1
        ORDER BY d DESC;
    `);

  return result.recordset.map((r) => r.d);
}

module.exports = {
    getStudentsInCourseModel,
    getCompletionDates
}