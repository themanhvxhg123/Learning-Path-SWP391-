/**
 * Demo paper khi chưa có config/bank — phục vụ thiết kế UI.
 * TODO: remove fallback khi API backend sẵn sàng.
 */
import {
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
} from '@/features/mentor/utils/mentorTestContentUtils';

const DEMO_AUDIO = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

function opt(id, text) {
  return { tempId: id, optionText: text };
}

function q(id, text, options, allowMultiple = false) {
  return {
    tempId: id,
    questionType: 'MULTIPLE_CHOICE',
    questionText: text,
    allowMultipleAnswers: allowMultiple,
    order: 0,
    options,
    audioUrl: null,
  };
}

export function createDemoTestMeta(scope = 'chapter') {
  return {
    title: scope === 'final' ? 'Quiz toàn khóa (demo)' : 'Quiz cuối chương (demo)',
    scope,
    timeLimitMinutes: scope === 'final' ? 45 : 15,
    passingScore: 70,
    maxAttempts: 3,
    totalQuestions: 6,
    attemptsUsed: 0,
    remainingAttempts: 3,
    enabled: true,
    isDemo: true,
  };
}

export function createDemoTestPaper() {
  const listeningGroups = [
    {
      groupId: 'demo-listening-1',
      displayName: 'Đoạn hội thoại 1',
      audioUrl: DEMO_AUDIO,
      questions: [
        {
          ...q(
            'demo-l1',
            'Nghe đoạn hội thoại. Người nói đang ở đâu?',
            [
              opt('demo-l1-a', 'At the office reception'),
              opt('demo-l1-b', 'In a meeting room'),
              opt('demo-l1-c', 'At the airport'),
              opt('demo-l1-d', 'In the cafeteria'),
            ],
          ),
          order: 1,
          audioUrl: DEMO_AUDIO,
        },
      ],
    },
    {
      groupId: 'demo-listening-2',
      displayName: 'Đoạn hội thoại 2',
      audioUrl: DEMO_AUDIO,
      questions: [
        {
          ...q(
            'demo-l2',
            'Chọn ý chính của đoạn nghe:',
            [
              opt('demo-l2-a', 'Scheduling a follow-up meeting'),
              opt('demo-l2-b', 'Canceling a business trip'),
              opt('demo-l2-c', 'Applying for a new position'),
              opt('demo-l2-d', 'Resigning from the company'),
            ],
          ),
          order: 2,
          audioUrl: DEMO_AUDIO,
        },
      ],
    },
  ];

  const readingGroups = [
    {
      groupId: 'demo-reading-1',
      displayName: 'Điền từ vào chỗ trống',
      audioUrl: null,
      questions: [
        {
          ...q(
            'demo-r1',
            'Choose the best word: The manager asked us to submit the report ___ Friday.',
            [
              opt('demo-r1-a', 'on'),
              opt('demo-r1-b', 'in'),
              opt('demo-r1-c', 'at'),
              opt('demo-r1-d', 'by'),
            ],
          ),
          order: 3,
        },
      ],
    },
    {
      groupId: 'demo-reading-2',
      displayName: 'Ngữ pháp',
      audioUrl: null,
      questions: [
        {
          ...q(
            'demo-r2',
            'Which sentence is grammatically correct?',
            [
              opt('demo-r2-a', "She don't agree with the proposal."),
              opt('demo-r2-b', "She doesn't agree with the proposal."),
              opt('demo-r2-c', 'She not agree with the proposal.'),
              opt('demo-r2-d', 'She agree not with the proposal.'),
            ],
          ),
          order: 4,
        },
      ],
    },
  ];

  const writingGroups = [
    {
      groupId: 'demo-writing-1',
      displayName: 'Từ vựng',
      audioUrl: null,
      questions: [
        {
          ...q(
            'demo-w1',
            'Chọn từ đồng nghĩa với "deadline":',
            [
              opt('demo-w1-a', 'holiday'),
              opt('demo-w1-b', 'due date'),
              opt('demo-w1-c', 'break time'),
              opt('demo-w1-d', 'overtime'),
            ],
          ),
          order: 5,
        },
      ],
    },
    {
      groupId: 'demo-writing-2',
      displayName: 'Chọn nhiều đáp án',
      audioUrl: null,
      questions: [
        {
          ...q(
            'demo-w2',
            'Chọn TẤT CẢ từ chỉ nơi làm việc:',
            [
              opt('demo-w2-a', 'headquarters'),
              opt('demo-w2-b', 'branch office'),
              opt('demo-w2-c', 'vacation'),
              opt('demo-w2-d', 'warehouse'),
            ],
            true,
          ),
          order: 6,
        },
      ],
    },
  ];

  const sections = [
    {
      skillType: TEST_SKILL_LISTENING,
      displayName: 'Phần Nghe',
      description: 'Nghe audio và chọn đáp án đúng.',
      audioUrl: DEMO_AUDIO,
      questionGroups: listeningGroups,
      questions: listeningGroups.flatMap((group) => group.questions),
    },
    {
      skillType: TEST_SKILL_READING,
      displayName: 'Phần Đọc',
      description: 'Đọc câu hỏi và chọn đáp án phù hợp.',
      audioUrl: null,
      questionGroups: readingGroups,
      questions: readingGroups.flatMap((group) => group.questions),
    },
    {
      skillType: TEST_SKILL_WRITING,
      displayName: 'Phần Từ vựng / Ngữ pháp',
      description: 'Chọn đáp án đúng về từ vựng và ngữ pháp.',
      audioUrl: null,
      questionGroups: writingGroups,
      questions: writingGroups.flatMap((group) => group.questions),
    },
  ];

  return {
    paperId: `demo_paper_${Date.now()}`,
    totalQuestions: 6,
    totalScore: 100,
    scoringMode: 'AUTO',
    sections,
  };
}

/** Answer key for demo grading (mock only). */
export const DEMO_ANSWER_KEY = {
  'demo-l1': ['demo-l1-a'],
  'demo-l2': ['demo-l2-a'],
  'demo-r1': ['demo-r1-d'],
  'demo-r2': ['demo-r2-b'],
  'demo-w1': ['demo-w1-b'],
  'demo-w2': ['demo-w2-a', 'demo-w2-b', 'demo-w2-d'],
};
