const { sql } = require('../config/db');
const {
    TYPE_ID_TO_SKILL,
    SQL_SKILL_TYPE_FROM_TYPE_ID,
} = require('../utils/sectionSkillType');

const questionBankService = require('../services/questionBankService');


const getAllListQuestionBankByMentorId = async (mentorId) => {
    try {
        const request = new sql.Request();
        request.input('mentorId', sql.Int, Number(mentorId));
        const result = await request.query(`
            SELECT
                c.CourseId,
                qb.BankId,
                c.CourseName,
                c.Description AS CourseDescription,
                COUNT(DISTINCT CASE WHEN q.IsActive = 1 THEN q.QuestionId END) AS TotalQuestion,
                COUNT(DISTINCT CASE
                    WHEN q.IsActive = 1
                     AND ISNULL(qs.IsUseForTest, 1) = 1
                     AND ISNULL(q.IsUseForTest, 1) = 1
                    THEN q.QuestionId
                END) AS TotalQuestionIsPublic,
                COUNT(DISTINCT CASE
                    WHEN q.IsActive = 1
                     AND (
                        ISNULL(qs.IsUseForTest, 1) = 0
                        OR ISNULL(q.IsUseForTest, 1) = 0
                     )
                    THEN q.QuestionId
                END) AS TotalDraftQuestion,
                COUNT(DISTINCT CASE WHEN q.IsActive = 1 THEN qp.PathId END) AS PathHasQuestion,
                (
                    SELECT COUNT(*)
                    FROM dbo.Paths p
                    WHERE p.CourseId = c.CourseId
                ) AS TotalPath,
                qb.UpdatedAt,
                c.IsPublished,
                c.Thumbnail
            FROM dbo.Question_Bank qb
            INNER JOIN dbo.Courses c ON c.CourseId = qb.CourseId
            LEFT JOIN dbo.Questions_Path qp ON qp.BankId = qb.BankId
            LEFT JOIN dbo.Question_Sections qs ON qs.Question_Path_Id = qp.Question_Path_Id
            LEFT JOIN dbo.Questions q ON q.SectionId = qs.SectionId
            WHERE qb.InstructorId = @mentorId
            GROUP BY
                c.CourseId,
                qb.BankId,
                c.CourseName,
                c.Description,
                qb.UpdatedAt,
                c.IsPublished,
                c.Thumbnail
            ORDER BY qb.UpdatedAt DESC, c.CourseId DESC
        `);
        return result.recordset;
    } catch (error) {
        console.error(error.message);
        return [];
    }

};

// normalization data from sql return at function getAllQuestionOfPathModel
// const normalizationDataGetAllQuestionPathModel

// get all question of path by path's id
const getAllSectionPathModel = async (pathId) => {
    try {
        const request = new sql.Request();
        request.input('pathId', sql.Int, Number(pathId));
        const result = await request.query(`
SELECT
    qs.TypeId,
    qs.[Order],
    qs.SectionId,
    qs.SectionName,
    qs.Title AS SectionTitle,
    qs.SourceUrl,
    qs.IsUseForTest,
    JSON_QUERY((
        SELECT
            q.QuestionId,
            q.Title AS QuestionText,
            q.[Order] AS QuestionOrder,
            q.[IsUseForTest],
            JSON_QUERY((
                SELECT
                    qc.ChoiceId,
                    qc.Title AS ChoiceText,
                    qc.[Order] AS ChoiceOrder,
                    qc.IsTrue
                FROM dbo.Question_Choices qc
                WHERE qc.QuestionId = q.QuestionId
                ORDER BY
                    qc.[Order],
                    qc.ChoiceId
                FOR JSON PATH
            )) AS Choices

        FROM dbo.Questions q
        WHERE q.SectionId = qs.SectionId
        ORDER BY
            q.[Order],
            q.QuestionId
        FOR JSON PATH
    )) AS Questions

FROM dbo.Questions_Path qp
INNER JOIN dbo.Question_Sections qs
    ON qs.Question_Path_Id = qp.Question_Path_Id

WHERE qp.PathId = @pathId

ORDER BY
    qs.TypeId,
    qs.[Order],
    qs.SectionId;
        `);
        return questionBankService.normalizationDataQuestionPathModel(result.recordset);
    } catch (error) {
        console.error(error.message);
        return [];
    }
}

const ACTIVE_QUESTION_WHERE = `
    q.IsActive = 1
    AND ISNULL(q.IsUseForTest, 1) = 1
    AND ISNULL(qs.IsUseForTest, 1) = 1
    AND LTRIM(RTRIM(ISNULL(q.Title, ''))) <> ''
`;

const getChapterQuestionPathId = async (courseId, pathId) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    request.input('pathId', sql.Int, Number(pathId));
    const result = await request.query(`
        SELECT TOP 1 qp.Question_Path_Id AS QuestionPathId
        FROM dbo.Questions_Path qp
        INNER JOIN dbo.Question_Bank qb
            ON qb.BankId = qp.BankId
        WHERE qp.PathId = @pathId
          AND qb.CourseId = @courseId
        ORDER BY qp.Question_Path_Id
    `);
    return result.recordset[0]?.QuestionPathId ?? null;
};

/**
 * Đếm số câu hỏi "dùng được" trong bank, gom theo chương (PathId) và loại section (TypeId → skill).
 *
 * Input:
 *   courseId — khóa học (lọc qua Question_Bank.CourseId)
 *   pathId   — tùy chọn; nếu có thì chỉ đếm trong một chương, null = mọi chương của khóa
 *
 * Output:
 *   recordset[] — mỗi dòng: PathId, TypeId, SkillType, ActiveCount
 *   (ActiveCount = số câu thỏa ACTIVE_QUESTION_WHERE: active, dùng trong đề, có title)
 *
 * Dùng trong getChapterQuestionBankActiveStats / getCourseQuestionBankActiveStats
 * để build questionCountBySkill (LISTENING, READING, VOCABULARY).
 */
const getActiveQuestionCountsByPath = async (courseId, pathId = null) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    // pathId null → thống kê cả khóa; có pathId → một chương
    let pathFilter = '';
    if (pathId != null) {
        request.input('pathId', sql.Int, Number(pathId));
        pathFilter = 'AND qp.PathId = @pathId';
    }

    const result = await request.query(`
        SELECT
            qp.PathId,
            qs.TypeId,
            ${SQL_SKILL_TYPE_FROM_TYPE_ID} AS SkillType,
            COUNT(*) AS ActiveCount
        FROM dbo.Questions q
        INNER JOIN dbo.Question_Sections qs
            ON qs.SectionId = q.SectionId
        INNER JOIN dbo.Questions_Path qp
            ON qp.Question_Path_Id = qs.Question_Path_Id
        INNER JOIN dbo.Question_Bank qb
            ON qb.BankId = qp.BankId
        INNER JOIN dbo.Section_Type st
            ON st.TypeId = qs.TypeId
        WHERE qb.CourseId = @courseId
          ${pathFilter}
          AND ${ACTIVE_QUESTION_WHERE}
        GROUP BY qp.PathId, qs.TypeId
    `);

    return result.recordset;
};

/**
 * Liệt kê từng section Nghe / Đọc và số câu active trong section (theo chương).
 *
 * Input:
 *   courseId — khóa học
 *   pathId   — tùy chọn; null = mọi chương, có giá trị = một chương
 *
 * Output:
 *   recordset[] — mỗi section một dòng: PathId, TypeId, SkillType, SectionId,
 *   SectionName, Title, SectionOrder, IsUseForTest, ActiveCount
 *
 * Chỉ TypeId IN (1, 2) — Nghe và Đọc (không gồm Từ vựng).
 * LEFT JOIN Questions: section không có câu vẫn trả về với ActiveCount = 0.
 */
const getActiveListeningReadingSectionCounts = async (courseId, pathId = null) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    let pathFilter = '';
    if (pathId != null) {
        request.input('pathId', sql.Int, Number(pathId));
        pathFilter = 'AND qp.PathId = @pathId';
    }

    const result = await request.query(`
        SELECT
            qp.PathId,
            qs.TypeId,
            ${SQL_SKILL_TYPE_FROM_TYPE_ID} AS SkillType,
            qs.SectionId,
            qs.SectionName,
            qs.Title,
            qs.[Order] AS SectionOrder,
            qs.IsUseForTest,
            COUNT(
                CASE
                    WHEN q.QuestionId IS NOT NULL
                     AND q.IsActive = 1
                     AND ISNULL(q.IsUseForTest, 1) = 1
                     AND ISNULL(qs.IsUseForTest, 1) = 1
                     AND LTRIM(RTRIM(ISNULL(q.Title, ''))) <> ''
                    THEN 1
                END
            ) AS ActiveCount
        FROM dbo.Question_Sections qs
        INNER JOIN dbo.Questions_Path qp
            ON qp.Question_Path_Id = qs.Question_Path_Id
        INNER JOIN dbo.Question_Bank qb
            ON qb.BankId = qp.BankId
        INNER JOIN dbo.Section_Type st
            ON st.TypeId = qs.TypeId
        LEFT JOIN dbo.Questions q
            ON q.SectionId = qs.SectionId
        WHERE qb.CourseId = @courseId
          ${pathFilter}
          AND qs.TypeId IN (1, 2)
        GROUP BY
            qp.PathId,
            qs.TypeId,
            qs.SectionId,
            qs.SectionName,
            qs.Title,
            qs.[Order],
            qs.IsUseForTest
        ORDER BY qp.PathId, qs.TypeId, qs.[Order], qs.SectionId
    `);

    return result.recordset;
};

/**
 * Liệt kê từng section Từ vựng và số câu active trong section (theo chương).
 *
 * Input:
 *   courseId — khóa học
 *   pathId   — tùy chọn; null = mọi chương, có giá trị = một chương
 *
 * Output:
 *   recordset[] — mỗi section một dòng: PathId, TypeId, SectionId,
 *   SectionName, Title, SectionOrder, IsUseForTest, ActiveCount
 *
 * Chỉ qs.TypeId = 3 (Từ vựng). Cùng quy tắc đếm câu active như Nghe/Đọc.
 * LEFT JOIN Questions: section trống vẫn có dòng, ActiveCount = 0.
 */
const getActiveVocabularySectionCounts = async (courseId, pathId = null) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    let pathFilter = '';
    if (pathId != null) {
        request.input('pathId', sql.Int, Number(pathId));
        pathFilter = 'AND qp.PathId = @pathId';
    }

    const result = await request.query(`
        SELECT
            qp.PathId,
            qs.TypeId,
            qs.SectionId,
            qs.SectionName,
            qs.Title,
            qs.[Order] AS SectionOrder,
            qs.IsUseForTest,
            COUNT(
                CASE
                    WHEN q.QuestionId IS NOT NULL
                     AND q.IsActive = 1
                     AND ISNULL(q.IsUseForTest, 1) = 1
                     AND ISNULL(qs.IsUseForTest, 1) = 1
                     AND LTRIM(RTRIM(ISNULL(q.Title, ''))) <> ''
                    THEN 1
                END
            ) AS ActiveCount
        FROM dbo.Question_Sections qs
        INNER JOIN dbo.Questions_Path qp
            ON qp.Question_Path_Id = qs.Question_Path_Id
        INNER JOIN dbo.Question_Bank qb
            ON qb.BankId = qp.BankId
        INNER JOIN dbo.Section_Type st
            ON st.TypeId = qs.TypeId
        LEFT JOIN dbo.Questions q
            ON q.SectionId = qs.SectionId
        WHERE qb.CourseId = @courseId
          ${pathFilter}
          AND qs.TypeId = 3
        GROUP BY
            qp.PathId,
            qs.TypeId,
            qs.SectionId,
            qs.SectionName,
            qs.Title,
            qs.[Order],
            qs.IsUseForTest
        ORDER BY qp.PathId, qs.[Order], qs.SectionId
    `);

    return result.recordset;
};

const getChapterQuestionBankActiveStats = async (courseId, pathId) => {
    const questionPathId = await getChapterQuestionPathId(courseId, pathId);
    const [countRows, lrSectionRows, vocabularyRows] = await Promise.all([
        getActiveQuestionCountsByPath(courseId, pathId),
        getActiveListeningReadingSectionCounts(courseId, pathId),
        getActiveVocabularySectionCounts(courseId, pathId),
    ]);

    const questionCountBySkill = {
        LISTENING: 0,
        READING: 0,
        VOCABULARY: 0,
    };

    countRows.forEach((row) => {
        const skill = TYPE_ID_TO_SKILL[Number(row.TypeId)] ?? row.SkillType;
        if (skill in questionCountBySkill) {
            questionCountBySkill[skill] += Number(row.ActiveCount) || 0;
        }
    });

    const totalActive = Object.values(questionCountBySkill).reduce((sum, count) => sum + count, 0);

    const listeningSectionGroups = [];
    const readingSectionGroups = [];
    lrSectionRows.forEach((row) => {
        const skill = TYPE_ID_TO_SKILL[Number(row.TypeId)] ?? row.SkillType;
        const group = {
            sectionTempId: `section_${row.SectionId}`,
            sectionTitle: String(row.Title ?? row.SectionName ?? '').trim() || 'Section',
            availableCount: Number(row.ActiveCount) || 0,
            isUseForTest: row.IsUseForTest == null ? true : Boolean(row.IsUseForTest),
        };
        if (skill === 'LISTENING') listeningSectionGroups.push(group);
        else if (skill === 'READING') readingSectionGroups.push(group);
    });

    const vocabularySectionGroups = vocabularyRows.map((row) => ({
        sectionTempId: `section_${row.SectionId}`,
        sectionTitle: String(row.Title ?? row.SectionName ?? '').trim() || 'Section',
        availableCount: Number(row.ActiveCount) || 0,
        isUseForTest: row.IsUseForTest == null ? true : Boolean(row.IsUseForTest),
    }));

    return {
        questionPathId,
        hasBank: questionPathId != null || totalActive > 0,
        questionCountBySkill,
        listeningSectionGroups: listeningSectionGroups,
        readingSectionGroups: readingSectionGroups,
        vocabularySectionGroups,
        totalActive,
    };
};

const getCourseQuestionBankActiveStats = async (courseId) => {
    const request = new sql.Request();
    request.input('courseId', sql.Int, Number(courseId));
    const pathsResult = await request.query(`
        SELECT
            p.PathId,
            p.PathName,
            p.[Order] AS PathOrder,
            qp.Question_Path_Id AS QuestionPathId
        FROM dbo.Paths p
        LEFT JOIN dbo.Question_Bank qb
            ON qb.CourseId = @courseId
        LEFT JOIN dbo.Questions_Path qp
            ON qp.BankId = qb.BankId
           AND qp.PathId = p.PathId
        WHERE p.CourseId = @courseId
        ORDER BY p.[Order], p.PathId
    `);

    const [countRows, lrSectionRows, vocabularyRows] = await Promise.all([
        getActiveQuestionCountsByPath(courseId),
        getActiveListeningReadingSectionCounts(courseId),
        getActiveVocabularySectionCounts(courseId),
    ]);
    const countsByPath = new Map();

    countRows.forEach((row) => {
        const pathKey = String(row.PathId);
        if (!countsByPath.has(pathKey)) {
            countsByPath.set(pathKey, {
                LISTENING: 0,
                READING: 0,
                VOCABULARY: 0,
            });
        }
        const bucket = countsByPath.get(pathKey);
        const skill = TYPE_ID_TO_SKILL[Number(row.TypeId)] ?? row.SkillType;
        if (skill in bucket) {
            bucket[skill] += Number(row.ActiveCount) || 0;
        }
    });

    const lrGroupsByPath = new Map();
    lrSectionRows.forEach((row) => {
        const pathKey = String(row.PathId);
        if (!lrGroupsByPath.has(pathKey)) {
            lrGroupsByPath.set(pathKey, { LISTENING: [], READING: [] });
        }
        const skill = TYPE_ID_TO_SKILL[Number(row.TypeId)] ?? row.SkillType;
        const bucket = lrGroupsByPath.get(pathKey);
        if (bucket[skill]) {
            bucket[skill].push({
                sectionId: row.SectionId,
                sectionTitle: String(row.Title ?? row.SectionName ?? '').trim() || 'Section',
                availableCount: Number(row.ActiveCount) || 0,
                isUseForTest: row.IsUseForTest == null ? true : Boolean(row.IsUseForTest),
            });
        }
    });

    const vocabularyGroupsByPath = new Map();
    vocabularyRows.forEach((row) => {
        const pathKey = String(row.PathId);
        if (!vocabularyGroupsByPath.has(pathKey)) {
            vocabularyGroupsByPath.set(pathKey, []);
        }
        vocabularyGroupsByPath.get(pathKey).push({
            sectionTempId: `section_${row.SectionId}`,
            sectionTitle: String(row.Title ?? row.SectionName ?? '').trim() || 'Section',
            availableCount: Number(row.ActiveCount) || 0,
            isUseForTest: row.IsUseForTest == null ? true : Boolean(row.IsUseForTest),
        });
    });

    const chapters = pathsResult.recordset.map((row) => {
        const pathKey = String(row.PathId);
        const questionCountBySkill = countsByPath.get(pathKey) ?? {
            LISTENING: 0,
            READING: 0,
            VOCABULARY: 0,
        };
        const totalActive = Object.values(questionCountBySkill).reduce((sum, count) => sum + count, 0);
        const hasBank = row.QuestionPathId != null || totalActive > 0;
        const lrGroups = lrGroupsByPath.get(pathKey) ?? { LISTENING: [], READING: [] };

        return {
            PathId: row.PathId,
            PathName: row.PathName,
            Order: row.PathOrder,
            hasBank,
            questionCountBySkill,
            listeningSectionGroups: lrGroups.LISTENING,
            readingSectionGroups: lrGroups.READING,
            vocabularySectionGroups: vocabularyGroupsByPath.get(pathKey) ?? [],
            totalActive,
        };
    });

    const bankCount = chapters.filter((chapter) => chapter.hasBank).length;
    const aggregatedSkill = {
        LISTENING: 0,
        READING: 0,
        VOCABULARY: 0,
    };

    chapters.forEach((chapter) => {
        Object.keys(aggregatedSkill).forEach((skill) => {
            aggregatedSkill[skill] += chapter.questionCountBySkill?.[skill] ?? 0;
        });
    });

    const totalActive = Object.values(aggregatedSkill).reduce((sum, count) => sum + count, 0);

    return {
        hasBank: bankCount > 0,
        bankCount,
        chapters,
        questionCountBySkill: aggregatedSkill,
        totalActive,
    };
};

// Update status of SECTION
const updateStatusSectionModel = async (sectionId, status) => {
    //     UPDATE [dbo].[Question_Sections]
    //    SET [IsUseForTest] = 
    //  WHERE [Question_Sections].SectionId = 
    const request = new sql.Request();
    request.input('sectionId', sql.Int, Number(sectionId));
    request.input('status', sql.Int, Number(courseId));
    await request.query(`
      UPDATE [dbo].[Question_Sections]
       SET [IsUseForTest] = @status
     WHERE [Question_Sections].SectionId = @sectionId`);
}
module.exports = {
    getAllListQuestionBankByMentorId,
    getChapterQuestionBankActiveStats,
    getCourseQuestionBankActiveStats,
    getAllSectionPathModel,
    updateStatusSectionModel
};
