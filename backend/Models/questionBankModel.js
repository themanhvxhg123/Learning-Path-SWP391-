const { sql } = require('../config/db');

function normalizeTitle(title) {
  return String(title ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function findDuplicateTitles(questions) {
  const seen = new Set();
  const duplicates = [];
  for (const q of questions) {
    const key = `${q.TypeId}::${normalizeTitle(q.Title)}`;
    if (seen.has(key)) duplicates.push(q.Title);
    else seen.add(key);
  }
  return [...new Set(duplicates)];
}

const getQuestionBankByMentorId = async (mentorId) => {
  const request = new sql.Request();
  request.input('mentorId', sql.Int, mentorId);
  const result = await request.query(`
    SELECT qb.BankId, qb.CourseId, c.Thumbnail, qb.InstructorId,
           qb.CourseName, qb.CourseDescription, qb.BankDescription, qb.UpdatedAt
    FROM Question_Bank qb
    JOIN Courses c ON qb.CourseId = c.CourseId
    WHERE qb.InstructorId = @mentorId
  `);
  return result.recordset;
};

async function assertCoursePath(courseId, pathId, instructorId) {
  const request = new sql.Request();
  request.input('courseId', sql.Int, courseId);
  request.input('pathId', sql.Int, pathId);

  const result = await request.query(`
    SELECT c.CourseId, c.CourseName, c.Description, c.InstructorId, p.PathId, p.PathName
    FROM Courses c
    INNER JOIN Paths p ON p.CourseId = c.CourseId AND p.PathId = @pathId
    WHERE c.CourseId = @courseId
  `);

  const row = result.recordset[0];
  if (!row) return { ok: false, message: 'Không tìm thấy khóa học hoặc chương.' };
  if (Number(row.InstructorId) !== Number(instructorId)) {
    return { ok: false, message: 'Bạn không có quyền với khóa học này.' };
  }
  return { ok: true, data: row };
}

/** Seed QuestionType nếu bảng trống. */
async function ensureQuestionTypes(tx) {
  const req = new sql.Request(tx);
  const countRes = await req.query('SELECT COUNT(*) AS Total FROM QuestionType');
  if (Number(countRes.recordset[0]?.Total) > 0) return;

  await req.query('SET IDENTITY_INSERT QuestionType ON');
  await req.query(`
    INSERT INTO QuestionType (TypeId, Name) VALUES
      (1, 'LISTENING'),
      (2, 'READING'),
      (3, 'MCQ')
  `);
  await req.query('SET IDENTITY_INSERT QuestionType OFF');
}

/** Tên skill UI → các alias có thể có trong bảng QuestionType. */
const UI_TYPE_NAME_ALIASES = {
  1: ['LISTENING'],
  2: ['READING'],
  3: ['MCQ', 'WRITING', 'VOCABULARY'],
};

/** Map TypeId UI (1/2/3) sang TypeId thật trong DB. */
async function mapQuestionsTypeIds(questions, tx) {
  const req = new sql.Request(tx);
  const result = await req.query('SELECT TypeId, RTRIM(Name) AS Name FROM QuestionType');
  const byName = {};
  for (const row of result.recordset) {
    byName[String(row.Name).trim().toUpperCase()] = row.TypeId;
  }

  return questions.map((q) => {
    const aliases = UI_TYPE_NAME_ALIASES[q.TypeId] ?? [];
    for (const alias of aliases) {
      if (byName[alias]) return { ...q, TypeId: byName[alias] };
    }
    return { ...q, TypeId: byName[aliases[0]] ?? q.TypeId };
  });
}

async function getQuestionPathId(bankId, pathId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('bankId', sql.Int, bankId);
  request.input('pathId', sql.Int, pathId);
  const result = await request.query(`
    SELECT Question_Path_Id FROM Questions_Path
    WHERE BankId = @bankId AND PathId = @pathId
  `);
  return result.recordset[0]?.Question_Path_Id ?? null;
}

/** Danh sách chương đã có câu hỏi trong khóa học. */
async function getCoursePathBanks(courseId, instructorId) {
  const request = new sql.Request();
  request.input('courseId', sql.Int, courseId);
  request.input('instructorId', sql.Int, instructorId);

  const result = await request.query(`
    SELECT qp.PathId, p.PathName, qb.BankId, qb.UpdatedAt,
           COUNT(q.QuestionId) AS QuestionCount
    FROM Question_Bank qb
    JOIN Questions_Path qp ON qp.BankId = qb.BankId
    JOIN Paths p ON p.PathId = qp.PathId
    LEFT JOIN Questions q ON q.Question_Path_Id = qp.Question_Path_Id
    WHERE qb.CourseId = @courseId AND qb.InstructorId = @instructorId
    GROUP BY qp.PathId, p.PathName, qb.BankId, qb.UpdatedAt
    HAVING COUNT(q.QuestionId) > 0
  `);

  return result.recordset;
}

/** Danh sách Questions_Path của 1 bank (theo BankId). */
async function getBankPathList(bankId, instructorId) {
  const bankReq = new sql.Request();
  bankReq.input('bankId', sql.Int, bankId);
  bankReq.input('instructorId', sql.Int, instructorId);

  const bankRes = await bankReq.query(`
    SELECT BankId, CourseId, CourseName, UpdatedAt
    FROM Question_Bank
    WHERE BankId = @bankId AND InstructorId = @instructorId
  `);

  const bank = bankRes.recordset[0];
  if (!bank) return null;

  const pathReq = new sql.Request();
  pathReq.input('bankId', sql.Int, bankId);
  pathReq.input('courseId', sql.Int, bank.CourseId);

  const pathRes = await pathReq.query(`
    SELECT qp.PathId, p.PathName, qp.Question_Path_Id,
           COUNT(q.QuestionId) AS QuestionCount
    FROM Questions_Path qp
    JOIN Paths p ON p.PathId = qp.PathId AND p.CourseId = @courseId
    LEFT JOIN Questions q ON q.Question_Path_Id = qp.Question_Path_Id
    WHERE qp.BankId = @bankId
    GROUP BY qp.PathId, p.PathName, qp.Question_Path_Id, p.[Order]
    ORDER BY p.[Order], qp.PathId
  `);

  return {
    BankId: bank.BankId,
    CourseId: bank.CourseId,
    CourseName: bank.CourseName,
    UpdatedAt: bank.UpdatedAt,
    Paths: pathRes.recordset.map((row) => ({
      PathId: row.PathId,
      PathName: row.PathName,
      Question_Path_Id: row.Question_Path_Id,
      QuestionCount: Number(row.QuestionCount) || 0,
    })),
  };
}

/** Lấy câu hỏi theo BankId + PathId (bắt buộc có pathId). */
async function getBankQuestions(bankId, instructorId, pathId) {
  if (!pathId) return null;

  const bankReq = new sql.Request();
  bankReq.input('bankId', sql.Int, bankId);
  bankReq.input('instructorId', sql.Int, instructorId);

  const bankRes = await bankReq.query(`
    SELECT BankId, CourseId FROM Question_Bank
    WHERE BankId = @bankId AND InstructorId = @instructorId
  `);

  const bank = bankRes.recordset[0];
  if (!bank) return null;

  const checkReq = new sql.Request();
  checkReq.input('bankId', sql.Int, bankId);
  checkReq.input('pathId', sql.Int, pathId);
  const checkRes = await checkReq.query(`
    SELECT Question_Path_Id FROM Questions_Path
    WHERE BankId = @bankId AND PathId = @pathId
  `);
  if (!checkRes.recordset[0]) return null;

  return getPathQuestions(bank.CourseId, pathId, instructorId);
}

/** Lấy câu hỏi + đáp án của 1 chương. */
async function getPathQuestions(courseId, pathId, instructorId) {
  const access = await assertCoursePath(courseId, pathId, instructorId);
  if (!access.ok) return null;
  const meta = access.data;

  const request = new sql.Request();
  request.input('courseId', sql.Int, courseId);
  request.input('pathId', sql.Int, pathId);

  const result = await request.query(`
    SELECT qb.BankId, qp.Question_Path_Id,
           q.QuestionId, q.Title, q.TypeId, q.URL, q.[Order], q.IsActive,
           c.ChoiceId, c.Title AS ChoiceTitle, c.[Order] AS ChoiceOrder, c.IsTrue
    FROM Question_Bank qb
    JOIN Questions_Path qp ON qp.BankId = qb.BankId AND qp.PathId = @pathId
    JOIN Questions q ON q.Question_Path_Id = qp.Question_Path_Id
    LEFT JOIN Question_Choices c ON c.QuestionId = q.QuestionId
    WHERE qb.CourseId = @courseId
    ORDER BY q.TypeId, q.[Order], c.[Order]
  `);

  if (result.recordset.length === 0) return null;

  const row0 = result.recordset[0];
  const questionsMap = new Map();

  for (const row of result.recordset) {
    if (!questionsMap.has(row.QuestionId)) {
      questionsMap.set(row.QuestionId, {
        QuestionId: row.QuestionId,
        Title: row.Title,
        TypeId: row.TypeId,
        URL: row.URL,
        Order: row.Order,
        IsActive: row.IsActive,
        Choices: [],
      });
    }
    if (row.ChoiceId) {
      questionsMap.get(row.QuestionId).Choices.push({
        ChoiceId: row.ChoiceId,
        Title: row.ChoiceTitle,
        Order: row.ChoiceOrder,
        IsTrue: row.IsTrue,
      });
    }
  }

  return {
    BankId: row0.BankId,
    Question_Path_Id: row0.Question_Path_Id,
    PathId: meta.PathId,
    PathName: meta.PathName,
    CourseId: meta.CourseId,
    CourseName: meta.CourseName,
    Questions: [...questionsMap.values()],
  };
}

async function insertQuestionBank(tx, data) {
  const req = new sql.Request(tx);
  req.input('instructorId', sql.Int, data.instructorId);
  req.input('courseId', sql.Int, data.courseId);
  req.input('courseName', sql.NVarChar(200), data.courseName);
  req.input('courseDescription', sql.NVarChar(200), data.courseDescription ?? '');
  req.input('bankDescription', sql.NVarChar(200), data.bankDescription ?? null);
  req.input('isPublished', sql.Bit, data.isPublished ? 1 : 0);

  const result = await req.query(`
    INSERT INTO Question_Bank (
      InstructorId, CourseId, CourseName, CourseDescription,
      BankDescription, CreatedAt, UpdatedAt, IsPublished
    )
    OUTPUT INSERTED.BankId
    VALUES (
      @instructorId, @courseId, @courseName, @courseDescription,
      @bankDescription, SYSDATETIME(), SYSDATETIME(), @isPublished
    )
  `);
  return result.recordset[0].BankId;
}

async function insertQuestionPath(tx, bankId, pathId) {
  const req = new sql.Request(tx);
  req.input('bankId', sql.Int, bankId);
  req.input('pathId', sql.Int, pathId);
  const result = await req.query(`
    INSERT INTO Questions_Path (BankId, PathId)
    OUTPUT INSERTED.Question_Path_Id
    VALUES (@bankId, @pathId)
  `);
  return result.recordset[0].Question_Path_Id;
}

async function insertQuestion(tx, questionPathId, question) {
  const req = new sql.Request(tx);
  req.input('title', sql.NVarChar(sql.MAX), question.Title);
  req.input('questionPathId', sql.Int, questionPathId);
  req.input('isActive', sql.Bit, question.IsActive === false ? 0 : 1);
  req.input('typeId', sql.Int, question.TypeId);
  req.input('url', sql.NVarChar(sql.MAX), question.URL ?? null);
  req.input('order', sql.Int, question.Order);

  const result = await req.query(`
    INSERT INTO Questions (Title, Question_Path_Id, IsActive, TypeId, URL, [Order])
    OUTPUT INSERTED.QuestionId
    VALUES (@title, @questionPathId, @isActive, @typeId, @url, @order)
  `);

  const questionId = result.recordset[0].QuestionId;
  for (const choice of question.Choices ?? []) {
    const choiceReq = new sql.Request(tx);
    choiceReq.input('questionId', sql.Int, questionId);
    choiceReq.input('title', sql.NVarChar(250), choice.Title);
    choiceReq.input('order', sql.Int, choice.Order);
    choiceReq.input('isTrue', sql.Bit, choice.IsTrue ? 1 : 0);
    await choiceReq.query(`
      INSERT INTO Question_Choices (QuestionId, Title, [Order], IsTrue)
      VALUES (@questionId, @title, @order, @isTrue)
    `);
  }
}

/** Tạo ngân hàng câu hỏi cho 1 chương (lần đầu). */
async function savePathQuestions({ courseId, pathId, instructorId, isPublished, bankDescription, questions }) {
  if (!courseId || !pathId || !instructorId) {
    const error = new Error('Thiếu courseId, pathId hoặc instructorId.');
    error.statusCode = 400;
    throw error;
  }

  const access = await assertCoursePath(courseId, pathId, instructorId);
  if (!access.ok) {
    const error = new Error(access.message);
    error.statusCode = 403;
    throw error;
  }
  const meta = access.data;

  const duplicates = findDuplicateTitles(questions);
  if (duplicates.length) {
    const error = new Error(`Câu hỏi trùng tiêu đề: ${duplicates.join('; ')}`);
    error.statusCode = 409;
    throw error;
  }

  const pool = await sql.connect();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    await ensureQuestionTypes(tx);
    const mappedQuestions = await mapQuestionsTypeIds(questions, tx);

    const bankReq = new sql.Request(tx);
    bankReq.input('courseId', sql.Int, courseId);
    const bankRow = await bankReq.query(`SELECT BankId FROM Question_Bank WHERE CourseId = @courseId`);

    let bankId = bankRow.recordset[0]?.BankId;
    if (!bankId) {
      bankId = await insertQuestionBank(tx, {
        instructorId,
        courseId,
        courseName: meta.CourseName,
        courseDescription: String(meta.Description ?? '').slice(0, 200),
        bankDescription,
        isPublished,
      });
    } else {
      const updateReq = new sql.Request(tx);
      updateReq.input('bankId', sql.Int, bankId);
      updateReq.input('bankDescription', sql.NVarChar(200), bankDescription ?? null);
      updateReq.input('isPublished', sql.Bit, isPublished ? 1 : 0);
      await updateReq.query(`
        UPDATE Question_Bank
        SET BankDescription = COALESCE(@bankDescription, BankDescription),
            IsPublished = @isPublished, UpdatedAt = SYSDATETIME()
        WHERE BankId = @bankId
      `);
    }

    let questionPathId = await getQuestionPathId(bankId, pathId, tx);
    if (questionPathId) {
      const countReq = new sql.Request(tx);
      countReq.input('questionPathId', sql.Int, questionPathId);
      const countRes = await countReq.query(`
        SELECT COUNT(*) AS Total FROM Questions WHERE Question_Path_Id = @questionPathId
      `);
      if (Number(countRes.recordset[0]?.Total) > 0) {
        const error = new Error('Chương này đã có ngân hàng câu hỏi.');
        error.statusCode = 409;
        throw error;
      }
    } else {
      questionPathId = await insertQuestionPath(tx, bankId, pathId);
    }

    for (const question of mappedQuestions) {
      await insertQuestion(tx, questionPathId, question);
    }

    await tx.commit();
    return { BankId: bankId, PathId: pathId, CourseId: courseId, QuestionCount: mappedQuestions.length };
  } catch (error) {
    try {
      await tx.rollback();
    } catch {
      // ignore rollback error
    }
    throw error;
  }
}

/** Kiểm tra câu hỏi thuộc chương của khóa học. */
async function assertQuestionInPath(courseId, pathId, questionId, instructorId) {
  const access = await assertCoursePath(courseId, pathId, instructorId);
  if (!access.ok) return access;

  const req = new sql.Request();
  req.input('courseId', sql.Int, courseId);
  req.input('pathId', sql.Int, pathId);
  req.input('questionId', sql.Int, questionId);

  const result = await req.query(`
    SELECT q.QuestionId
    FROM Questions q
    JOIN Questions_Path qp ON q.Question_Path_Id = qp.Question_Path_Id
    JOIN Question_Bank qb ON qp.BankId = qb.BankId
    WHERE q.QuestionId = @questionId AND qp.PathId = @pathId AND qb.CourseId = @courseId
  `);

  if (!result.recordset[0]) {
    return { ok: false, message: 'Không tìm thấy câu hỏi.' };
  }
  return { ok: true };
}

async function setQuestionActiveStatus(courseId, pathId, questionId, instructorId, isActive) {
  const check = await assertQuestionInPath(courseId, pathId, questionId, instructorId);
  if (!check.ok) {
    const error = new Error(check.message);
    error.statusCode = 404;
    throw error;
  }

  const req = new sql.Request();
  req.input('questionId', sql.Int, questionId);
  req.input('isActive', sql.Bit, isActive ? 1 : 0);
  await req.query(`UPDATE Questions SET IsActive = @isActive WHERE QuestionId = @questionId`);

  await touchBankUpdatedAtByPath(courseId, pathId);
  return { QuestionId: questionId, IsActive: Boolean(isActive) };
}

async function deleteQuestionById(courseId, pathId, questionId, instructorId) {
  const check = await assertQuestionInPath(courseId, pathId, questionId, instructorId);
  if (!check.ok) {
    const error = new Error(check.message);
    error.statusCode = 404;
    throw error;
  }

  const req = new sql.Request();
  req.input('questionId', sql.Int, questionId);
  await req.query(`DELETE FROM Question_Choices WHERE QuestionId = @questionId`);
  await req.query(`DELETE FROM Questions WHERE QuestionId = @questionId`);

  await touchBankUpdatedAtByPath(courseId, pathId);
  return { QuestionId: questionId };
}

async function setAllPathQuestionsActive(courseId, pathId, instructorId, isActive) {
  const access = await assertCoursePath(courseId, pathId, instructorId);
  if (!access.ok) {
    const error = new Error(access.message);
    error.statusCode = 403;
    throw error;
  }

  const req = new sql.Request();
  req.input('courseId', sql.Int, courseId);
  req.input('pathId', sql.Int, pathId);
  req.input('isActive', sql.Bit, isActive ? 1 : 0);

  const result = await req.query(`
    UPDATE q SET IsActive = @isActive
    FROM Questions q
    INNER JOIN Questions_Path qp ON q.Question_Path_Id = qp.Question_Path_Id
    INNER JOIN Question_Bank qb ON qp.BankId = qb.BankId
    WHERE qp.PathId = @pathId AND qb.CourseId = @courseId
  `);

  await touchBankUpdatedAtByPath(courseId, pathId);
  return { IsActive: Boolean(isActive), Affected: result.rowsAffected?.[0] ?? 0 };
}

async function touchBankUpdatedAtByPath(courseId, pathId) {
  const req = new sql.Request();
  req.input('courseId', sql.Int, courseId);
  req.input('pathId', sql.Int, pathId);
  await req.query(`
    UPDATE qb SET UpdatedAt = SYSDATETIME()
    FROM Question_Bank qb
    INNER JOIN Questions_Path qp ON qp.BankId = qb.BankId
    WHERE qb.CourseId = @courseId AND qp.PathId = @pathId
  `);
}

module.exports = {
  getQuestionBankByMentorId,
  getCoursePathBanks,
  getBankPathList,
  getBankQuestions,
  getPathQuestions,
  savePathQuestions,
  setQuestionActiveStatus,
  deleteQuestionById,
  setAllPathQuestionsActive,
};
