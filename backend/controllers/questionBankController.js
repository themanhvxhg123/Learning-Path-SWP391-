const questionBankModel = require("../Models/questionBankModel");
const { sql } = require('../config/db');

const SKILL_LABEL_VI = { 1: 'Nghe', 2: 'Đọc', 3: 'Từ vựng/Ngữ pháp' };

async function getSectionPathMeta(sectionId) {
    const request = new sql.Request();
    request.input('sectionId', sql.Int, sectionId);
    const result = await request.query(`
        SELECT qs.TypeId, qs.IsUseForTest, qp.PathId
        FROM dbo.Question_Sections qs
        INNER JOIN dbo.Questions_Path qp ON qp.Question_Path_Id = qs.Question_Path_Id
        WHERE qs.SectionId = @sectionId
    `);
    return result.recordset[0] ?? null;
}

async function countInTestSectionsForSkill(pathId, typeId) {
    const request = new sql.Request();
    request.input('pathId', sql.Int, pathId);
    request.input('typeId', sql.Int, typeId);
    const result = await request.query(`
        SELECT COUNT(*) AS inTestCount
        FROM dbo.Question_Sections qs
        INNER JOIN dbo.Questions_Path qp ON qp.Question_Path_Id = qs.Question_Path_Id
        WHERE qp.PathId = @pathId
          AND qs.TypeId = @typeId
          AND ISNULL(qs.IsUseForTest, 0) = 1
    `);
    return Number(result.recordset[0]?.inTestCount) || 0;
}

/** Số section Nghe/Đọc quiz chương đang random lấy (sectionCount mentor). */
async function getQuizSectionPickCount(pathId, typeId) {
    const request = new sql.Request();
    request.input('pathId', sql.Int, pathId);
    request.input('typeId', sql.Int, typeId);
    const result = await request.query(`
        SELECT TOP 1 tcs.QuestionQuantity
        FROM dbo.Tests t
        INNER JOIN dbo.Test_Config tc ON tc.TestId = t.TestId
        INNER JOIN dbo.Test_Config_Section tcs ON tcs.ConfigId = tc.ConfigId
        WHERE t.PathId = @pathId
          AND ISNULL(t.IsCourseTest, 0) = 0
          AND ISNULL(t.IsActive, 0) = 1
          AND tcs.TypeId = @typeId
          AND tcs.BankSectionId IS NULL
    `);
    return Number(result.recordset[0]?.QuestionQuantity) || 0;
}

async function isVocabSectionConfiguredInQuiz(pathId, sectionId) {
    const request = new sql.Request();
    request.input('pathId', sql.Int, pathId);
    request.input('sectionId', sql.Int, sectionId);
    const result = await request.query(`
        SELECT TOP 1 tcs.QuestionQuantity
        FROM dbo.Tests t
        INNER JOIN dbo.Test_Config tc ON tc.TestId = t.TestId
        INNER JOIN dbo.Test_Config_Section tcs ON tcs.ConfigId = tc.ConfigId
        WHERE t.PathId = @pathId
          AND ISNULL(t.IsCourseTest, 0) = 0
          AND ISNULL(t.IsActive, 0) = 1
          AND tcs.TypeId = 3
          AND tcs.BankSectionId = @sectionId
          AND ISNULL(tcs.QuestionQuantity, 0) > 0
    `);
    return Boolean(result.recordset[0]);
}

function isSectionCurrentlyInTest(isUseForTestValue) {
    if (isUseForTestValue == null) return true;
    return Number(isUseForTestValue) === 1;
}

const getAllListQuestionBankByMentorIdController = async (req, res) => {
    try {
        const userId = req.query.userId;
        const roleName = req.query.roleName;
        if (roleName.toLowerCase() === 'mentor') {
            const listQuestionBank = await questionBankModel.getAllListQuestionBankByMentorId(userId)
            return res.status(200).json({
                status: true,
                message: `Lấy list question bank của userId = ${userId} thành công`,
                data: listQuestionBank
            })
        }
        return res.status(404).json({
            status: false,
            message: `UserId = ${userId} không phải mentor`,
            data: [],
        })
    } catch (error) {
        console.error(error.message)
        return res.status(400).json({
            status: false,
            message: 'Lỗi questionBankController.js tại hàm getAllListQuestionBankByMentorIdController',
            data: [],
        })
    }
}

const getCourseQuestionBankActiveStatsController = async (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(400).json({
                status: false,
                message: 'courseId không hợp lệ',
                data: null,
            });
        }
        const data = await questionBankModel.getCourseQuestionBankActiveStats(courseId);
        return res.status(200).json({
            status: true,
            message: `Lấy thống kê question bank khóa courseId = ${courseId} thành công`,
            data,
        });
    } catch (error) {
        console.error(error.message)
        console.error(error.message);
        return res.status(500).json({
            status: false,
            message: 'Lỗi questionBankController.js tại hàm getCourseQuestionBankActiveStatsController',
            data: null,
        });
    }
}

const getAllQuestionOfPathController = async (req, res) => {
    try {
        const pathId = req.query.pathId;
        if (!Number(pathId) || Number(pathId) <= 0) return res.status(400).json({
            success: false,
            message: 'PathId không hợp lệ',
            pathSections: []
        })

        const data = await questionBankModel.getAllSectionPathModel(pathId)
        return res.status(200).json(
            {
                success: true,
                message: `Lấy bộ câu hỏi của pathId = ${pathId} thành công`,
                pathSections: data
            }
        )
    } catch (error) {
        console.error(error.message);
        return res.status(500).json(
            {
                success: false,
                message: "Lỗi server tại questionBankController hàm getAllQuestionOfPathController",
                pathSections: []
            }
        )
    }
}

const updateStatusSectionController = async (req, res) => {
    try {
        const sectionId = Number(req.body.sectionId);
        const status = req.body.status;
        const enableForTest = status === true || status === 1 || status === '1';

        if (!Number.isInteger(sectionId) || sectionId <= 0) {
            return res.status(400).json({
                status: false,
                message: 'sectionId không hợp lệ',
            });
        }

        const sectionMeta = await getSectionPathMeta(sectionId);
        if (!sectionMeta) {
            return res.status(404).json({
                status: false,
                message: `Không tìm thấy sectionId = ${sectionId}`,
            });
        }

        // Tắt: phải còn đủ section bật cho cấu hình quiz chương (cùng rule lúc lưu quiz)
        if (!enableForTest && isSectionCurrentlyInTest(sectionMeta.IsUseForTest)) {
            const pathId = Number(sectionMeta.PathId);
            const typeId = Number(sectionMeta.TypeId);
            const inTestCount = await countInTestSectionsForSkill(pathId, typeId);
            const inTestCountAfterOff = inTestCount - 1;

            if (typeId === 1 || typeId === 2) {
                const quizSectionPickCount = await getQuizSectionPickCount(pathId, typeId);
                if (quizSectionPickCount > 0 && inTestCountAfterOff < quizSectionPickCount) {
                    const skillLabel = SKILL_LABEL_VI[typeId] ?? 'kỹ năng';
                    return res.status(400).json({
                        status: false,
                        message:
                            `Bài kiểm tra chương cần ${quizSectionPickCount} section ${skillLabel}. `
                            + `Sau khi tắt chỉ còn ${inTestCountAfterOff} section đang bật — không đủ.`,
                    });
                }
            }

            if (typeId === 3) {
                const inQuiz = await isVocabSectionConfiguredInQuiz(pathId, sectionId);
                if (inQuiz) {
                    return res.status(400).json({
                        status: false,
                        message:
                            'Section này đang được cấu hình lấy câu trong bài kiểm tra. Hãy chỉnh cấu hình quiz trước.',
                    });
                }
            }
        }

        // Chỉ bật IsUseForTest khi section có câu hỏi và ít nhất 1 câu bật dùng trong test
        if (enableForTest) {
            const enableCheckRequest = new sql.Request();
            enableCheckRequest.input('sectionId', sql.Int, sectionId);
            const checkResult = await enableCheckRequest.query(`
                SELECT
                    COUNT(*) AS totalQuestions,
                    SUM(CASE WHEN ISNULL(q.IsUseForTest, 0) = 1 THEN 1 ELSE 0 END) AS useForTestCount
                FROM dbo.Questions q
                WHERE q.SectionId = @sectionId
            `);
            const row = checkResult.recordset[0] ?? {};
            const totalQuestions = Number(row.totalQuestions) || 0;
            const useForTestCount = Number(row.useForTestCount) || 0;

            if (totalQuestions < 1) {
                return res.status(400).json({
                    status: false,
                    message: 'Section chưa có câu hỏi. Không thể bật dùng trong bài kiểm tra.',
                });
            }
            if (useForTestCount < 1) {
                return res.status(400).json({
                    status: false,
                    message: 'Cần ít nhất một câu hỏi được bật "Dùng trong bài kiểm tra".',
                });
            }
        }

        const updateRequest = new sql.Request();
        updateRequest.input('sectionId', sql.Int, sectionId);
        updateRequest.input('isUseForTest', sql.Bit, enableForTest ? 1 : 0);

        const result = await updateRequest.query(`
            UPDATE dbo.Question_Sections
            SET IsUseForTest = @isUseForTest
            WHERE SectionId = @sectionId
        `);

        if (!result.rowsAffected?.[0]) {
            return res.status(404).json({
                status: false,
                message: `Không tìm thấy sectionId = ${sectionId}`,
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Cập nhật trạng thái section thành công',
            data: {
                sectionId,
                isUseForTest: enableForTest,
            },
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            status: false,
            message: 'Lỗi questionBankController.js tại hàm updateStatusSectionController',
        });
    }
};

const updateStatusQuestionController = async (req, res) => {
    try {
        const questionId = Number(req.body.questionId);
        const status = req.body.status;

        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({
                status: false,
                message: 'questionId không hợp lệ',
            });
        }

        const request = new sql.Request();
        request.input('questionId', sql.Int, questionId);
        request.input('isUseForTest', sql.Bit, status ? 1 : 0);

        const result = await request.query(`
            UPDATE dbo.Questions
            SET IsUseForTest = @isUseForTest
            WHERE QuestionId = @questionId
        `);

        if (!result.rowsAffected?.[0]) {
            return res.status(404).json({
                status: false,
                message: `Không tìm thấy questionId = ${questionId}`,
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Cập nhật trạng thái câu hỏi thành công',
            data: { questionId, isUseForTest: Boolean(status) },
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            status: false,
            message: 'Lỗi questionBankController.js tại hàm updateStatusQuestionController',
        });
    }
};

module.exports = {
    getAllListQuestionBankByMentorIdController,
    getCourseQuestionBankActiveStatsController,
    getAllQuestionOfPathController,
    updateStatusSectionController,
    updateStatusQuestionController,
};