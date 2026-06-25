const { sql } = require('../config/db');

const getCourseComments = async (courseId) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    const result = await request.query(`
        SELECT cc.CommentId,
               cc.CourseId,
               cc.UserId,
               cc.Rating,
               cc.Content,
               cc.CreatedAt,
               cc.ReplyContent,
               cc.ReplyAt,
               cc.ReplyByUserId,
               u.FullName,
               u.AvatarUrl,
               ru.FullName AS ReplyByName,
               CASE WHEN cc.UserId = c.InstructorId THEN 1 ELSE 0 END AS IsInstructor
        FROM Course_Comments cc
        INNER JOIN Users u ON u.UserId = cc.UserId
        INNER JOIN Courses c ON c.CourseId = cc.CourseId
        LEFT JOIN Users ru ON ru.UserId = cc.ReplyByUserId
        WHERE cc.CourseId = @courseId
        ORDER BY cc.CreatedAt DESC
    `);
    return result.recordset;
};

const createCourseComment = async ({ courseId, userId, rating, content }) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    request.input('userId', sql.Int, Number(userId));
    request.input('rating', sql.TinyInt, rating ?? null);
    request.input('content', sql.NVarChar(sql.MAX), String(content).trim());

    const result = await request.query(`
        INSERT INTO Course_Comments (CourseId, UserId, Rating, Content, CreatedAt)
        OUTPUT INSERTED.CommentId, INSERTED.CourseId, INSERTED.UserId, INSERTED.Rating, INSERTED.Content, INSERTED.CreatedAt
        VALUES (@courseId, @userId, @rating, @content, GETDATE())
    `);

    const row = result.recordset[0];
    const userReq = new sql.Request();
    userReq.input('userId', sql.Int, Number(userId));
    userReq.input('courseId', sql.Int, Number(courseId));
    const userResult = await userReq.query(`
        SELECT u.FullName, u.AvatarUrl,
               CASE WHEN u.UserId = c.InstructorId THEN 1 ELSE 0 END AS IsInstructor
        FROM Users u
        INNER JOIN Courses c ON c.CourseId = @courseId
        WHERE u.UserId = @userId
    `);

    return {
        ...row,
        FullName: userResult.recordset[0]?.FullName ?? 'Học viên',
        AvatarUrl: userResult.recordset[0]?.AvatarUrl ?? null,
        IsInstructor: userResult.recordset[0]?.IsInstructor ?? 0,
    };
};

const replyToCourseComment = async ({ courseId, commentId, mentorUserId, replyContent }) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    request.input('commentId', sql.Int, Number(commentId));
    request.input('mentorUserId', sql.Int, Number(mentorUserId));
    request.input('replyContent', sql.NVarChar(sql.MAX), String(replyContent).trim());

    const result = await request.query(`
        UPDATE cc
        SET ReplyContent = @replyContent,
            ReplyAt = GETDATE(),
            ReplyByUserId = @mentorUserId
        OUTPUT INSERTED.CommentId,
               INSERTED.CourseId,
               INSERTED.UserId,
               INSERTED.Rating,
               INSERTED.Content,
               INSERTED.CreatedAt,
               INSERTED.ReplyContent,
               INSERTED.ReplyAt,
               INSERTED.ReplyByUserId
        FROM Course_Comments cc
        WHERE cc.CommentId = @commentId
          AND cc.CourseId = @courseId
    `);

    const row = result.recordset[0];
    if (!row) return null;

    const userReq = new sql.Request();
    userReq.input('userId', sql.Int, Number(row.UserId));
    userReq.input('mentorUserId', sql.Int, Number(mentorUserId));
    userReq.input('courseId', sql.Int, Number(courseId));
    const userResult = await userReq.query(`
        SELECT u.FullName, u.AvatarUrl, m.FullName AS ReplyByName,
               CASE WHEN u.UserId = c.InstructorId THEN 1 ELSE 0 END AS IsInstructor
        FROM Users u
        CROSS JOIN Users m
        INNER JOIN Courses c ON c.CourseId = @courseId
        WHERE u.UserId = @userId AND m.UserId = @mentorUserId
    `);

    return {
        ...row,
        FullName: userResult.recordset[0]?.FullName ?? 'Học viên',
        AvatarUrl: userResult.recordset[0]?.AvatarUrl ?? null,
        ReplyByName: userResult.recordset[0]?.ReplyByName ?? 'Mentor',
        IsInstructor: userResult.recordset[0]?.IsInstructor ?? 0,
    };
};

module.exports = {
    getCourseComments,
    createCourseComment,
    replyToCourseComment,
};
