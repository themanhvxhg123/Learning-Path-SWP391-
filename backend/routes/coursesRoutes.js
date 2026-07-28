const express = require('express');
const router = express.Router();

const {
    getMyCourses,
    getInformationCourse,
    getCourseChapters,
    saveCourseDraftStepOne,
    createFinalCourse,
    getStudentCourses,
    enrollCourse,
    getLearningPath,
    updateProgress,
    getFeaturedCourses,
    getFeaturedPaths,
    getContinueCourse,
    getStreak,
    getCourseComments,
    createCourseComment,


} = require('../controllers/coursesController');


const optionalAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId;
    if (userId) {
        req.user = {
            userId: Number(userId),
        };
    }
    next();
};

// Dummy route cho /api/courses/top
router.get('/top', (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 4;
    res.json({ success: true, message: "Dummy data from /top", courses: [] });
});

// GET /api/courses
// lay khoa hoc dang hoc
router.get('/continue/:userId', getContinueCourse);
// lay top hoc vien
router.get('/featured', getFeaturedCourses);
// lay top rating
router.get('/featured-paths', getFeaturedPaths);
// Lấy tất cả khóa học ngoài trang tổng (Catalog)
router.get('/student', optionalAuth, getStudentCourses);

// Lấy danh sách khóa học của tôi (Trang My Courses)
router.post('/my-courses', getMyCourses);

// Mục lục chương / bài theo khóa học (Question Bank, quiz setup)
router.get('/my-courses/:courseId/chapters', optionalAuth, getCourseChapters);

/** FE: fetchMentorCourseDetail → GET /api/courses/my-courses/:courseId (tab=course) */
router.get('/my-courses/:courseId', getInformationCourse);

// Lưu nháp và tạo khóa học (Role Mentor)
router.post('/mentor/courses/save/draft', saveCourseDraftStepOne);
router.post('/mentor/courses/createCourse', createFinalCourse);

router.post('/enroll', enrollCourse);

// Bình luận khóa học (trang detail)
router.get('/:courseId/comments', optionalAuth, getCourseComments);
router.post('/:courseId/comments', optionalAuth, createCourseComment);

// Lấy lộ trình học và trạng thái hoàn thành (Trang Course Learning)
router.get('/:id/learning', getLearningPath);

// Lưu tiến độ học và đánh dấu bài học hoàn thành
router.post('/:id/progress', updateProgress);
// lay treak
router.get("/streak", getStreak);

router.get('/:courseId/comments', optionalAuth, getCourseComments);
router.post('/:courseId/comments', optionalAuth, createCourseComment);

// Lấy lộ trình học và trạng thái hoàn thành (Trang Course Learning)
router.get('/:id/learning', getLearningPath);

// Lưu tiến độ học và đánh dấu bài học hoàn thành
router.post('/:id/progress', updateProgress);
// lay treak
router.get("/streak", getStreak);

const studentTestController = require('../controllers/studentTestController');
// Lấy thông tin giới thiệu bài thi (tên bài, thời gian, số câu...)
router.get('/:courseId/tests/:scope/meta', studentTestController.getTestMeta);
// Khởi tạo lượt thi mới, lấy ngẫu nhiên câu hỏi tạo thành đề thi
router.post('/:courseId/tests/:scope/start', studentTestController.startTestAttempt);
// Nộp bài thi (tính điểm, lưu trạng thái hoàn thành)
router.post('/:courseId/tests/attempts/:attemptId/submit', studentTestController.submitTestAttempt);
router.get('/:courseId/tests/attempts/:attemptId/section-stats', studentTestController.getAttemptSectionStats);
// Tạo đường dẫn API mới (bạn có thể đổi tên route theo ý thích)
router.get('/attempts/:attemptId/wrong-answers', studentTestController.getWrongAnswersStats);
module.exports = router;
