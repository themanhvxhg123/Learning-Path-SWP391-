/**
 * API Mentor — prefix mount: /api/mentor
 * Map tới FE: courseContentService, mentorCourseService, chapterQuizConfigService.
 *
 * Auth: optionalAuth đọc x-user-id (hoặc query userId) → req.user.userId.
 *
 * Sửa thông tin khóa: PATCH /courses/:courseId
 * Sửa nội dung từng phần: paths → nodes → materials (POST/PUT/DELETE)
 *
 * Chi tiết FE→BE: docs/MENTOR_EDIT_FE_TO_BE.md
 */
const express = require('express');
const router = express.Router();

const {
    getStudentsInCourse,
    setPublishCourse,
    setDraftCourse,
    updateCourse,
    updateCourseContent,
    getCourseCommentsForMentor,
    replyCourseComment,
    createCourseCommentForMentor,
} = require('../controllers/mentorController');
const {
    createPath,
    updatePathById,
    deletePathById,
    getPathById,
    createNodeByPathId,
    updateNodeById,
    deleteNodeById,
    getNodeById,
    createMaterialByNodeId,
    updateMaterialById,
    deleteMaterialById,
    getMaterialById,
    downloadMaterialFile,
} = require('../controllers/courseContentController');
const {
    getChapterQuizConfig,
    saveChapterQuizConfig,
    getCourseQuizConfig,
    saveCourseQuizConfig,
    listChapterQuizConfigsByCourse,
} = require('../controllers/chapterQuizConfigController');

/**
 * Gắn userId vào request nếu FE gửi header/query (không chặn nếu thiếu).
 * Input: header x-user-id hoặc query userId
 * Output: req.user.userId (số) rồi chuyển sang handler tiếp theo
 */
const optionalAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId;

    if (userId) {
        req.user = {
            userId: Number(userId),
        };
    }

    next();
};

// --- Học viên & bình luận ---

/** Danh sách học viên trong khóa.
 * Input: params courseId
 * Output: JSON danh sách học viên + tiến độ (theo controller)
 */
router.get('/courses/:courseId/students', getStudentsInCourse);

/** Xem bình luận khóa (mentor).
 * Input: params courseId; optionalAuth
 * Output: JSON danh sách comment
 */
router.get('/courses/:courseId/comments', optionalAuth, getCourseCommentsForMentor);

/** Mentor tạo bình luận trên khóa.
 * Input: params courseId; body nội dung; optionalAuth
 * Output: JSON comment mới hoặc lỗi
 */
router.post('/courses/:courseId/comments', optionalAuth, createCourseCommentForMentor);

/** Mentor trả lời một bình luận.
 * Input: params courseId, commentId; body reply; optionalAuth
 * Output: JSON cập nhật hoặc lỗi
 */
router.patch('/courses/:courseId/comments/:commentId/reply', optionalAuth, replyCourseComment);

// --- Thông tin & nội dung khóa (metadata) ---

/** Cập nhật thông tin cơ bản khóa (tên, mô tả, thumbnail…).
 * Input: params courseId; body PATCH; optionalAuth
 * Output: JSON khóa sau khi sửa
 */
router.patch('/courses/:courseId', optionalAuth, updateCourse);

/** Cập nhật nội dung khóa theo payload tổng (legacy/bulk).
 * Input: params courseId; body content; optionalAuth
 * Output: JSON kết quả lưu
 */
router.put('/courses/:courseId/content', optionalAuth, updateCourseContent);

// --- Cấu hình quiz (chương / cả khóa) ---

/** Liệt kê cấu hình quiz theo từng chương trong khóa.
 * Input: params courseId; optionalAuth
 * Output: JSON mảng config theo path
 */
router.get('/courses/:courseId/chapter-quiz-configs', optionalAuth, listChapterQuizConfigsByCourse);

/** Lấy cấu hình quiz cuối khóa.
 * Input: params courseId; optionalAuth
 * Output: JSON config hoặc mặc định
 */
router.get('/courses/:courseId/course-quiz-config', optionalAuth, getCourseQuizConfig);

/** Lưu cấu hình quiz cuối khóa.
 * Input: params courseId; body config; optionalAuth
 * Output: JSON config đã lưu
 */
router.put('/courses/:courseId/course-quiz-config', optionalAuth, saveCourseQuizConfig);

/** Lấy cấu hình quiz một chương.
 * Input: params courseId, pathId; optionalAuth
 * Output: JSON config chương
 */
router.get('/courses/:courseId/paths/:pathId/chapter-quiz-config', optionalAuth, getChapterQuizConfig);

/** Lưu cấu hình quiz một chương.
 * Input: params courseId, pathId; body config; optionalAuth
 * Output: JSON config đã lưu
 */
router.put('/courses/:courseId/paths/:pathId/chapter-quiz-config', optionalAuth, saveChapterQuizConfig);

// --- Chương (paths) ---

/** Tạo chương mới trong khóa.
 * Input: params courseId; body tên/thứ tự chương; optionalAuth
 * Output: JSON path mới (PathId…)
 */
router.post('/courses/:courseId/paths', optionalAuth, createPath);

/** Chi tiết một chương.
 * Input: params pathId; optionalAuth
 * Output: JSON path
 */
router.get('/paths/:pathId', optionalAuth, getPathById);

/** Sửa chương (tên, thứ tự, trạng thái…).
 * Input: params pathId; body; optionalAuth
 * Output: JSON path cập nhật
 */
router.put('/paths/:pathId', optionalAuth, updatePathById);

/** Xóa chương.
 * Input: params pathId; optionalAuth
 * Output: JSON success hoặc lỗi
 */
router.delete('/paths/:pathId', optionalAuth, deletePathById);

// --- Bài học (nodes) ---

/** Tạo bài học trong chương.
 * Input: params pathId; body bài học; optionalAuth
 * Output: JSON node mới
 */
router.post('/paths/:pathId/nodes', optionalAuth, createNodeByPathId);

/** Chi tiết một bài học.
 * Input: params nodeId; optionalAuth
 * Output: JSON node
 */
router.get('/nodes/:nodeId', optionalAuth, getNodeById);

/** Sửa bài học.
 * Input: params nodeId; body; optionalAuth
 * Output: JSON node cập nhật
 */
router.put('/nodes/:nodeId', optionalAuth, updateNodeById);

/** Xóa bài học.
 * Input: params nodeId; optionalAuth
 * Output: JSON success hoặc lỗi
 */
router.delete('/nodes/:nodeId', optionalAuth, deleteNodeById);

// --- Học liệu (materials) ---

/** Thêm học liệu vào bài học.
 * Input: params nodeId; body loại file/link/nội dung; optionalAuth
 * Output: JSON material mới
 */
router.post('/nodes/:nodeId/materials', optionalAuth, createMaterialByNodeId);

/** Tải file học liệu (stream/download).
 * Input: query (url/id theo controller); optionalAuth
 * Output: file hoặc lỗi
 */
router.get('/materials/download', optionalAuth, downloadMaterialFile);

/** Chi tiết một học liệu.
 * Input: params materialId; optionalAuth
 * Output: JSON material
 */
router.get('/materials/:materialId', optionalAuth, getMaterialById);

/** Sửa học liệu.
 * Input: params materialId; body; optionalAuth
 * Output: JSON material cập nhật
 */
router.put('/materials/:materialId', optionalAuth, updateMaterialById);

/** Xóa học liệu.
 * Input: params materialId; optionalAuth
 * Output: JSON success hoặc lỗi
 */
router.delete('/materials/:materialId', optionalAuth, deleteMaterialById);

// --- Xuất bản khóa ---

/** Đặt khóa sang trạng thái đã xuất bản.
 * Input: params courseId
 * Output: JSON trạng thái khóa
 */
router.get('/courses/:courseId/setPublic', setPublishCourse);

/** Đặt khóa sang bản nháp.
 * Input: params courseId
 * Output: JSON trạng thái khóa
 */
router.get('/courses/:courseId/setDraft', setDraftCourse);

module.exports = router;
