const questionBankModel = require("../Models/questionBankModel");

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
module.exports = {
    getAllListQuestionBankByMentorIdController,
    getCourseQuestionBankActiveStatsController,
    getAllQuestionOfPathController
}