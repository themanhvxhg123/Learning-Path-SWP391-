const formatQuestionJson = (QuestionJson) => JSON.parse(QuestionJson)
const questionBankService = {
    normalizationDataQuestionPathModel(data) {
        const dataConvert = data.map((question) => ({
            ...question,
            Questions: JSON.parse(question.Questions)

        }))
        return dataConvert;
    },
};

module.exports = questionBankService;