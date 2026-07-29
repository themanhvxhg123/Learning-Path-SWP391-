/**
 * testService — đọc ngân hàng câu hỏi phục vụ học viên làm bài kiểm tra.
 * (Section / câu hỏi theo chương — không dùng cho mentor CRUD question bank.)
 */

const { sql } = require('../config/db');
const { SQL_SKILL_TYPE_FROM_TYPE_ID } = require('../utils/sectionSkillType');

/**
 * Danh sách section trong một chương (path) của khóa.
 * Input: courseId, pathId
 * Output: recordset (SectionId, SkillType, QuestionCount, SourceUrl, …)
 */
async function getSectionsByPath(courseId, pathId) {
  const request = new sql.Request();
  request.input('courseId', sql.Int, Number(courseId));
  request.input('pathId', sql.Int, Number(pathId));
  const result = await request.query(`
        SELECT
            qp.Question_Path_Id AS QuestionPathId,
            qs.SectionId,
            qs.SectionName,
            qs.Title,
            qs.TypeId,
            ${SQL_SKILL_TYPE_FROM_TYPE_ID} AS SkillType,
            qs.[Order] AS SectionOrder,
            qs.SourceUrl,
            qs.IsUseForTest,
            COUNT(q.QuestionId) AS QuestionCount

        FROM dbo.Questions_Path qp
        INNER JOIN dbo.Question_Bank qb
            ON qb.BankId = qp.BankId
        INNER JOIN dbo.Question_Sections qs
            ON qs.Question_Path_Id = qp.Question_Path_Id
        INNER JOIN dbo.Section_Type st
            ON st.TypeId = qs.TypeId
        LEFT JOIN dbo.Questions q
            ON q.SectionId = qs.SectionId
           AND q.IsActive = 1
        WHERE qp.PathId = @pathId
          AND qb.CourseId = @courseId
        GROUP BY
            qp.Question_Path_Id,
            qs.SectionId,
            qs.SectionName,
            qs.Title,
            qs.TypeId,
            qs.[Order],
            qs.SourceUrl,
            qs.IsUseForTest
        ORDER BY qs.[Order], qs.SectionId
    `);
  return result.recordset;
}

/**
 * Câu hỏi + đáp án active trong một section.
 * Input: sectionId
 * Output: recordset (một dòng mỗi choice; group theo QuestionId ở tầng service paper)
 */
async function getQuestionsBySection(sectionId) {
  const request = new sql.Request();
  request.input('sectionId', sql.Int, Number(sectionId));
  const result = await request.query(`
        SELECT
            q.QuestionId,
            q.SectionId,
            q.Title,
            qs.TypeId,
            ${SQL_SKILL_TYPE_FROM_TYPE_ID} AS SkillType,
            qs.SourceUrl AS SourceUrl,
            q.[Order] AS QuestionOrder,
            q.IsActive,
            q.IsUseForTest,
            qc.ChoiceId,
            qc.Title AS ChoiceTitle,
            qc.[Order] AS ChoiceOrder,
            qc.IsTrue

        FROM dbo.Questions q
        INNER JOIN dbo.Question_Sections qs
            ON qs.SectionId = q.SectionId
        INNER JOIN dbo.Section_Type st
            ON st.TypeId = qs.TypeId
        LEFT JOIN dbo.Question_Choices qc
            ON qc.QuestionId = q.QuestionId
        WHERE q.SectionId = @sectionId
          AND q.IsActive = 1
        ORDER BY q.[Order], q.QuestionId, qc.[Order], qc.ChoiceId
    `);
  return result.recordset;
}

module.exports = {
  getSectionsByPath,
  getQuestionsBySection,
};
