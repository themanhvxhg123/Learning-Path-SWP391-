const { sql } = require('../config/db');

const getCourseComments = async (courseId) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    const result = await request.query(`
        SELECT cc.CommentId,
               cc.CourseId,
               cc.UserId,
               COALESCE(cc.Rating, (SELECT TOP 1 Rating FROM Course_Comments sub WHERE sub.UserId = cc.UserId AND sub.CourseId = cc.CourseId AND sub.Rating IS NOT NULL ORDER BY CreatedAt DESC)) AS Rating,
               cc.Content,
               cc.CreatedAt,
               cc.ParentCommentId,
               cc.EditCount,
               u.FullName,
               u.AvatarUrl,
               CASE WHEN cc.UserId = c.InstructorId THEN 1 ELSE 0 END AS IsInstructor,
               ISNULL((
                   SELECT CASE WHEN T.Total > 0 THEN (C.Completed * 100) / T.Total ELSE 0 END
                   FROM 
                   (SELECT COUNT(*) AS Total FROM Path_Nodes pn JOIN Paths p ON pn.PathId = p.PathId WHERE p.CourseId = c.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) T,
                   (SELECT COUNT(*) AS Completed FROM User_Nodes un JOIN Path_Nodes pn ON un.NodeId = pn.NodeId JOIN Paths p ON pn.PathId = p.PathId WHERE un.UserId = cc.UserId AND p.CourseId = c.CourseId AND ISNULL(pn.IsActive, 1) = 1 AND ISNULL(p.IsActive, 1) = 1) C
               ), 0) AS ProgressPercentage
        FROM Course_Comments cc
        INNER JOIN Users u ON u.UserId = cc.UserId
        INNER JOIN Courses c ON c.CourseId = cc.CourseId
        WHERE cc.CourseId = @courseId
        ORDER BY cc.CreatedAt DESC
    `);
    return result.recordset;
};

const createCourseComment = async ({ courseId, userId, rating, content, parentCommentId = null }) => {
    let insertedId;

    if (parentCommentId === null) {
        // KIỂM TRA ĐÁNH GIÁ 1 LẦN: Nếu là bình luận gốc CÓ ĐÁNH GIÁ SAO
        // thì kiểm tra xem học viên đã từng đánh giá (có sao) khóa này chưa.
        const checkReq = new sql.Request();
        checkReq.input('courseId', sql.Int, Number(courseId));
        checkReq.input('userId', sql.Int, Number(userId));

        const checkResult = await checkReq.query(`
            SELECT CommentId, EditCount FROM Course_Comments 
WHERE CourseId = @courseId AND UserId = @userId AND ParentCommentId IS NULL
        `);

        if (checkResult.recordset.length > 0) {
            //Kiểm tra số lần sửa
            if (checkResult.recordset[0].EditCount >= 1) {
                throw new Error('Bạn chỉ được sửa đánh giá 1 lần duy nhất!');
            }

            // Nếu chưa sửa thì tiến hành CẬP NHẬT lại nội dung, số sao, và cộng EditCount
            insertedId = checkResult.recordset[0].CommentId;
            const updateReq = new sql.Request();
            updateReq.input('commentId', sql.Int, insertedId);
            updateReq.input('rating', sql.TinyInt, rating ?? null);
            updateReq.input('content', sql.NVarChar(sql.MAX), String(content).trim());

            await updateReq.query(`
                UPDATE Course_Comments
                SET Rating = @rating, Content = @content, CreatedAt = GETUTCDATE(), EditCount = EditCount + 1
                WHERE CommentId = @commentId
            `);
        }
    }

    if (!insertedId) {
        // THÊM MỚI: Dành cho Câu Trả Lời (hoặc Đánh giá gốc nếu chưa từng đánh giá)
        const request = new sql.Request();
        request.input('courseId', sql.Int, Number(courseId));
        request.input('userId', sql.Int, Number(userId));
        request.input('rating', sql.TinyInt, rating ?? null);
        request.input('content', sql.NVarChar(sql.MAX), String(content).trim());
        request.input('parentCommentId', sql.Int, parentCommentId);

        // SỬA UTC: Dùng GETUTCDATE()
        const result = await request.query(`
            INSERT INTO Course_Comments (CourseId, UserId, Rating, Content, CreatedAt, ParentCommentId)
            OUTPUT INSERTED.CommentId
            VALUES (@courseId, @userId, @rating, @content, GETUTCDATE(), @parentCommentId)
        `);
        insertedId = result.recordset[0].CommentId;
    }

    // Lấy lại dòng dữ liệu vừa Thêm/Sửa để gởi trả về cho Frontend
    const fetchReq = new sql.Request();
    fetchReq.input('commentId', sql.Int, insertedId);

    const fetchResult = await fetchReq.query(`
        SELECT cc.CommentId, cc.CourseId, cc.UserId, 
               COALESCE(cc.Rating, (SELECT TOP 1 Rating FROM Course_Comments sub WHERE sub.UserId = cc.UserId AND sub.CourseId = cc.CourseId AND sub.Rating IS NOT NULL ORDER BY CreatedAt DESC)) AS Rating, 
               cc.Content, cc.CreatedAt, cc.ParentCommentId, cc.EditCount
        FROM Course_Comments cc
        WHERE cc.CommentId = @commentId
    `);
    // TÍNH TOÁN LẠI ĐIỂM TRUNG BÌNH CỦA KHÓA HỌC
    const avgReq = new sql.Request();
    avgReq.input('courseId', sql.Int, Number(courseId));
    await avgReq.query(`
        UPDATE Courses
        SET Rating = (
            SELECT ISNULL(ROUND(AVG(CAST(Rating AS FLOAT)), 1), 0)
            FROM Course_Comments
            WHERE CourseId = @courseId AND ParentCommentId IS NULL AND Rating IS NOT NULL
        )
        WHERE CourseId = @courseId
    `);

    const row = fetchResult.recordset[0];

    // Lấy thêm thông tin User (Tên, Avatar)
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

module.exports = {
    getCourseComments,
    createCourseComment,
};
