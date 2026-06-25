/**
 * Mock learning payloads for student CourseLearningPage.
 * TODO: replace with fetchCourseLearning(courseId) API when backend is ready.
 */
import { mentorCourseDetailById } from '@/features/mentor/data/mentorCourseDetailMock';

const MATERIAL_TYPE_MAP = {
  VIDEO: 'video',
  TEXT: 'reading',
  DOC: 'reading',
  TEST: 'quiz',
};

const DURATION_BY_TYPE = {
  video: '12 phút',
  reading: '10 phút',
  quiz: '15 phút',
};

function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapMaterialType(type) {
  return MATERIAL_TYPE_MAP[type] ?? 'reading';
}

function buildLessonMaterials(materials = []) {
  return materials
    .filter((m) => m.MaterialType === 'DOC')
    .map((m) => ({
      id: m.MaterialId,
      title: m.FileName || m.Title || 'Tài liệu đính kèm',
    }));
}

function buildLessonFromNode(node, lessonId) {
  const materials = node.materials ?? [];
  const primary = materials[0];
  const type = mapMaterialType(primary?.MaterialType);
  const textMaterial = materials.find((m) => m.MaterialType === 'TEXT');
  const textBody = stripHtml(textMaterial?.MaterialUrl ?? textMaterial?.Content);
  const body =
    textBody ||
    node.Description ||
    `${node.NodeName}: Nội dung bài học mô phỏng. Khi có backend, phần này sẽ hiển thị video, bài đọc hoặc bài kiểm tra tương ứng.`;

  return {
    id: lessonId,
    title: node.NodeName || `Bài ${lessonId}`,
    duration: DURATION_BY_TYPE[type] ?? '10 phút',
    type,
    status: 'not_started',
    content: {
      objectives: [
        node.Description || 'Nắm vững kiến thức cốt lõi của bài học.',
        'Áp dụng vào tình huống giao tiếp hoặc công việc thực tế.',
      ],
      body,
    },
    materials: buildLessonMaterials(materials),
  };
}

function assignLessonStatuses(modules, { completedRatio = 0.28 } = {}) {
  const all = modules.flatMap((m) => m.lessons);
  if (!all.length) return modules;

  const completedCount = Math.min(
    all.length - 1,
    Math.max(0, Math.floor(all.length * completedRatio)),
  );
  let index = 0;

  return modules.map((mod) => ({
    ...mod,
    lessons: mod.lessons.map((lesson) => {
      let status = 'not_started';
      if (index < completedCount) status = 'completed';
      else if (index === completedCount) status = 'current';
      index += 1;
      return { ...lesson, status };
    }),
  }));
}

function buildModulesFromPaths(paths = [], statusOptions) {
  let lessonId = 1;

  const modules = paths.map((path, pathIndex) => ({
    id: path.PathId ?? pathIndex + 1,
    title: `Chương ${pathIndex + 1}: ${path.PathName}`,
    lessons: (path.nodes ?? []).map((node) => {
      const lesson = buildLessonFromNode(node, lessonId);
      lessonId += 1;
      return lesson;
    }),
  }));

  return assignLessonStatuses(modules, statusOptions);
}

function buildFromCourseDetail(detail, statusOptions) {
  return {
    courseTitle: detail.CourseName ?? 'Khóa học',
    instructor: detail.InstructorName ?? 'Mentor Demo',
    modules: buildModulesFromPaths(detail.paths ?? [], statusOptions),
  };
}

function mkLesson(id, title, duration, type, status, extra = {}) {
  return {
    id,
    title,
    duration,
    type,
    status,
    content: {
      objectives: extra.objectives ?? [
        'Nắm vững mục tiêu và kết quả mong đợi của bài học.',
        'Áp dụng kiến thức vào tình huống thực tế.',
      ],
      body:
        extra.body ??
        `${title}: Đây là nội dung bài học mô phỏng. Khi có backend, phần này sẽ hiển thị bài đọc, slide hoặc transcript tương ứng.`,
    },
    materials: extra.materials ?? (status !== 'not_started'
      ? [
          { id: 1, title: 'Slide bài giảng.pdf' },
          { id: 2, title: 'Bài tập thực hành.docx' },
        ]
      : []),
  };
}

/** Hand-crafted mocks for courses without full path tree in mentor detail. */
const MANUAL_COURSE_LEARNING = {
  2: {
    courseTitle: 'Tiếng Anh Chuyên Ngành Tài Chính - Ngân Hàng',
    instructor: 'Mentor Demo',
    modules: [
      {
        id: 1,
        title: 'Chương 1: Thuật ngữ thị trường tài chính',
        lessons: [
          mkLesson(101, 'Tổng quan hệ thống tài chính quốc tế', '14 phút', 'video', 'completed'),
          mkLesson(102, 'Từ vựng về lãi suất và tín dụng', '16 phút', 'reading', 'completed'),
          mkLesson(103, 'Mini-test: Thuật ngữ ngân hàng cơ bản', '12 phút', 'quiz', 'current'),
        ],
      },
      {
        id: 2,
        title: 'Chương 2: Báo cáo tài chính & phân tích',
        lessons: [
          mkLesson(104, 'Đọc hiểu Balance Sheet', '18 phút', 'video', 'not_started'),
          mkLesson(105, 'Cash Flow Statement — mẫu câu thường gặp', '15 phút', 'reading', 'not_started'),
          mkLesson(106, 'Bài tập: Phân tích báo cáo ngắn', '20 phút', 'quiz', 'not_started'),
        ],
      },
    ],
  },
  5: {
    courseTitle: 'Tiếng Anh Du Lịch & Khám Phá',
    instructor: 'Mentor Demo',
    modules: [
      {
        id: 1,
        title: 'Chương 1: Sân bay & khách sạn',
        lessons: [
          mkLesson(501, 'Check-in và làm thủ tục an ninh', '10 phút', 'video', 'completed'),
          mkLesson(502, 'Đặt phòng và yêu cầu dịch vụ khách sạn', '12 phút', 'reading', 'current'),
          mkLesson(503, 'Quiz: Tình huống tại sân bay', '8 phút', 'quiz', 'not_started'),
        ],
      },
      {
        id: 2,
        title: 'Chương 2: Nhà hàng & mua sắm',
        lessons: [
          mkLesson(504, 'Gọi món và yêu cầu đặc biệt', '14 phút', 'video', 'not_started'),
          mkLesson(505, 'Hỏi giá, size và đổi trả hàng', '11 phút', 'reading', 'not_started'),
        ],
      },
    ],
  },
  8: {
    courseTitle: 'Ngữ pháp tiếng Anh từ cơ bản đến nâng cao',
    instructor: 'Lê Thu Hà',
    modules: [
      {
        id: 1,
        title: 'Chương 1: Thì cơ bản',
        lessons: [
          mkLesson(30, 'Thì hiện tại đơn & liên tục', '15 phút', 'video', 'completed'),
          mkLesson(31, 'Thì quá khứ đơn & liên tục', '14 phút', 'reading', 'current'),
          mkLesson(32, 'Bài tập thì cơ bản', '10 phút', 'quiz', 'not_started'),
        ],
      },
      {
        id: 2,
        title: 'Chương 2: Câu phức & điều kiện',
        lessons: [
          mkLesson(33, 'Mệnh đề quan hệ', '18 phút', 'video', 'not_started'),
          mkLesson(34, 'Câu điều kiện loại 1 và 2', '20 phút', 'reading', 'not_started'),
          mkLesson(35, 'Bài tập câu phức', '12 phút', 'quiz', 'not_started'),
        ],
      },
    ],
  },
  11: {
    courseTitle: 'Phát âm chuẩn giọng Mỹ - Anh',
    instructor: 'Phạm Văn Đức',
    modules: [
      {
        id: 1,
        title: 'Chương 1: Nguyên âm',
        lessons: [
          mkLesson(40, 'Hệ thống nguyên âm tiếng Anh', '12 phút', 'video', 'completed'),
          mkLesson(41, 'Luyện âm /æ/, /ʌ/, /ɑ:/', '16 phút', 'video', 'completed'),
          mkLesson(42, 'Bài tập luyện nguyên âm', '8 phút', 'quiz', 'current'),
        ],
      },
      {
        id: 2,
        title: 'Chương 2: Phụ âm & liên kết âm',
        lessons: [
          mkLesson(43, 'Âm /θ/ và /ð/ — th sounds', '14 phút', 'video', 'not_started'),
          mkLesson(44, 'Kỹ thuật liên kết âm tự nhiên', '18 phút', 'reading', 'not_started'),
        ],
      },
    ],
  },
  18: {
    courseTitle: 'IELTS Listening: Chiến lược làm bài & Luyện đề',
    instructor: 'Trần Quốc Huy',
    modules: [
      {
        id: 1,
        title: 'Chương 1: Làm quen format & chiến lược cơ bản',
        lessons: [
          mkLesson(1801, 'Tổng quan IELTS Listening & cách chấm điểm', '12 phút', 'video', 'completed'),
          mkLesson(1802, 'Kỹ thuật đọc trước câu hỏi (previewing)', '16 phút', 'video', 'current'),
          mkLesson(1803, 'Từ vựng chủ đề thường gặp Section 1–2', '14 phút', 'reading', 'not_started'),
        ],
      },
      {
        id: 2,
        title: 'Chương 2: Section 1 & 2 — Hội thoại & monologue ngắn',
        lessons: [
          mkLesson(1804, 'Form completion: điền thông tin cá nhân', '18 phút', 'video', 'not_started'),
          mkLesson(1805, 'Map & plan labelling trong bối cảnh du lịch', '20 phút', 'video', 'not_started'),
          mkLesson(1806, 'Multiple choice — bẫy paraphrase thường gặp', '15 phút', 'reading', 'not_started'),
          mkLesson(1807, 'Mini-test Section 1 & 2', '22 phút', 'quiz', 'not_started'),
        ],
      },
      {
        id: 3,
        title: 'Chương 3: Section 3 & 4 — Hội thoại học thuật & bài giảng',
        lessons: [
          mkLesson(1808, 'Matching speakers với quan điểm', '19 phút', 'video', 'not_started'),
          mkLesson(1809, 'Note completion trong bài giảng học thuật', '21 phút', 'video', 'not_started'),
          mkLesson(1810, 'Theo dõi luồng ý & tín hiệu chuyển ý', '13 phút', 'reading', 'not_started'),
          mkLesson(1811, 'Mini-test Section 3 & 4', '25 phút', 'quiz', 'not_started'),
        ],
      },
      {
        id: 4,
        title: 'Chương 4: Luyện đề full test & chữa chi tiết',
        lessons: [
          mkLesson(1812, 'Full Test 1 — làm bài có hướng dẫn thời gian', '35 phút', 'video', 'not_started'),
          mkLesson(1813, 'Chữa đề & phân tích lỗi sai phổ biến', '28 phút', 'video', 'not_started'),
          mkLesson(1814, 'Full Test 2 + checklist ôn tập trước thi', '40 phút', 'quiz', 'not_started'),
        ],
      },
    ],
  },
};

function buildFallbackMock(courseId, courseTitle) {
  const title = courseTitle || `Khóa học #${courseId}`;
  return {
    courseTitle: title,
    instructor: 'Mentor Demo',
    modules: [
      {
        id: 1,
        title: 'Chương 1: Làm quen nội dung',
        lessons: [
          mkLesson(
            courseId * 100 + 1,
            'Giới thiệu khóa học & lộ trình học',
            '8 phút',
            'video',
            'completed',
            { body: `Chào mừng bạn đến với ${title}. Đây là bài mở đầu mô phỏng.` },
          ),
          mkLesson(
            courseId * 100 + 2,
            'Từ vựng và mẫu câu cốt lõi',
            '12 phút',
            'reading',
            'current',
          ),
          mkLesson(
            courseId * 100 + 3,
            'Bài tập ôn tập nhanh',
            '10 phút',
            'quiz',
            'not_started',
          ),
        ],
      },
      {
        id: 2,
        title: 'Chương 2: Thực hành',
        lessons: [
          mkLesson(courseId * 100 + 4, 'Video hướng dẫn thực hành', '15 phút', 'video', 'not_started'),
          mkLesson(courseId * 100 + 5, 'Bài đọc mở rộng', '11 phút', 'reading', 'not_started'),
        ],
      },
    ],
  };
}

/**
 * Get mock learning tree for a course.
 * Priority: mentor detail paths → manual mock → generic fallback.
 */
export function getCourseLearningMock(courseId) {
  const id = Number(courseId);
  if (!id) return null;

  const detail = mentorCourseDetailById[id];
  if (detail?.paths?.length) {
    return buildFromCourseDetail(detail);
  }

  if (MANUAL_COURSE_LEARNING[id]) {
    return JSON.parse(JSON.stringify(MANUAL_COURSE_LEARNING[id]));
  }

  return buildFallbackMock(id, detail?.CourseName);
}
