const express = require('express');
const router = express.Router();
const {
  getAllQuestionBankByMentorId,
  getCoursePathBanks,
  getPathQuestions,
  getBankQuestions,
  getBankPaths,
  createPathQuestions,
  patchQuestionActive,
  deletePathQuestion,
  patchAllQuestionsActive,
} = require('../controllers/questionBankController');

router.use((req, _res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) req.user = { userId: Number(userId) };
  next();
});

router.get('/getAll', getAllQuestionBankByMentorId);
router.get('/courses/:courseId/path-banks', getCoursePathBanks);
router.get('/courses/:courseId/paths/:pathId/questions', getPathQuestions);
router.post('/courses/:courseId/paths/:pathId/questions', createPathQuestions);
router.patch('/courses/:courseId/paths/:pathId/questions/active-all', patchAllQuestionsActive);
router.patch('/courses/:courseId/paths/:pathId/questions/:questionId/active', patchQuestionActive);
router.delete('/courses/:courseId/paths/:pathId/questions/:questionId', deletePathQuestion);
router.get('/:bankId/paths', getBankPaths);
router.get('/:bankId/questions', getBankQuestions);

module.exports = router;
