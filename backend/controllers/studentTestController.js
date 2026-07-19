/**
 * ============================================================================
 * studentTestController.js
 * ============================================================================
 * Controller xử lý TOÀN BỘ luồng làm bài kiểm tra của học viên.
 *
 * Vòng đời một lần làm bài:
 *   1. getTestMeta        → học viên xem thông tin bài thi (màn intro)
 *   2. startTestAttempt   → bấm "Bắt đầu" → random đề + tạo lượt làm (Test_Attempts)
 *   3. submitTestAttempt    → nộp bài → chấm điểm + lưu stat section
 *   4. getWrongAnswersStats → xem lại câu sai
 *   5. getAttemptSectionStats → xem stat đúng/sai theo section/kỹ năng
 *
 * API routes (đăng ký tại coursesRoutes.js):
 *   GET  /api/courses/:courseId/tests/:scope/meta
 *   POST /api/courses/:courseId/tests/:scope/start
 *   POST /api/courses/:courseId/tests/attempts/:attemptId/submit
 *   GET  /api/courses/:courseId/tests/attempts/:attemptId/section-stats
 *   GET  /api/courses/attempts/:attemptId/wrong-answers
 *
 * scope:
 *   - 'chapter' → bài kiểm tra cuối chương (cần chapterId)
 *   - 'final'   → bài kiểm tra toàn khóa (có thuật toán đề xuất đề)
 * ============================================================================
 */

// --- Models: truy vấn DB trực tiếp (Test_Attempts, đáp án, stat...) ---
const studentTestModel = require('../Models/studentTestModel');
const questionBankModel = require('../Models/questionBankModel');
const courseModel = require('../models/coursesModel');

// --- Services: logic nghiệp vụ (config mentor, random đề, đề xuất, stat...) ---
const chapterQuizConfigService = require('../services/chapterQuizConfigService');
const studentTestPaperService = require('../services/studentTestPaperService');
const testAttemptSectionStatsService = require('../services/testAttemptSectionStatsService');
const testRecommendationService = require('../services/testRecommendationService');


// =============================================================================
// PHẦN 1: HELPER — KIỂM TRA ĐIỀU KIỆN LÀM BÀI
// =============================================================================

/**
 * Kiểm tra danh sách chương bắt buộc đã pass bài test chưa.
 *
 * Mentor có thể cấu hình:
 *   - requiredChapterIds (bài test chương): phải pass các chương X trước
 *   - selectedChapterIds (bài test toàn khóa): phải pass tất cả chương được chọn
 *
 * @param {number} courseId
 * @param {Array<{ id, isTestPassed }>} modules - tiến độ từng chương của học viên
 * @param {string[]} requiredChapterIds - danh sách pathId chương bắt buộc
 * @returns {string[]} tên các chương chưa pass (rỗng = đủ điều kiện)
 */
async function getUnmetTestPrerequisiteBlockers(courseId, modules, requiredChapterIds = []) {
    const required = (requiredChapterIds ?? []).map(String).filter(Boolean);
    if (required.length === 0) return [];

    const blockers = [];

    for (const requiredPathId of required) {
        // Tìm tiến độ chương này trong learning path
        const reqMod = modules.find((mod) => mod.id === Number(requiredPathId));

        // Kiểm tra chương có bài test đang bật không
        const configRes = await chapterQuizConfigService.getChapterQuizConfig(courseId, requiredPathId);
        const hasActiveTest = configRes.ok
            && configRes.config?.enabled !== false
            && configRes.config != null;

        // Chương có test bật + học viên chưa pass → thêm vào danh sách chặn
        if (hasActiveTest && !reqMod?.isTestPassed) {
            blockers.push(
                configRes.pathMeta?.PathName
                ?? configRes.config?.title
                ?? `Chương ${requiredPathId}`,
            );
        }
    }

    return blockers;
}

/**
 * Kiểm tra học viên có đủ điều kiện làm bài kiểm tra không.
 *
 * Điều kiện theo scope:
 *   chapter: học xong bài trong chương + pass chương tiên quyết
 *   final:   pass bài test tất cả chương mentor chọn
 *
 * @param {number} courseId
 * @param {number} userId
 * @param {'chapter'|'final'} scope
 * @param {string|number} [chapterId] - bắt buộc khi scope = 'chapter'
 * @returns {{ prerequisitesMet: boolean, prerequisiteBlockers: string[] }}
 */
async function checkPrerequisites(courseId, userId, scope, chapterId) {
    // Lấy toàn bộ tiến độ học: mỗi dòng = 1 bài học trong 1 chương
    const learningPath = await courseModel.getCourseLearningPath(courseId, userId);
    let prerequisitesMet = true;
    let prerequisiteBlockers = [];

    if (learningPath && learningPath.length > 0) {
        // --- Bước 1: Gom dữ liệu phẳng thành cấu trúc theo chương ---
        // Input:  [{ PathId: 1, NodeId: 10, IsCompleted: true, IsTestPassed: false }, ...]
        // Output: [{ id: 1, isTestPassed: false, lessons: [{ isCompleted: true }, ...] }]
        const modulesMap = new Map();
        for (const row of learningPath) {
            if (!modulesMap.has(row.PathId)) {
                modulesMap.set(row.PathId, {
                    id: row.PathId,
                    isTestPassed: row.IsTestPassed,
                    lessons: [],
                });
            }
            if (row.NodeId) {
                modulesMap.get(row.PathId).lessons.push({ isCompleted: row.IsCompleted });
            }
        }

        const modules = Array.from(modulesMap.values());

        // --- Bước 2: Tính trạng thái hoàn thành từng chương ---
        for (let i = 0; i < modules.length; i++) {
            const mod = modules[i];
            const allLessonsDone = mod.lessons.every((l) => l.isCompleted);

            const hasConfigRes = await chapterQuizConfigService.getChapterQuizConfig(courseId, mod.id);
            const hasActiveTest = hasConfigRes.ok
                && hasConfigRes.config?.enabled !== false
                && hasConfigRes.config != null;

            // Chương hoàn thành khi: học xong bài VÀ (không có test HOẶC đã pass test)
            mod.isCompleted = allLessonsDone && (!hasActiveTest || mod.isTestPassed);
            mod.allLessonsDone = allLessonsDone;
        }

        // --- Bước 3: Kiểm tra theo loại bài thi ---
        if (scope === 'chapter' && chapterId) {
            const targetMod = modules.find((m) => m.id === Number(chapterId));
            if (targetMod) {
                // isLocked: cờ khóa liên chương (hiện tắt = false)
                const isLocked = false;

                if (isLocked) {
                    prerequisitesMet = false;
                    prerequisiteBlockers.push(
                        'Chương này đang bị khóa do chưa hoàn thành chương trước đó.',
                    );
                } else if (!targetMod.allLessonsDone) {
                    // Chưa học xong bài trong chương → không được làm test
                    prerequisitesMet = false;
                    prerequisiteBlockers.push(
                        'Bạn phải học xong tất cả bài học trong chương trước khi làm bài kiểm tra.',
                    );
                } else {
                    // Kiểm tra chương tiên quyết (requiredChapterIds trong config chương)
                    const chapterConfigRes = await chapterQuizConfigService.getChapterQuizConfig(
                        courseId,
                        chapterId,
                    );
                    const unmetBlockers = await getUnmetTestPrerequisiteBlockers(
                        courseId,
                        modules,
                        chapterConfigRes.config?.requiredChapterIds ?? [],
                    );
                    if (unmetBlockers.length > 0) {
                        prerequisitesMet = false;
                        prerequisiteBlockers.push(
                            `Bạn phải đạt bài kiểm tra các chương: ${unmetBlockers.join(', ')}.`,
                        );
                    }
                }
            }
        } else if (scope === 'final') {
            // Final test: phải pass bài test tất cả chương trong selectedChapterIds
            const courseConfigRes = await chapterQuizConfigService.getCourseQuizConfig(courseId);
            const prerequisiteChapterIds = courseConfigRes.config?.selectedChapterIds
                ?? courseConfigRes.config?.requiredChapterIds
                ?? [];

            const unmetBlockers = await getUnmetTestPrerequisiteBlockers(
                courseId,
                modules,
                prerequisiteChapterIds,
            );
            if (unmetBlockers.length > 0) {
                prerequisitesMet = false;
                prerequisiteBlockers.push(
                    `Bạn phải đạt bài kiểm tra các chương: ${unmetBlockers.join(', ')}.`,
                );
            }
        }
    }

    return { prerequisitesMet, prerequisiteBlockers };
}


// =============================================================================
// PHẦN 2: getTestMeta — THÔNG TIN BÀI THI (MÀN INTRO)
// =============================================================================

/**
 * Trả metadata cho màn giới thiệu bài thi — TRƯỚC khi học viên bấm "Bắt đầu".
 *
 * Frontend dùng để hiển thị: tên bài, thời gian, điểm đạt, số lần còn lại,
 * lịch sử điểm, kỹ năng (Nghe/Đọc/Từ vựng), điều kiện làm bài.
 *
 * Route: GET /api/courses/:courseId/tests/:scope/meta?chapterId=...
 *
 * @param {object} req.params.courseId
 * @param {object} req.params.scope - 'chapter' | 'final'
 * @param {object} req.query.chapterId - bắt buộc khi scope = 'chapter'
 */
const getTestMeta = async (req, res) => {
    try {
        const { courseId, scope } = req.params;
        const chapterId = req.query.chapterId;
        const userId = req.headers['x-user-id'] || req.user?.userId || 1;

        // Kiểm tra điều kiện — frontend hiển thị blocker nếu chưa đủ
        const prereq = await checkPrerequisites(courseId, userId, scope, chapterId);

        // Giá trị mặc định — sẽ được ghi đè bởi config mentor nếu có
        let meta = {
            title: 'Bài kiểm tra',
            courseId: Number(courseId),
            timeLimitMinutes: 15,
            passingScore: 70,
            maxAttempts: 3,
            attemptsUsed: 0,
            remainingAttempts: 3,
            enabled: true,
            skills: [],
            history: [],
            prerequisitesMet: prereq.prerequisitesMet,
            prerequisiteBlockers: prereq.prerequisiteBlockers,
        };

        if (scope === 'chapter' && chapterId) {
            // --- Bài kiểm tra cuối chương ---
            const testId = await studentTestModel.getTestIdByCourseAndPath(courseId, chapterId);
            if (testId) {
                meta.attemptsUsed = await studentTestModel.getAttemptCountByUserAndTest(userId, testId);
                meta.history = await studentTestModel.getTestAttemptsHistory(userId, testId);
            }

            const configResult = await chapterQuizConfigService.getChapterQuizConfig(courseId, chapterId);
            if (configResult.ok && configResult.config) {
                meta.timeLimitMinutes = configResult.config.timeLimitMinutes || 15;
                meta.passingScore = configResult.config.passingScore || 70;
                meta.maxAttempts = configResult.config.maxAttempts || 3;
                meta.remainingAttempts = Math.max(0, meta.maxAttempts - meta.attemptsUsed);

                if (studentTestPaperService.hasConfiguredQuizSources(configResult.config)) {
                    meta.skills = studentTestPaperService.getConfiguredSkillTypes(configResult.config);
                }
            }
        } else if (scope === 'final') {
            // --- Bài kiểm tra toàn khóa ---
            const configResult = await chapterQuizConfigService.getCourseQuizConfig(courseId);
            if (configResult.ok && configResult.config) {
                meta.title = configResult.config.title || meta.title;
                meta.timeLimitMinutes = configResult.config.timeLimitMinutes || 45;
                meta.passingScore = configResult.config.passingScore || 70;
                meta.maxAttempts = configResult.config.maxAttempts || 3;
                meta.enabled = configResult.config.enabled !== false;

                const testId = configResult.config.id
                    ?? await studentTestModel.getTestIdByCourseForFinal(courseId);
                if (testId) {
                    meta.attemptsUsed = await studentTestModel.getAttemptCountByUserAndTest(userId, testId);
                    meta.history = await studentTestModel.getTestAttemptsHistory(userId, testId);
                }
                meta.remainingAttempts = Math.max(0, meta.maxAttempts - meta.attemptsUsed);

                if (studentTestPaperService.hasConfiguredQuizSources(configResult.config)) {
                    meta.skills = studentTestPaperService.getConfiguredSkillTypes(configResult.config);
                }
            }
        }

        res.json({ ok: true, meta });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};


// =============================================================================
// PHẦN 3: startTestAttempt — BẮT ĐẦU LÀM BÀI + RANDOM ĐỀ
// =============================================================================

/**
 * Khởi tạo lượt làm bài mới, random đề và trả về cho frontend.
 *
 * Route: POST /api/courses/:courseId/tests/:scope/start
 * Body:  { chapterId } — bắt buộc khi scope = 'chapter'
 *
 * Luồng FINAL (toàn khóa):
 *   1. checkPrerequisites
 *   2. resolveCourseTestPaperConfig — lấy mentor config + kiểm tra đã có attempt trước chưa (mọi status)
 *   3a. Chưa từng làm → studentTestPaperService.buildCourseTestPaper (random)
 *   3b. Đã từng làm  → testRecommendationService.buildRecommendedCourseTestPaper (đề xuất + random)
 *   4. createTestAttempt → trả { meta, attempt, paper }
 *
 * Luồng CHAPTER (cuối chương):
 *   1. checkPrerequisites
 *   2. getChapterQuizConfig + getSectionsByPath
 *   3. buildChapterTestPaper → random đề (KHÔNG có đề xuất)
 *   4. createTestAttempt
 *   5. Trả { meta, attempt, paper }
 */
const startTestAttempt = async (req, res) => {
    try {
        const { courseId, scope } = req.params;
        const userId = req.headers['x-user-id'] || req.user?.userId || 1;
        let pathId = req.body.chapterId;

        // --- Bước 1: Kiểm tra điều kiện ---
        const prereq = await checkPrerequisites(courseId, userId, scope, pathId);
        if (!prereq.prerequisitesMet) {
            return res.status(403).json({ ok: false, message: prereq.prerequisiteBlockers.join(' ') });
        }

        let testId = null;
        let config = {};
        let paperConfig = null;
        let paper = null;

        if (scope === 'final') {
            // ===================== FINAL TEST =====================

            const resolved = await testRecommendationService.resolveCourseTestPaperConfig({
                userId,
                courseId,
            });
            if (!resolved.ok) {
                const status = resolved.message?.includes('chưa tạo') ? 404 : 400;
                return res.status(status).json({ ok: false, message: resolved.message });
            }

            config = resolved.config;
            testId = resolved.testId;

            try {
                if (!resolved.hasSubmittedBefore) {
                    // Chưa từng làm bài → random đề theo config mentor gốc
                    paper = await studentTestPaperService.buildCourseTestPaper(config, courseId);
                } else {
                    // Đã từng làm bài → đề xuất config theo stat rồi random đề
                    paper = await testRecommendationService.buildRecommendedCourseTestPaper({
                        userId,
                        courseId,
                        mentorConfig: config,
                        testId,
                    });
                }
            } catch (paperError) {
                if (paperError.code === 'INSUFFICIENT_TEST_QUESTIONS') {
                    return res.status(400).json({ ok: false, message: paperError.message });
                }
                throw paperError;
            }
        } else {
            // ===================== CHAPTER TEST =====================

            if (!pathId) {
                return res.status(400).json({ ok: false, message: 'Thiếu chapterId' });
            }

            testId = await studentTestModel.getTestIdByCourseAndPath(courseId, pathId);
            if (!testId) {
                return res.status(404).json({ ok: false, message: 'Giảng viên chưa tạo bài kiểm tra!' });
            }

            const configResult = await chapterQuizConfigService.getChapterQuizConfig(courseId, pathId);
            if (!configResult.ok) {
                return res.status(400).json({ ok: false, message: configResult.message });
            }
            if (!configResult.config) {
                return res.status(400).json({
                    ok: false,
                    message: 'Giảng viên chưa thiết lập bài kiểm tra cho chương này.',
                });
            }
            if (!configResult.config.enabled) {
                return res.status(400).json({
                    ok: false,
                    message: 'Bài kiểm tra chương chưa được bật.',
                });
            }

            config = configResult.config;
            paperConfig = config;

            // Lấy tất cả section Nghe/Đọc/Từ vựng của chương từ question bank
            const sectionsData = await questionBankModel.getSectionsByPath(courseId, pathId);
            try {
                paper = await studentTestPaperService.buildChapterTestPaper(config, sectionsData);
            } catch (paperError) {
                if (paperError.code === 'INSUFFICIENT_TEST_QUESTIONS') {
                    return res.status(400).json({ ok: false, message: paperError.message });
                }
                throw paperError;
            }

            // Gắn metadata chương vào từng section (dùng khi nộp bài tính stat)
            const pathName = configResult.pathMeta?.PathName ?? null;
            const pathOrder = Number(configResult.pathMeta?.PathOrder ?? 0) || null;
            paper.sections = (paper.sections ?? []).map((section) => ({
                ...section,
                pathId: Number(pathId),
                pathName,
                pathOrder,
            }));
        }

        // --- Bước 4: Tạo bản ghi lượt làm bài trong DB ---
        const timeLimitSeconds = (config.timeLimitMinutes || 15) * 60;
        const attempt = await studentTestModel.createTestAttempt(userId, testId, timeLimitSeconds);

        const formattedSections = paper?.sections ?? [];
        const totalQuestionsCount = paper?.totalQuestions ?? 0;

        if (formattedSections.length === 0) {
            return res.status(400).json({
                ok: false,
                message: 'Không đủ câu hỏi để tạo đề kiểm tra theo cấu hình mentor.',
            });
        }

        const configuredSkills = studentTestPaperService.getConfiguredSkillTypes(config);

        // --- Bước 5: Trả về frontend ---
        // attempt: { attemptId, expiresAt } — frontend dùng để đếm ngược + nộp bài
        // paper:   { sections: [{ skillType, questions, audioUrl, ... }] } — đề thi hiển thị
        res.json({
            ok: true,
            meta: {
                timeLimitMinutes: config.timeLimitMinutes || 15,
                skills: configuredSkills,
                totalQuestions: totalQuestionsCount,
            },
            attempt,
            paper: {
                paperId: `paper_${testId}`,
                title: scope === 'final'
                    ? (config.title || 'Bài kiểm tra toàn khóa')
                    : (config.title || 'Bài kiểm tra cuối chương'),
                totalQuestions: totalQuestionsCount,
                sections: formattedSections,
            },
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};


// =============================================================================
// PHẦN 4: submitTestAttempt — NỘP BÀI + CHẤM ĐIỂM
// =============================================================================

/**
 * Nộp bài kiểm tra: chấm điểm, lưu đáp án, lưu stat section.
 *
 * Route: POST /api/courses/:courseId/tests/attempts/:attemptId/submit
 *
 * Body:
 *   answers          - { [questionId]: choiceId | choiceId[] } đáp án học viên chọn
 *   timeSpentSeconds - thời gian làm bài
 *   totalQuestions   - tổng số câu trong đề
 *   chapterId        - cần khi là bài test chương (lấy passingScore)
 *   paperSections    - metadata section từ đề đã random (dùng tính stat section)
 *
 * Stat section (Test_Attempt_Section_Stats) là INPUT cho thuật toán đề xuất
 * khi học viên làm lại bài final test lần tiếp theo.
 */
const submitTestAttempt = async (req, res) => {
    try {
        const { courseId, attemptId } = req.params;
        const { answers, timeSpentSeconds, totalQuestions, chapterId, paperSections } = req.body;

        const questionIds = Object.keys(answers || {})
            .map((id) => Number(id))
            .filter((id) => !isNaN(id));
        let correctCount = 0;
        const questionResults = [];

        if (questionIds.length > 0) {
            // --- Bước 1: Lấy đáp án đúng từ DB ---
            const { sql } = require('../config/db');
            const request = new sql.Request();
            const result = await request.query(`
                SELECT QuestionId, ChoiceId 
                FROM dbo.Question_Choices 
                WHERE IsTrue = 1 AND QuestionId IN (${questionIds.join(',')})
            `);

            // Map: questionId → [choiceId đúng] (hỗ trợ câu chọn nhiều đáp án)
            const correctAnswersMap = {};
            result.recordset.forEach((row) => {
                if (!correctAnswersMap[row.QuestionId]) {
                    correctAnswersMap[row.QuestionId] = [];
                }
                correctAnswersMap[row.QuestionId].push(row.ChoiceId);
            });

            // --- Bước 2: So sánh từng câu ---
            for (const qId of questionIds) {
                const userChoiceIds = Array.isArray(answers[qId])
                    ? answers[qId].map(String)
                    : [String(answers[qId])];
                const correctChoiceIds = (correctAnswersMap[qId] || []).map(String);

                let isCorrect = false;
                let isBlank = false;

                // Bỏ trống: không chọn hoặc chọn null/undefined
                if (
                    userChoiceIds.length === 0
                    || (userChoiceIds.length === 1
                        && (userChoiceIds[0] === 'null'
                            || userChoiceIds[0] === 'undefined'
                            || !userChoiceIds[0]))
                ) {
                    isBlank = true;
                } else if (
                    correctChoiceIds.length > 0
                    && userChoiceIds.length === correctChoiceIds.length
                ) {
                    // Đúng khi: chọn đủ số đáp án VÀ tất cả đều đúng
                    isCorrect = correctChoiceIds.every((id) => userChoiceIds.includes(id));
                    if (isCorrect) correctCount++;
                }

                questionResults.push({
                    questionId: Number(qId),
                    isCorrect,
                    isBlank,
                    userChoiceIds: isBlank ? [] : userChoiceIds,
                    correctChoiceIds: isBlank ? [] : correctChoiceIds,
                });
            }
        }

        // --- Bước 3: Tính điểm ---
        const totalQ = totalQuestions || questionIds.length || 1;
        const wrongCount = totalQ - correctCount;
        const percentage = Math.round((correctCount / totalQ) * 100);

        // --- Bước 4: Xác định đạt/không đạt theo passingScore mentor ---
        let passingScore = 70;
        const testInfo = await studentTestModel.getTestInfoByAttempt(attemptId);
        if (testInfo?.IsCourseTest) {
            const configResult = await chapterQuizConfigService.getCourseQuizConfig(courseId);
            if (configResult.ok && configResult.config) {
                passingScore = configResult.config.passingScore || 70;
            }
        } else if (chapterId && courseId) {
            const configResult = await chapterQuizConfigService.getChapterQuizConfig(courseId, chapterId);
            if (configResult.ok && configResult.config) {
                passingScore = configResult.config.passingScore || 70;
            }
        }
        const passed = percentage >= passingScore;
        const isPassBit = passed ? 1 : 0;

        // --- Bước 5: Lưu kết quả vào DB ---
        await studentTestModel.submitTestAttemptModel(attemptId, percentage, 'submitted', isPassBit);
        await studentTestModel.saveTestAttemptAnswers(attemptId, questionResults);

        // --- Bước 6: Lưu stat đúng/sai theo section ---
        // paperSections do frontend gửi lên = cấu trúc đề lúc startTestAttempt
        // → gom thành stat theo section/chương/kỹ năng → lưu Test_Attempt_Section_Stats
        let sectionStats = null;
        if (Array.isArray(paperSections) && paperSections.length > 0) {
            try {
                const statRows = testAttemptSectionStatsService.buildSectionStatsRows(
                    paperSections,
                    questionResults,
                );
                if (statRows.length > 0) {
                    await studentTestModel.saveAttemptSectionStats(
                        attemptId,
                        Number(courseId),
                        statRows,
                    );
                    sectionStats = testAttemptSectionStatsService.buildAttemptSectionStatsSummary(statRows);
                }
            } catch (statsError) {
                // Không chặn nộp bài nếu lưu stat lỗi
                console.error('saveAttemptSectionStats error:', statsError);
            }
        }

        res.json({
            ok: true,
            result: {
                score: percentage,
                passed,
                percentage,
                correctCount,
                wrongCount: wrongCount >= 0 ? wrongCount : 0,
                totalQuestions: totalQ,
                timeSpentSeconds: timeSpentSeconds || 0,
                passingScore,
                questionResults,
                sectionStats,
            },
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};


// =============================================================================
// PHẦN 5: getWrongAnswersStats — XEM LẠI CÂU SAI
// =============================================================================

/**
 * Lấy danh sách câu sai của một lượt thi, nhóm theo section.
 * Dùng cho màn review sau khi nộp bài.
 *
 * Route: GET /api/courses/attempts/:attemptId/wrong-answers
 *
 * Response data:
 *   { chapterName, totalQuestions, totalWrong,
 *     sections: [{ sectionTitle, wrongCount, wrongQuestions: [...] }] }
 */
const getWrongAnswersStats = async (req, res) => {
    try {
        const { attemptId } = req.params;

        // Lấy tất cả dòng đáp án của lượt thi (đúng + sai)
        const allAnswers = await studentTestModel.getWrongAnswersDetail(attemptId);
        if (!allAnswers || allAnswers.length === 0) {
            return res.json({ ok: false, message: 'Không tìm thấy dữ liệu lượt thi!' });
        }

        // Đếm tổng câu (mỗi QuestionId chỉ đếm 1 lần)
        const uniqueQuestions = new Set(allAnswers.map((a) => a.QuestionId));
        const totalQuestionsCount = uniqueQuestions.size;

        // Chỉ giữ câu sai
        const wrongAnswersRows = allAnswers.filter(
            (a) => a.IsCorrect === 0 || a.IsCorrect === false,
        );

        // Gộp nhiều dòng đáp án sai của cùng 1 câu (câu chọn nhiều đáp án)
        const wrongQuestionsMap = new Map();
        for (const row of wrongAnswersRows) {
            if (!wrongQuestionsMap.has(row.QuestionId)) {
                wrongQuestionsMap.set(row.QuestionId, { ...row, userChoices: [] });
            }
            wrongQuestionsMap.get(row.QuestionId).userChoices.push(
                row.UserChoiceText || 'Bỏ trống',
            );
        }
        const wrongAnswers = Array.from(wrongQuestionsMap.values());

        // Khung response
        const stats = {
            chapterId: allAnswers[0].ChapterId,
            chapterName: allAnswers[0].ChapterName,
            totalQuestions: totalQuestionsCount,
            totalWrong: wrongAnswers.length,
            sections: [],
        };

        // Nhóm câu sai theo section
        const sectionMap = new Map();
        for (const row of wrongAnswers) {
            if (!sectionMap.has(row.SectionId)) {
                sectionMap.set(row.SectionId, {
                    sectionId: row.SectionId,
                    sectionTitle: row.SectionTitle,
                    wrongCount: 0,
                    wrongQuestions: [],
                });
            }

            const sec = sectionMap.get(row.SectionId);
            sec.wrongCount++;
            sec.wrongQuestions.push({
                questionId: row.QuestionId,
                questionTitle: row.QuestionTitle,
                userChoiceText: row.userChoices.join(', '),
            });
        }

        stats.sections = Array.from(sectionMap.values());
        res.json({ ok: true, data: stats });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};


// =============================================================================
// PHẦN 6: getAttemptSectionStats — STAT THEO SECTION
// =============================================================================

/**
 * Lấy thống kê đúng/sai theo section của một lượt thi.
 * Dữ liệu từ bảng Test_Attempt_Section_Stats (lưu lúc submitTestAttempt).
 *
 * Route: GET /api/courses/:courseId/tests/attempts/:attemptId/section-stats
 *
 * Dùng cho: màn kết quả chi tiết, debug thuật toán đề xuất.
 */
const getAttemptSectionStats = async (req, res) => {
    try {
        const { attemptId } = req.params;

        const rows = await studentTestModel.getAttemptSectionStats(attemptId);
        if (!rows.length) {
            return res.json({
                ok: true,
                data: testAttemptSectionStatsService.buildAttemptSectionStatsSummary([]),
            });
        }

        // Chuẩn hóa PascalCase (DB) → camelCase (service)
        const mappedRows = rows.map((row) => ({
            pathId: row.PathId,
            pathName: row.PathName ?? null,
            pathOrder: row.PathOrder != null ? Number(row.PathOrder) : null,
            typeId: row.TypeId,
            skillType: row.SkillType,
            sectionId: row.SectionId,
            sectionTitle: row.SectionTitle,
            correctCount: row.CorrectCount,
            wrongCount: row.WrongCount,
            totalCount: row.TotalCount,
        }));

        res.json({
            ok: true,
            data: testAttemptSectionStatsService.buildAttemptSectionStatsSummary(mappedRows),
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};


module.exports = {
    getTestMeta,
    startTestAttempt,
    submitTestAttempt,
    getWrongAnswersStats,
    getAttemptSectionStats,
};
