const { sql } = require('../config/db');

// Hàm tạo một lượt làm bài mới
const createTestAttempt = async (userId, testId, remainingSeconds) => {
    const request = new sql.Request();
    request.input('userId', sql.Int, userId);
    request.input('testId', sql.Int, testId);

    // Tính thời gian hết hạn
    const expiresAt = new Date(Date.now() + remainingSeconds * 1000);
    request.input('expiresAt', sql.DateTime, expiresAt);

    // Vì AttemptId là INT tự tăng, ta không truyền ID vào mà dùng OUTPUT INSERTED để lấy ID mới tạo
    const result = await request.query(`
        INSERT INTO dbo.Test_Attempts (UserId, TestId, Point, StartedAt, ExpiresAt, Status, IsPass)
        OUTPUT INSERTED.AttemptId
        VALUES (@userId, @testId, 0, GETDATE(), @expiresAt, 'in_progress', 0)
    `);

    return {
        attemptId: result.recordset[0].AttemptId.toString(),
        startedAt: new Date(),
        expiresAt: expiresAt,
        status: 'in_progress'
    };
};

// Cập nhật điểm và nộp bài
const submitTestAttemptModel = async (attemptId, score, status, isPass = 0) => {
    const request = new sql.Request();
    request.input('attemptId', sql.Int, Number(attemptId));
    request.input('score', sql.Decimal(18, 2), score);
    request.input('status', sql.VarChar, status);
    request.input('isPass', sql.Bit, isPass);

    await request.query(`
        UPDATE dbo.Test_Attempts 
        SET Point = @score, Status = @status, IsPass = @isPass, SubmittedAt = GETDATE()
        WHERE AttemptId = @attemptId
    `);
    return true;
};

const getTestAttemptsHistory = async (userId, testId) => {
    const request = new sql.Request();
    request.input('userId', sql.Int, Number(userId));
    request.input('testId', sql.Int, Number(testId));
    const result = await request.query(`
        SELECT AttemptId, StartedAt, SubmittedAt, Status, Point, IsPass, ScorePercentage 
        FROM dbo.Test_Attempts
        WHERE UserId = @userId AND TestId = @testId AND Status = 'submitted'
        ORDER BY AttemptId DESC
    `);
    return result.recordset;
};
const getTestIdByCourseAndPath = async (courseId, pathId) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    request.input('pathId', sql.Int, Number(pathId));
    const result = await request.query(`
        SELECT TOP 1 TestId 
        FROM dbo.Tests 
        WHERE CourseId = @courseId AND PathId = @pathId
    `);
    // Nếu có bài test, trả về ID. Nếu không có trả về null
    return result.recordset.length > 0 ? result.recordset[0].TestId : null;
};

const getTestIdByCourseForFinal = async (courseId) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    const result = await request.query(`
        SELECT TOP 1 TestId
        FROM dbo.Tests
        WHERE CourseId = @courseId
          AND ISNULL(IsCourseTest, 0) = 1
    `);
    return result.recordset.length > 0 ? result.recordset[0].TestId : null;
};
// Lấy thông tin TestId, CourseId, PathId từ AttemptId

const getTestInfoByAttempt = async (attemptId) => {
    const request = new sql.Request();
    request.input('attemptId', sql.Int, Number(attemptId));
    const result = await request.query(`
        SELECT t.TestId, t.CourseId, t.PathId, ISNULL(t.IsCourseTest, 0) AS IsCourseTest
        FROM dbo.Test_Attempts ta
        INNER JOIN dbo.Tests t ON t.TestId = ta.TestId
        WHERE ta.AttemptId = @attemptId
    `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
};
// Đếm số lần học viên đã làm bài test này
const getAttemptCountByUserAndTest = async (userId, testId) => {
    const { sql } = require('../config/db');
    const request = new sql.Request();
    request.input('userId', sql.Int, userId);
    request.input('testId', sql.Int, testId);

    const result = await request.query(`
        SELECT COUNT(*) as count
        FROM dbo.Test_Attempts
        WHERE UserId = @userId AND TestId = @testId
    `);
    return result.recordset[0].count;
};

const getSubmittedAttemptCountByUserAndTest = async (userId, testId) => {
    const request = new sql.Request();
    request.input('userId', sql.Int, Number(userId));
    request.input('testId', sql.Int, Number(testId));

    const result = await request.query(`
        SELECT COUNT(*) AS count
        FROM dbo.Test_Attempts
        WHERE UserId = @userId
          AND TestId = @testId
          AND Status = 'submitted'
    `);
    return Number(result.recordset[0]?.count ?? 0);
};

const getLatestSubmittedAttemptId = async (userId, testId) => {
    const request = new sql.Request();
    request.input('userId', sql.Int, Number(userId));
    request.input('testId', sql.Int, Number(testId));

    const result = await request.query(`
        SELECT TOP 1 AttemptId
        FROM dbo.Test_Attempts
        WHERE UserId = @userId
          AND TestId = @testId
          AND Status = 'submitted'
        ORDER BY AttemptId DESC
    `);

    return result.recordset[0]?.AttemptId ?? null;
};

/** Lần làm gần nhất (submitted hoặc in_progress), không lọc theo Status */
const getLatestAttemptByUserAndTest = async (userId, testId) => {
    const request = new sql.Request();
    request.input('userId', sql.Int, Number(userId));
    request.input('testId', sql.Int, Number(testId));

    const result = await request.query(`
        SELECT TOP 1 AttemptId, StartedAt, SubmittedAt, Status
        FROM dbo.Test_Attempts
        WHERE UserId = @userId
          AND TestId = @testId
        ORDER BY AttemptId DESC
    `);

    return result.recordset[0] ?? null;
};

const getSectionStatsByUserAndTest = async (userId, testId) => {
    const request = new sql.Request();
    request.input('userId', sql.Int, Number(userId));
    request.input('testId', sql.Int, Number(testId));

    const result = await request.query(`
        SELECT
            s.AttemptSectionStatId,
            s.AttemptId,
            s.CourseId,
            s.PathId,
            s.TypeId,
            s.SkillType,
            s.SectionId,
            s.SectionTitle,
            s.CorrectCount,
            s.WrongCount,
            s.TotalCount,
            s.CreatedAt,
            p.PathName,
            p.[Order] AS PathOrder,
            ta.SubmittedAt,
            ta.StartedAt
        FROM dbo.Test_Attempt_Section_Stats s
        INNER JOIN dbo.Test_Attempts ta ON ta.AttemptId = s.AttemptId
        LEFT JOIN dbo.Paths p ON p.PathId = s.PathId
        WHERE ta.UserId = @userId
          AND ta.TestId = @testId
    `);

    return result.recordset ?? [];
};
// Lưu chi tiết lịch sử làm bài của học viên vào Database.
const saveTestAttemptAnswers = async (attemptId, questionResults) => {
    const { sql } = require('../config/db');
    const request = new sql.Request();

    // Nếu không có kết quả câu hỏi nào thì bỏ qua
    if (!questionResults || questionResults.length === 0) return true;
    let values = [];
    const safeAttemptId = Number(attemptId);
    for (const result of questionResults) {
        // Xử lý câu học viên bỏ trống (không chọn gì) -> gán mảng chứa giá trị null
        const choices = (result.userChoiceIds && result.userChoiceIds.length > 0)
            ? result.userChoiceIds
            : [null];

        const isCorrectBit = result.isCorrect ? 1 : 0;
        const qId = Number(result.questionId);
        for (const choiceId of choices) {
            // Nếu là null thì in chữ NULL ra cho câu SQL, ngược lại thì ép kiểu Số
            const cStr = choiceId === null ? 'NULL' : Number(choiceId);
            values.push(`(${safeAttemptId}, ${qId}, ${cStr}, ${isCorrectBit}, GETDATE())`);
        }
    }
    if (values.length > 0) {
        // Gộp lại thành 1 câu lệnh INSERT duy nhất
        const insertQuery = `
            INSERT INTO dbo.Test_Attempt_Answers (AttemptId, QuestionId, ChoiceId, IsCorrect, AnsweredAt)
            VALUES ${values.join(', ')};
        `;
        await request.query(insertQuery);
    }

    return true;
};
// lấy chi tiết các câu trả lời sai của học viên dựa vào AttemptId
const getWrongAnswersDetail = async (attemptId) => {
    const { sql } = require('../config/db');
    const request = new sql.Request();
    request.input('attemptId', sql.Int, Number(attemptId));

    const result = await request.query(`
        SELECT 
            t.PathId AS ChapterId,
            p.PathName AS ChapterName,
            q.SectionId,
            qs.Title AS SectionTitle,
            q.QuestionId,
            q.Title AS QuestionTitle,
            taa.ChoiceId AS UserChoiceId,
            qc.Title AS UserChoiceText,
            taa.IsCorrect
        FROM dbo.Test_Attempt_Answers taa
        JOIN dbo.Questions q ON taa.QuestionId = q.QuestionId
        JOIN dbo.Question_Sections qs ON q.SectionId = qs.SectionId
        JOIN dbo.Test_Attempts ta ON taa.AttemptId = ta.AttemptId
        JOIN dbo.Tests t ON ta.TestId = t.TestId
        LEFT JOIN dbo.Paths p ON t.PathId = p.PathId
        LEFT JOIN dbo.Question_Choices qc ON taa.ChoiceId = qc.ChoiceId
        WHERE taa.AttemptId = @attemptId 
          
    `);

    return result.recordset;
};

const saveAttemptSectionStats = async (attemptId, courseId, rows = []) => {
    if (!rows.length) return true;

    const request = new sql.Request();
    const safeAttemptId = Number(attemptId);
    const safeCourseId = Number(courseId);

    await request.query(`
        DELETE FROM dbo.Test_Attempt_Section_Stats
        WHERE AttemptId = ${safeAttemptId}
    `);

    const values = rows.map((row) => {
        const title = String(row.sectionTitle ?? '')
            .replace(/'/g, "''")
            .slice(0, 255);
        const titleSql = title ? `N'${title}'` : 'NULL';

        return `(${safeAttemptId}, ${safeCourseId}, ${Number(row.pathId)}, ${Number(row.typeId)}, '${String(row.skillType).replace(/'/g, "''")}', ${Number(row.sectionId)}, ${titleSql}, ${Number(row.correctCount) || 0}, ${Number(row.wrongCount) || 0}, ${Number(row.totalCount) || 0})`;
    });

    await request.query(`
        INSERT INTO dbo.Test_Attempt_Section_Stats (
            AttemptId, CourseId, PathId, TypeId, SkillType, SectionId, SectionTitle,
            CorrectCount, WrongCount, TotalCount
        )
        VALUES ${values.join(', ')}
    `);

    return true;
};

const getAttemptSectionStats = async (attemptId) => {
    const request = new sql.Request();
    request.input('attemptId', sql.Int, Number(attemptId));
    const result = await request.query(`
        SELECT
            s.AttemptSectionStatId,
            s.AttemptId,
            s.CourseId,
            s.PathId,
            s.TypeId,
            s.SkillType,
            s.SectionId,
            s.SectionTitle,
            s.CorrectCount,
            s.WrongCount,
            s.TotalCount,
            s.CreatedAt,
            p.PathName,
            p.[Order] AS PathOrder
        FROM dbo.Test_Attempt_Section_Stats s
        LEFT JOIN dbo.Paths p ON p.PathId = s.PathId
        WHERE s.AttemptId = @attemptId
        ORDER BY s.TypeId, s.PathId, s.SectionId
    `);
    return result.recordset;
};

module.exports = {
    createTestAttempt,
    submitTestAttemptModel,
    getTestIdByCourseAndPath,
    getTestIdByCourseForFinal,
    getTestInfoByAttempt,
    getAttemptCountByUserAndTest,
    getSubmittedAttemptCountByUserAndTest,
    getLatestSubmittedAttemptId,
    getLatestAttemptByUserAndTest,
    getSectionStatsByUserAndTest,
    getTestAttemptsHistory,
    saveTestAttemptAnswers,
    getWrongAnswersDetail,
    saveAttemptSectionStats,
    getAttemptSectionStats,
};