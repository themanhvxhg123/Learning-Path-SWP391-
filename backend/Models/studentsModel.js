const { sql } = require('../config/db.js');

const getStudentsInCourseModel = async (courseId) => {
    const request = new sql.Request();

    request.input('courseId', sql.Int, Number(courseId));

    const result = await request.query(`
    SELECT 
      uc.UserId,
      u.FullName,
      u.Email,
      uc.CourseId,
      uc.ProgressPercentage,
      uc.EnrollmentDate
    FROM [LearningPath_Base].[dbo].[User_Courses] uc
    INNER JOIN [LearningPath_Base].[dbo].[Users] u
      ON uc.UserId = u.UserId
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