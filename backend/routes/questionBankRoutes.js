const express = require('express')
const router = express.Router()

const questionBankController = require('../controllers/questionBankController')

router.get('/getAllListQuestionBank', questionBankController.getAllListQuestionBankByMentorIdController);

router.get('/courses/:courseId/active-stats', questionBankController.getCourseQuestionBankActiveStatsController);

router.get('/path/questions', questionBankController.getAllQuestionOfPathController);
module.exports = router