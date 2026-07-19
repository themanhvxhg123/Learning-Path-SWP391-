
const studentsModel = require('../Models/studentsModel.js')
const coursesModel = require('../Models/coursesModel.js')
const courseCommentsModel = require('../Models/courseCommentsModel.js')
const { validateCourseThumbnailDataUrl, saveCourseThumbnailFromDataUrl } = require('../middlewares/courseThumbnailMiddleware');

function normalizeThumbnailInput(thumbnail) {
    if (!thumbnail || typeof thumbnail !== 'string') return null;
    const trimmed = thumbnail.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('/assets/')) return trimmed;
    try {
        const parsed = new URL(trimmed);
        if (parsed.pathname.startsWith('/assets/')) return parsed.pathname;
    } catch {
        // data URL hoặc path tương đối — validateCourseThumbnailDataUrl xử lý
    }
    return trimmed;
}

function isThumbnailDataUrl(thumbnail) {
    return typeof thumbnail === 'string' && thumbnail.trim().startsWith('data:image/');
}

async function assertMentorOwnsCourse(courseId, instructorId) {
    const ownerId = await coursesModel.getCourseInstructorId(courseId);
    if (!ownerId) {
        return { ok: false, status: 404, message: 'Không tìm thấy khóa học.' };
    }
    if (instructorId && Number(ownerId) !== Number(instructorId)) {
        return { ok: false, status: 403, message: 'Bạn không có quyền cập nhật khóa học này.' };
    }
    return { ok: true, ownerId };
}

// get Students in course
const getStudentsInCourse = async (req, res) => {
    try {
        // Lấy courseId từ params trước
        // Route nên là: /courses/:courseId/students
        const courseId = Number(req.params.courseId);

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'courseId không hợp lệ',
            });
        }

        const students = await studentsModel.getStudentsInCourseModel(courseId);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách học viên trong khóa học thành công',
            data: students,
        });
    } catch (error) {
        console.error('getStudentsInCourse error:', error);

        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách học viên trong khóa học',
        });
    }
};

// set public course
const setPublishCourse = async (req, res) => {
    try {
        // Lấy courseId từ params trước
        // Route nên là: /courses/:courseId/students
        const courseId = Number(req.params.courseId);

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'courseId không hợp lệ',
            });
        }

        await coursesModel.assertCourseCanPublish(courseId);
        const courseIdSetPublish = await coursesModel.setPublishCourse(courseId);

        return res.status(200).json({
            success: true,
            message: 'Set course -> Publish success',
            courseIdUpdate: courseIdSetPublish,
        });
    } catch (error) {
        console.error('setPublishCourse error:', error);

        return res.status(error.statusCode === 400 ? 400 : 500).json({
            success: false,
            message: error.message ?? 'Lỗi server setPublishCourse',
        });
    }
};

// set course -> draft
const setDraftCourse = async (req, res) => {
    try {
        // Lấy courseId từ params trước
        // Route nên là: /courses/:courseId/students
        const courseId = Number(req.params.courseId);

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'courseId không hợp lệ',
            });
        }

        const courseIdSetPublish = await coursesModel.setDraftCourse(courseId);

        return res.status(200).json({
            success: true,
            message: 'Set course -> Draft success',
            courseIdUpdate: courseIdSetPublish,
        });
    } catch (error) {
        console.error('setDraftCourse error:', error);

        return res.status(500).json({
            success: false,
            message: 'Lỗi server setDraftCourse',
        });
    }
};

const updateCourse = async (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const instructorId = req.user?.userId ?? req.body?.InstructorId ?? null;

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(400).json({ success: false, message: 'courseId không hợp lệ' });
        }

        const ownership = await assertMentorOwnsCourse(courseId, instructorId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({ success: false, message: ownership.message });
        }

        const {
            CourseName,
            Description,
            Thumbnail,
            CategoryId,
            LevelId,
            IsPublished,
        } = req.body ?? {};

        if (!CourseName || String(CourseName).trim() === '') {
            return res.status(400).json({ success: false, message: 'Thiếu tên khóa học.' });
        }
        if (!Description || String(Description).trim() === '') {
            return res.status(400).json({ success: false, message: 'Thiếu mô tả khóa học.' });
        }
        if (!CategoryId || Number.isNaN(Number(CategoryId))) {
            return res.status(400).json({ success: false, message: 'Thiếu hoặc sai CategoryId.' });
        }
        if (!LevelId || Number.isNaN(Number(LevelId))) {
            return res.status(400).json({ success: false, message: 'Thiếu hoặc sai LevelId.' });
        }

        const [existingCourses, studentCount] = await Promise.all([
            coursesModel.getCourseById(courseId),
            coursesModel.getCourseStudentCount(courseId),
        ]);
        const existingCourse = Array.isArray(existingCourses) ? existingCourses[0] : existingCourses;

        if (!existingCourse) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học.' });
        }

        const hasStudents = studentCount > 0;
        const resolvedCategoryId = Number(CategoryId);
        const resolvedLevelId = Number(LevelId);

        if (hasStudents) {
            if (
                resolvedCategoryId !== Number(existingCourse.CategoryId)
                || resolvedLevelId !== Number(existingCourse.LevelId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể thay đổi danh mục và trình độ khi khóa học đã có học viên.',
                });
            }
        }

        const courseData = {
            CourseName: String(CourseName).trim(),
            Description: String(Description).trim(),
            CategoryId: resolvedCategoryId,
            LevelId: resolvedLevelId,
            IsPublished: Boolean(IsPublished),
        };

        const updatedId = await coursesModel.updateCourseById(courseId, courseData);
        if (!updatedId) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học.' });
        }

        let savedThumbnailPath = null;

        if (!hasStudents) {
            const thumbnailInput = normalizeThumbnailInput(Thumbnail);
            if (thumbnailInput && isThumbnailDataUrl(thumbnailInput)) {
                validateCourseThumbnailDataUrl(thumbnailInput);
                savedThumbnailPath = saveCourseThumbnailFromDataUrl(
                    thumbnailInput,
                    courseId,
                    { replaceExisting: true },
                );
                if (savedThumbnailPath) {
                    await coursesModel.updateCourseThumbnail(courseId, savedThumbnailPath);
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin khóa học thành công.',
            courseId: updatedId,
            thumbnail: savedThumbnailPath,
        });
    } catch (error) {
        console.error('updateCourse error:', error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: statusCode === 400 ? error.message : 'Lỗi server khi cập nhật khóa học.',
        });
    }
};

const updateCourseContent = async (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const instructorId = req.user?.userId ?? req.body?.InstructorId ?? null;
        const paths = req.body?.paths;

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(400).json({ success: false, message: 'courseId không hợp lệ' });
        }

        if (!Array.isArray(paths)) {
            return res.status(400).json({ success: false, message: 'Thiếu hoặc sai định dạng paths.' });
        }

        const ownership = await assertMentorOwnsCourse(courseId, instructorId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({ success: false, message: ownership.message });
        }

        return res.status(410).json({
            success: false,
            message: 'Endpoint bulk PUT /content đã ngừng dùng. Hãy gọi REST theo id: /mentor/paths, /nodes, /materials.',
            courseId,
        });
    } catch (error) {
        console.error('updateCourseContent error:', error);
        const isValidationError = /thiếu|Cần ít nhất|Mỗi bài học/i.test(String(error.message ?? ''));
        return res.status(isValidationError ? 400 : 500).json({
            success: false,
            message: error.message ?? 'Lỗi server khi cập nhật nội dung khóa học.',
        });
    }
};

const getCourseCommentsForMentor = async (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const instructorId = req.user?.userId;

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(400).json({ success: false, message: 'courseId không hợp lệ', data: [] });
        }

        const ownership = await assertMentorOwnsCourse(courseId, instructorId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({ success: false, message: ownership.message, data: [] });
        }

        const comments = await courseCommentsModel.getCourseComments(courseId);
        return res.status(200).json({
            success: true,
            message: 'Lấy bình luận thành công',
            data: comments,
        });
    } catch (error) {
        console.error('getCourseCommentsForMentor error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy bình luận',
            data: [],
        });
    }
};

const replyCourseComment = async (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const commentId = Number(req.params.commentId);
        const instructorId = req.user?.userId;
        const { content } = req.body ?? {};

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(400).json({ success: false, message: 'courseId không hợp lệ' });
        }
        if (!Number.isInteger(commentId) || commentId <= 0) {
            return res.status(400).json({ success: false, message: 'commentId không hợp lệ' });
        }
        if (!instructorId) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }
        if (!content || String(content).trim() === '') {
            return res.status(400).json({ success: false, message: 'Nội dung phản hồi không được để trống' });
        }
        if (String(content).trim().length > 250) {
            return res.status(400).json({ success: false, message: 'Phản hồi không được vượt quá 250 ký tự' });
        }

        const ownership = await assertMentorOwnsCourse(courseId, instructorId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({ success: false, message: ownership.message });
        }

        const updated = await courseCommentsModel.createCourseComment({
            courseId,
            userId: instructorId,
            rating: null,
            content: String(content).trim(),
            parentCommentId: commentId
        });

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
        }

        return res.status(200).json({
            success: true,
            message: 'Đã gửi phản hồi',
            data: updated,
        });
    } catch (error) {
        console.error('replyCourseComment error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi gửi phản hồi' });
    }
};

const createCourseCommentForMentor = async (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const instructorId = req.user?.userId;
        const { content } = req.body ?? {};

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(400).json({ success: false, message: 'courseId không hợp lệ' });
        }
        if (!instructorId) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }
        if (!content || String(content).trim() === '') {
            return res.status(400).json({ success: false, message: 'Nội dung bình luận không được để trống' });
        }
        if (String(content).trim().length > 250) {
            return res.status(400).json({ success: false, message: 'Bình luận không được vượt quá 250 ký tự' });
        }

        const ownership = await assertMentorOwnsCourse(courseId, instructorId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({ success: false, message: ownership.message });
        }

        const comment = await courseCommentsModel.createCourseComment({
            courseId,
            userId: instructorId,
            rating: null,
            content: String(content).trim(),
        });

        return res.status(201).json({
            success: true,
            message: 'Gửi bình luận thành công',
            data: comment,
        });
    } catch (error) {
        console.error('createCourseCommentForMentor error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi gửi bình luận' });
    }
};

module.exports = {
    getStudentsInCourse,
    setPublishCourse,
    setDraftCourse,
    updateCourse,
    updateCourseContent,
    getCourseCommentsForMentor,
    replyCourseComment,
    createCourseCommentForMentor,
};