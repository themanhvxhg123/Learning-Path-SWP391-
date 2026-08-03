/**
 * API Mentor — map trực tiếp tới FE (courseContentService, mentorCourseService).
 *
 * Auth: optionalAuth gắn req.user.userId từ header x-user-id (FE getMentorAuthHeaders).
 *
 * CHỈNH SỬA KHÓA — thông tin cơ bản:
 *   FE updateCourseBasicInfo → PATCH /courses/:courseId → mentorController.updateCourse
 *
 * CHỈNH SỬA NỘI DUNG (incremental):
 *   FE saveCoursePath → các route bên dưới (DELETE/POST/PUT paths, nodes, materials)
 *
 * Chi tiết từng bước FE→BE: docs/MENTOR_EDIT_FE_TO_BE.md
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


const optionalAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId;

    if (userId) {
        req.user = {
            userId: Number(userId),
        };
    }

    next();
};
router.get('/courses/:courseId/students', getStudentsInCourse);
router.get('/courses/:courseId/comments', optionalAuth, getCourseCommentsForMentor);
router.post('/courses/:courseId/comments', optionalAuth, createCourseCommentForMentor);
router.patch('/courses/:courseId/comments/:commentId/reply', optionalAuth, replyCourseComment);
router.patch('/courses/:courseId', optionalAuth, updateCourse);
router.put('/courses/:courseId/content', optionalAuth, updateCourseContent);
router.get('/courses/:courseId/chapter-quiz-configs', optionalAuth, listChapterQuizConfigsByCourse);
router.get('/courses/:courseId/course-quiz-config', optionalAuth, getCourseQuizConfig);
router.put('/courses/:courseId/course-quiz-config', optionalAuth, saveCourseQuizConfig);
router.get('/courses/:courseId/paths/:pathId/chapter-quiz-config', optionalAuth, getChapterQuizConfig);
router.put('/courses/:courseId/paths/:pathId/chapter-quiz-config', optionalAuth, saveChapterQuizConfig);
router.post('/courses/:courseId/paths', optionalAuth, createPath);
router.get('/paths/:pathId', optionalAuth, getPathById);
router.put('/paths/:pathId', optionalAuth, updatePathById);
router.delete('/paths/:pathId', optionalAuth, deletePathById);
router.post('/paths/:pathId/nodes', optionalAuth, createNodeByPathId);
router.get('/nodes/:nodeId', optionalAuth, getNodeById);
router.put('/nodes/:nodeId', optionalAuth, updateNodeById);
router.delete('/nodes/:nodeId', optionalAuth, deleteNodeById);
router.post('/nodes/:nodeId/materials', optionalAuth, createMaterialByNodeId);
router.get('/materials/download', optionalAuth, downloadMaterialFile);
router.get('/materials/:materialId', optionalAuth, getMaterialById);
router.put('/materials/:materialId', optionalAuth, updateMaterialById);
router.delete('/materials/:materialId', optionalAuth, deleteMaterialById);
router.get('/courses/:courseId/setPublic', setPublishCourse);
router.get('/courses/:courseId/setDraft', setDraftCourse);
module.exports = router;
