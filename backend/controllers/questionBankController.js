const questionBankModel = require('../Models/questionBankModel');

function getInstructorId(req) {
  const userId = req.user?.userId ?? req.headers['x-user-id'];
  const parsed = Number(userId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeQuestionsBody(rawQuestions) {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions
    .map((item, index) => ({
      TypeId: Number(item.TypeId),
      Title: String(item.Title ?? '').trim(),
      URL: item.URL ? String(item.URL).trim() : null,
      Order: Number(item.Order) > 0 ? Number(item.Order) : index + 1,
      IsActive: item.IsActive !== false,
      Choices: (item.Choices ?? []).map((c, i) => ({
        Title: String(c.Title ?? '').trim(),
        Order: Number(c.Order) > 0 ? Number(c.Order) : i + 1,
        IsTrue: Boolean(c.IsTrue),
      })).filter((c) => c.Title),
    }))
    .filter((q) => q.Title && q.TypeId > 0);
}

function parseCoursePathIds(req) {
  return {
    instructorId: getInstructorId(req),
    courseId: parseId(req.params.courseId),
    pathId: parseId(req.params.pathId),
  };
}

const getAllQuestionBankByMentorId = async (req, res) => {
  try {
    const mentorId = getInstructorId(req);
    if (!mentorId) {
      return res.status(401).json({ success: false, message: 'Thiếu x-user-id.', data: [] });
    }
    const banks = await questionBankModel.getQuestionBankByMentorId(mentorId);
    return res.json({ success: true, data: banks });
  } catch (error) {
    console.error('[getAllQuestionBankByMentorId]', error);
    return res.status(500).json({ success: false, message: 'Lỗi server.', data: [] });
  }
};

const getCoursePathBanks = async (req, res) => {
  try {
    const instructorId = getInstructorId(req);
    const courseId = parseId(req.params.courseId);
    if (!instructorId || !courseId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin.', data: [] });
    }
    const data = await questionBankModel.getCoursePathBanks(courseId, instructorId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[getCoursePathBanks]', error);
    return res.status(500).json({ success: false, message: 'Lỗi server.', data: [] });
  }
};

const getPathQuestions = async (req, res) => {
  try {
    const { instructorId, courseId, pathId } = parseCoursePathIds(req);
    if (!instructorId || !courseId || !pathId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
    }

    const data = await questionBankModel.getPathQuestions(courseId, pathId, instructorId);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Chương chưa có ngân hàng câu hỏi.' });
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[getPathQuestions]', error);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

const getBankQuestions = async (req, res) => {
  try {
    const instructorId = getInstructorId(req);
    const bankId = parseId(req.params.bankId);
    const pathId = parseId(req.query.pathId);

    if (!instructorId) {
      return res.status(401).json({ success: false, message: 'Thiếu x-user-id.' });
    }
    if (!bankId || !pathId) {
      return res.status(400).json({ success: false, message: 'Thiếu bankId hoặc pathId.' });
    }

    const data = await questionBankModel.getBankQuestions(bankId, instructorId, pathId);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ngân hàng câu hỏi.' });
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[getBankQuestions]', error);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

const getBankPaths = async (req, res) => {
  try {
    const instructorId = getInstructorId(req);
    const bankId = parseId(req.params.bankId);

    if (!instructorId) {
      return res.status(401).json({ success: false, message: 'Thiếu x-user-id.' });
    }
    if (!bankId) {
      return res.status(400).json({ success: false, message: 'bankId không hợp lệ.' });
    }

    const data = await questionBankModel.getBankPathList(bankId, instructorId);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ngân hàng câu hỏi.' });
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[getBankPaths]', error);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

const createPathQuestions = async (req, res) => {
  try {
    const { instructorId, courseId, pathId } = parseCoursePathIds(req);

    if (!instructorId) {
      return res.status(401).json({ success: false, message: 'Thiếu x-user-id.' });
    }
    if (!courseId || !pathId) {
      return res.status(400).json({ success: false, message: 'courseId hoặc pathId không hợp lệ.' });
    }

    const questions = normalizeQuestionsBody(req.body?.Questions);
    if (!questions.length) {
      return res.status(400).json({ success: false, message: 'Danh sách câu hỏi trống.' });
    }

    const data = await questionBankModel.savePathQuestions({
      courseId,
      pathId,
      instructorId,
      isPublished: Boolean(req.body?.IsPublished),
      bankDescription: req.body?.BankDescription ?? null,
      questions,
    });

    return res.status(201).json({ success: true, message: 'Tạo ngân hàng câu hỏi thành công.', data });
  } catch (error) {
    console.error('[createPathQuestions]', error);
    return res.status(error.statusCode ?? 500).json({
      success: false,
      message: error.message || 'Lỗi server khi lưu ngân hàng câu hỏi.',
    });
  }
};

const patchQuestionActive = async (req, res) => {
  try {
    const { instructorId, courseId, pathId } = parseCoursePathIds(req);
    const questionId = parseId(req.params.questionId);
    const isActive = req.body?.IsActive !== false;

    if (!instructorId || !courseId || !pathId || !questionId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
    }

    const data = await questionBankModel.setQuestionActiveStatus(
      courseId,
      pathId,
      questionId,
      instructorId,
      isActive,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[patchQuestionActive]', error);
    return res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
  }
};

const deletePathQuestion = async (req, res) => {
  try {
    const { instructorId, courseId, pathId } = parseCoursePathIds(req);
    const questionId = parseId(req.params.questionId);

    if (!instructorId || !courseId || !pathId || !questionId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
    }

    const data = await questionBankModel.deleteQuestionById(
      courseId,
      pathId,
      questionId,
      instructorId,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[deletePathQuestion]', error);
    return res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
  }
};

const patchAllQuestionsActive = async (req, res) => {
  try {
    const { instructorId, courseId, pathId } = parseCoursePathIds(req);
    const isActive = req.body?.IsActive !== false;

    if (!instructorId || !courseId || !pathId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
    }

    const data = await questionBankModel.setAllPathQuestionsActive(
      courseId,
      pathId,
      instructorId,
      isActive,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[patchAllQuestionsActive]', error);
    return res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllQuestionBankByMentorId,
  getCoursePathBanks,
  getPathQuestions,
  getBankQuestions,
  getBankPaths,
  createPathQuestions,
  patchQuestionActive,
  deletePathQuestion,
  patchAllQuestionsActive,
};
