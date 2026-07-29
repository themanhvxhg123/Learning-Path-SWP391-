/**
 * questionBankService — gọi API / stub tối thiểu cho UI còn import.
 * Các hàm khác đã gỡ khi không còn reference trong repo.
 */

import axios from "axios";

const API_BASE = 'http://localhost:5000/api';

const TODO = 'Chỉ giao diện — chưa kết nối server.';

const emptyStats = {
  ok: true,
  hasBank: false,
  questionCountBySkill: { LISTENING: 0, READING: 0, VOCABULARY: 0 },
  listeningSectionGroups: [],
  readingSectionGroups: [],
  vocabularySectionGroups: [],
  totalActive: 0,
};

function mapSectionGroups(groups = []) {
  return (groups ?? []).map((group) => ({
    sectionTempId: group.sectionTempId,
    sectionTitle: group.sectionTitle ?? 'Section',
    availableCount: Math.max(0, Number(group.availableCount ?? 0)),
    isUseForTest: group.isUseForTest !== false,
  }));
}

function mapCourseActiveStatsPayload(payload = {}) {
  const chapters = (payload.chapters ?? []).map((chapter) => ({
    PathId: chapter.PathId,
    PathName: chapter.PathName,
    Order: chapter.Order,
    hasBank: Boolean(chapter.hasBank),
    questionCountBySkill: {
      LISTENING: Number(chapter.questionCountBySkill?.LISTENING) || 0,
      READING: Number(chapter.questionCountBySkill?.READING) || 0,
      VOCABULARY:
        Number(chapter.questionCountBySkill?.VOCABULARY ?? chapter.questionCountBySkill?.WRITING) || 0,
    },
    totalActive: Number(chapter.totalActive) || 0,
    listeningSectionGroups: mapSectionGroups(chapter.listeningSectionGroups),
    readingSectionGroups: mapSectionGroups(chapter.readingSectionGroups),
    vocabularySectionGroups: mapSectionGroups(
      chapter.vocabularySectionGroups ?? chapter.writingSectionGroups,
    ),
  }));

  const questionCountBySkill = {
    LISTENING: Number(payload.questionCountBySkill?.LISTENING) || 0,
    READING: Number(payload.questionCountBySkill?.READING) || 0,
    VOCABULARY:
      Number(payload.questionCountBySkill?.VOCABULARY ?? payload.questionCountBySkill?.WRITING) || 0,
  };

  return {
    ok: true,
    hasBank: Boolean(payload.hasBank),
    bankCount: Number(payload.bankCount) || chapters.filter((chapter) => chapter.hasBank).length,
    chapters,
    questionCountBySkill,
    totalActive: Number(payload.totalActive) || 0,
  };
}

const questionBankService = {
  /** MentorChapterQuizSetupDialog */
  async fetchChapterSections() {
    return { ok: true, questionPathId: null, sections: [] };
  },

  /** MentorChapterQuizSetupDialog */
  async getChapterQuestionBankActiveStats() {
    return { ...emptyStats };
  },

  /** this function use for {MentorQuestionBankDetailPage, MentorChapterQuizSetupDialog} */
  async getCourseQuestionBankActiveStats(courseId) {
    const empty = mapCourseActiveStatsPayload({});

    try {
      const response = await fetch(
        `${API_BASE}/questionBank/courses/${Number(courseId)}/active-stats`,
      );
      const result = await response.json();

      if (!result.status) {
        return { ...empty, ok: false, message: result.message };
      }

      return mapCourseActiveStatsPayload(result.data);
    } catch (error) {
      console.error(error);
      return { ...empty, ok: false, message: 'Không lấy được thống kê ngân hàng câu hỏi' };
    }
  },

  /** courseTestPaperUtils.buildChapterTestPaper / buildCourseTestPaper */
  findQuestionBankByChapter() {
    return { ok: false, message: TODO };
  },

  /** Get list question bank  */
  async getQuestionBankListSummaries() {
    try {
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;

      const response = await fetch(
        `http://localhost:5000/api/questionBank/getAllListQuestionBank?userId=${user.userId}&roleName=${user.roles[0]}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      return {
        status: response.status,
        listQuestionBank: result.data ?? [],
      };
    } catch (error) {
      console.error(error.message);

      return {
        status: false,
        listQuestionBank: [],
      };
    }
  },

  // course without question bank
  async getCourseWithoutQuestionBank() {
    try {
      const resCourses = await axios.post("http://localhost:5000/api/courses/my-courses",
        {
          "userId": 2,
          "roleName": "Mentor"
        }
      )
      const resListQuestionBank = await this.getQuestionBankListSummaries()
      const coursesWithoutQuestionBank = resCourses.data.data.filter(
        (course) =>
          !resListQuestionBank.listQuestionBank.some(
            (qb) => Number(qb.CourseId) === Number(course.CourseId)
          ) ? course : ''
      );
      return coursesWithoutQuestionBank
    } catch (error) {
      console.error(error.message)
    }
  }
};

export default questionBankService;
