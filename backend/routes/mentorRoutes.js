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
router.get('/courses/:courseId/setPublic', setPublishCourse);
router.get('/courses/:courseId/setDraft', setDraftCourse);
module.exports = router;