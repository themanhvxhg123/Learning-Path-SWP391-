/**
 * Docx alignment test suite — Thuật toán đề xuất câu hỏi.docx
 * Nội dung docx trong code: backend/services/testRecommendationDocx.js
 * Run: npm run test:recommendation (from backend/)
 *   or: node backend/test/testRecommendationService.docx.test.js
 */
const assert = require('assert');
const svc = require('../services/testRecommendationService');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  }
}

function mapToObj(map) {
  if (!map || !(map instanceof Map)) return map;
  return Object.fromEntries(map);
}

function listeningAllocation(result) {
  return mapToObj(result.chapterSectionCounts?.LISTENING);
}

function vocabSectionCountsByChapter(plan = []) {
  const counts = {};
  for (const entry of plan) {
    const pathId = entry.sectionTempId.split('::')[0];
    counts[pathId] = (counts[pathId] || 0) + 1;
  }
  return counts;
}

function vocabQuestionCountsByChapter(plan = []) {
  const counts = {};
  for (const entry of plan) {
    const pathId = entry.sectionTempId.split('::')[0];
    counts[pathId] = (counts[pathId] || 0) + entry.questionCount;
  }
  return counts;
}

function buildListeningBank(pathIds = [1, 2, 3], sectionsPerChapter = 6) {
  const bank = [];
  for (const pathId of pathIds) {
    for (let sid = 1; sid <= sectionsPerChapter; sid += 1) {
      bank.push({
        PathId: pathId,
        SectionId: sid,
        SkillType: 'LISTENING',
        IsUseForTest: 1,
        QuestionCount: 20,
      });
    }
  }
  return bank;
}

function buildVocabBank(pathIds = [1, 2, 3], sectionsPerChapter = 6, questionsPerSection = 10) {
  const bank = [];
  for (const pathId of pathIds) {
    for (let sid = 1; sid <= sectionsPerChapter; sid += 1) {
      bank.push({
        PathId: pathId,
        SectionId: sid,
        SkillType: 'VOCABULARY',
        IsUseForTest: 1,
        QuestionCount: questionsPerSection,
      });
    }
  }
  return bank;
}

const mentorListening5 = {
  selectedChapterIds: ['1', '2', '3'],
  questionConfigs: [
    { part: 'LISTENING', sectionCount: 5, sectionQuestionCounts: [] },
    { part: 'READING', sectionCount: 0, sectionQuestionCounts: [] },
    { part: 'VOCABULARY', sectionCount: 0, sectionQuestionCounts: [] },
  ],
};

const mentorVocab12 = {
  selectedChapterIds: ['1', '2', '3'],
  questionConfigs: [
    { part: 'LISTENING', sectionCount: 0, sectionQuestionCounts: [] },
    { part: 'READING', sectionCount: 0, sectionQuestionCounts: [] },
    {
      part: 'VOCABULARY',
      sectionCount: 12,
      sectionQuestionCounts: [
        ...[1, 2, 3, 4].map((i) => ({ sectionTempId: `1::section_${i}`, questionCount: 3 })),
        ...[1, 2, 3, 4].map((i) => ({ sectionTempId: `2::section_${i}`, questionCount: 4 })),
        ...[1, 2, 3, 4].map((i) => ({ sectionTempId: `3::section_${i}`, questionCount: 5 })),
      ],
    },
  ],
};

const mentorVocab49 = {
  selectedChapterIds: ['1', '2', '3'],
  questionConfigs: [
    { part: 'LISTENING', sectionCount: 0, sectionQuestionCounts: [] },
    { part: 'READING', sectionCount: 0, sectionQuestionCounts: [] },
    {
      part: 'VOCABULARY',
      sectionCount: 3,
      sectionQuestionCounts: [
        { sectionTempId: '1::section_1', questionCount: 13 },
        { sectionTempId: '2::section_1', questionCount: 17 },
        { sectionTempId: '3::section_1', questionCount: 19 },
      ],
    },
  ],
};

function readingAllocation(result) {
  return mapToObj(result.chapterSectionCounts?.READING);
}

function buildReadingBank(pathIds = [1, 2, 3], sectionsPerChapter = 6) {
  const bank = [];
  for (const pathId of pathIds) {
    for (let sid = 1; sid <= sectionsPerChapter; sid += 1) {
      bank.push({
        PathId: pathId,
        SectionId: sid,
        SkillType: 'READING',
        IsUseForTest: 1,
        QuestionCount: 20,
      });
    }
  }
  return bank;
}

function assertTotalSections(alloc, max) {
  const total = Object.values(alloc).reduce((s, n) => s + n, 0);
  assert.ok(total <= max, `tổng section ${total} vượt mentor ${max}`);
  return total;
}

function assertExactTotalSections(alloc, expected) {
  const total = Object.values(alloc).reduce((s, n) => s + n, 0);
  assert.strictEqual(total, expected, `tổng section ${total} !== ${expected}`);
  return total;
}

function chapterWeightsFromStats(stats, skillType) {
  const chapters = new Map();
  for (const row of stats) {
    if (row.skillType !== skillType) continue;
    const pathId = Number(row.pathId);
    if (!pathId) continue;
    const bucket = chapters.get(pathId) ?? { wrongCount: 0, totalCount: 0 };
    bucket.wrongCount += Number(row.wrongCount) || 0;
    bucket.totalCount += Number(row.totalCount) || 0;
    chapters.set(pathId, bucket);
  }
  return Object.fromEntries(
    [...chapters.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([pathId, bucket]) => [
        pathId,
        bucket.totalCount > 0 ? bucket.wrongCount / bucket.totalCount : 0,
      ]),
  );
}

function mentorListeningConfig(sectionCount, chapters = ['1', '2', '3']) {
  return {
    selectedChapterIds: chapters,
    questionConfigs: [
      { part: 'LISTENING', sectionCount, sectionQuestionCounts: [] },
      { part: 'READING', sectionCount: 0, sectionQuestionCounts: [] },
      { part: 'VOCABULARY', sectionCount: 0, sectionQuestionCounts: [] },
    ],
  };
}

const mentorReading5 = {
  selectedChapterIds: ['1', '2', '3'],
  questionConfigs: [
    { part: 'LISTENING', sectionCount: 0, sectionQuestionCounts: [] },
    { part: 'READING', sectionCount: 5, sectionQuestionCounts: [] },
    { part: 'VOCABULARY', sectionCount: 0, sectionQuestionCounts: [] },
  ],
};

const readingBank = buildReadingBank();
const listeningBank = buildListeningBank();
const vocabBank = buildVocabBank();

console.log('\n=== Công thức 1: aggregateChapterWeights ===');
test('Gom nhiều section cùng chương → weight = tổng sai / tổng câu', () => {
  const stats = [
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 6, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 2, wrongCount: 6, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 3: 5 });
});

test('Weight = 0 khi làm đúng hết (wrongCount=0)', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.strictEqual(listeningAllocation(result)[1], undefined);
});

console.log('\n=== Đọc: cùng quy tắc Nghe ===');
test('Đọc Case 2 docx → {1:1, 2:3, 3:1}', () => {
  const stats = [
    { pathId: 1, skillType: 'READING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'READING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'READING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorReading5, readingBank);
  assert.deepStrictEqual(readingAllocation(result), { 1: 1, 2: 3, 3: 1 });
  assertTotalSections(readingAllocation(result), 5);
});

test('Đọc Case 1: đủ chương + weight bằng nhau → mentor config', () => {
  const stats = [1, 2, 3].map((pathId) => ({
    pathId,
    skillType: 'READING',
    sectionId: 1,
    wrongCount: 4,
    totalCount: 8,
  }));
  const result = svc.recommendCourseTestFromStats(stats, mentorReading5, readingBank);
  assert.strictEqual(result, mentorReading5);
});

console.log('\n=== Case 1 theo skill (eligible) ===');
test('Ch3 không có section Nghe trong bank → eligible Nghe chỉ Ch1+Ch2, Case 1 OK', () => {
  const bank = buildListeningBank([1, 2]);
  const mentor = {
    selectedChapterIds: ['1', '2', '3'],
    questionConfigs: mentorListening5.questionConfigs,
  };
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 5 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 5 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentor, bank);
  assert.strictEqual(result, mentor);
});

test('Ch3 có bank Nghe nhưng thiếu trong stat → không Case 1', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 5 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 5 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.notStrictEqual(result, mentorListening5);
});

console.log('\n=== Công thức 2: bù floor ===');
test('Hai chương cùng weight → chia 5 section (3+2)', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 3, 3: 2 });
});

console.log('\n=== Từ vựng Case 1 ===');
test('TV: đủ chương + weight bằng nhau → mentor config', () => {
  const stats = [1, 2, 3].map((pathId) => ({
    pathId,
    skillType: 'VOCABULARY',
    sectionId: 1,
    wrongCount: 5,
    totalCount: 10,
  }));
  const result = svc.recommendCourseTestFromStats(stats, mentorVocab12, vocabBank);
  assert.strictEqual(result, mentorVocab12);
});

console.log('\n=== Section IsUseForTest=false ===');
test('Section tắt IsUseForTest vẫn cho Case 2 docx đúng', () => {
  const bank = buildListeningBank([1, 2, 3]);
  bank.push({
    PathId: 2,
    SectionId: 99,
    SkillType: 'LISTENING',
    IsUseForTest: 0,
    QuestionCount: 20,
  });
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, bank);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 1, 2: 3, 3: 1 });
});

console.log('\n=== Ràng buộc tổng ≤ mentor config ===');
test('Case 2 Nghe: tổng section luôn ≤ 5', () => {
  const statsList = [
    [
      { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
      { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
      { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
    ],
    [
      { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 10, totalCount: 10 },
      { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 10, totalCount: 10 },
    ],
  ];
  statsList.forEach((stats) => {
    const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
    assertTotalSections(listeningAllocation(result), 5);
  });
});

console.log('\n=== DOCX: Công thức 2 — Nghe Case 2 (5 section) ===');
test('Nghe Case 2 → {1:1, 2:3, 3:1}', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 1, 2: 3, 3: 1 });
  const total = Object.values(listeningAllocation(result)).reduce((s, n) => s + n, 0);
  assert.strictEqual(total, 5, 'tổng section = mentor config');
});

console.log('\n=== DOCX: Trường hợp 1 — weight bằng nhau + đủ chương ===');
test('Case 1: Ch1+Ch2+Ch3 cùng 100% sai → giữ mentor config', () => {
  const stats = [1, 2, 3].map((pathId) => ({
    pathId,
    skillType: 'LISTENING',
    sectionId: 1,
    wrongCount: 10,
    totalCount: 10,
  }));
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.strictEqual(result, mentorListening5);
  assert.strictEqual(result.chapterSectionCounts, undefined);
});

test('Case 1 KHÔNG áp dụng khi thiếu chương trong stat (Ch1+Ch3, weight bằng nhau)', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 10, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 10, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.notStrictEqual(result, mentorListening5);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 3, 3: 2 });
});

test('Case 1: chương 4 không bank / không selected → không ảnh hưởng eligible', () => {
  const mentor = {
    ...mentorListening5,
    selectedChapterIds: ['1', '2', '3'],
  };
  const bank = buildListeningBank([1, 2, 3]);
  const stats = [1, 2, 3].map((pathId) => ({
    pathId,
    skillType: 'LISTENING',
    sectionId: 1,
    wrongCount: 5,
    totalCount: 5,
  }));
  const result = svc.recommendCourseTestFromStats(stats, mentor, bank);
  assert.strictEqual(result, mentor);
});

console.log('\n=== DOCX: Trường hợp 3 — weight = 0 ===');
test('Nghe Case 3: Ch2 làm đúng hết → Ch2 không xuất hiện', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  const alloc = listeningAllocation(result);
  assert.strictEqual(alloc[2], undefined);
  assert.ok(alloc[1] > 0 && alloc[3] > 0);
});

test('Từ vựng Case 3: C3 weight=0 → tổng 30 câu (13+17), không có C3', () => {
  const stats = [
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 0, totalCount: 19 },
  ];
  // Bank phải đủ câu theo mentor config (docx: không vượt question bank)
  const bank = buildVocabBank([1, 2, 3], 6, 20);
  const result = svc.recommendCourseTestFromStats(stats, mentorVocab49, bank);
  const total = result.vocabularyPlan.reduce((s, e) => s + e.questionCount, 0);
  const byChapter = vocabQuestionCountsByChapter(result.vocabularyPlan);
  assert.strictEqual(total, 30);
  assert.deepStrictEqual(byChapter, { 1: 13, 2: 17 });
  assert.strictEqual(byChapter[3], undefined);
});

console.log('\n=== DOCX: Trường hợp Exception ===');
test('Exception: chỉ 1 chương weight > 0 → giao hết 5 section Nghe', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 8, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 3: 5 });
});

test('Exception: stat chỉ 1 chương có sai → 5 section toàn chương đó', () => {
  const stats = [
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 2: 5 });
});

test('Exception weight=0: stat chỉ 1 chương làm đúng hết → mentor config', () => {
  const stats = [
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.strictEqual(result, mentorListening5);
});

test('Exception docx: mọi chương trong stat weight=0 → mentor config', () => {
  const stats = [1, 2, 3].map((pathId) => ({
    pathId,
    skillType: 'LISTENING',
    sectionId: 1,
    wrongCount: 0,
    totalCount: 10,
  }));
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.strictEqual(result, mentorListening5);
});

console.log('\n=== DOCX: Từ vựng bước 3 — 12 section → {1:5, 2:3, 3:4} ===');
test('Từ vựng section allocation docx', () => {
  const stats = [
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 10, totalCount: 19 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorVocab12, vocabBank);
  assert.deepStrictEqual(vocabSectionCountsByChapter(result.vocabularyPlan), { 1: 5, 2: 3, 3: 4 });
  assert.strictEqual(result.vocabularyPlan.length, 12);
});

console.log('\n=== DOCX: RULE question bank thiếu section ===');
test('Nghe: chương thiếu bank → bù sang chương weight cao', () => {
  const bank = buildListeningBank([1, 2, 3], 1);
  bank.push({
    PathId: 2,
    SectionId: 2,
    SkillType: 'LISTENING',
    IsUseForTest: 1,
    QuestionCount: 20,
  });
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, bank);
  const alloc = listeningAllocation(result);
  assert.strictEqual(alloc[1], 1);
  assert.strictEqual(alloc[2], 2);
  assert.ok(alloc[3] >= 1);
  const total = Object.values(alloc).reduce((s, n) => s + n, 0);
  assert.ok(total <= 5, 'tổng <= mentor config');
});

console.log('\n=== DOCX: Từ vựng bước 4 — chia câu đều + bù section nhiều câu ===');
test('Ch1: 5 section, 12 câu mentor → tổng đúng, chia floor + bù dư', () => {
  const stats = [
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 10, totalCount: 19 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorVocab12, vocabBank);
  const ch1Entries = result.vocabularyPlan.filter((e) => e.sectionTempId.startsWith('1::'));
  assert.strictEqual(ch1Entries.length, 5);
  const counts = ch1Entries.map((e) => e.questionCount).sort((a, b) => a - b);
  assert.strictEqual(counts.reduce((s, n) => s + n, 0), 12);
  // floor(12/5)=2; dư 2 câu bù lần lượt vào section nhiều câu nhất (cùng available → theo thứ tự)
  assert.deepStrictEqual(counts, [2, 2, 2, 3, 3]);
});

test('Ch2: 3 section, 16 câu mentor (4×4) → 5+5+6', () => {
  const stats = [
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 10, totalCount: 19 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorVocab12, vocabBank);
  const ch2Entries = result.vocabularyPlan.filter((e) => e.sectionTempId.startsWith('2::'));
  assert.strictEqual(ch2Entries.length, 3);
  assert.strictEqual(ch2Entries.reduce((s, e) => s + e.questionCount, 0), 16);
  assert.deepStrictEqual(
    ch2Entries.map((e) => e.questionCount).sort((a, b) => a - b),
    [5, 5, 6],
  );
});

console.log('\n=== Chi tiết Công thức 1 (nhiều section / chương) ===');
test('Gom 2 section cùng chương: 3/10 + 4/10 → weight Ch1 = 0.35', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 3, totalCount: 10 },
    { pathId: 1, skillType: 'LISTENING', sectionId: 2, wrongCount: 4, totalCount: 10 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const weights = chapterWeightsFromStats(stats, 'LISTENING');
  assert.ok(Math.abs(weights[1] - 0.35) < 1e-9);
  assert.ok(Math.abs(weights[2] - 0.7) < 1e-9);
  assert.ok(Math.abs(weights[3] - 0.6) < 1e-9);
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 1, 2: 3, 3: 1 });
});

test('Stat kỹ năng khác không ảnh hưởng weight Nghe', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 99, totalCount: 100 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 1, 2: 3, 3: 1 });
});

console.log('\n=== Chi tiết Công thức 2 (floor + bù dư) ===');
test('6 section Nghe, weight 0.5 / 0.5 / 1.0 → {1:1, 2:1, 3:4}', () => {
  const mentor = mentorListeningConfig(6);
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 10 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 10, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentor, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 1, 2: 1, 3: 4 });
  assertExactTotalSections(listeningAllocation(result), 6);
});

test('4 section Nghe, docx weights → floor khiến Ch1=0, bù vào Ch2+Ch3', () => {
  const mentor = mentorListeningConfig(4);
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentor, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 2: 2, 3: 2 });
  assertExactTotalSections(listeningAllocation(result), 4);
});

test('Hai chương cùng weight, thiếu chương eligible → bù dư vào pathId nhỏ hơn', () => {
  const stats = [
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 8, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 8, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 2: 3, 3: 2 });
});

console.log('\n=== Chi tiết Case 3 (chỉ chương weight > 0) ===');
test('Nghe Case 3: Ch2 weight=0 → phân bổ đúng 5 section cho Ch1+Ch3', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 1, 3: 4 });
  assertExactTotalSections(listeningAllocation(result), 5);
});

test('Nghe Case 3: hai chương weight=0 → Exception mentor config', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 8, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 2: 5 });
});

console.log('\n=== Chi tiết Exception ===');
test('Exception: stat 2 chương, chỉ Ch1 sai → 5 section toàn Ch1', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 10 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 5 });
});

test('Exception: 1 chương trong stat, weight=0 → mentor config (không giao hết)', () => {
  const stats = [
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 0, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.strictEqual(result, mentorListening5);
});

console.log('\n=== Chi tiết RULE question bank ===');
test('Ch3 bank = 0 section Nghe → bù sang Ch2 (weight cao)', () => {
  const bank = buildListeningBank([1, 2], 6);
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, bank);
  const alloc = listeningAllocation(result);
  assert.strictEqual(alloc[3], undefined);
  assert.ok(alloc[2] >= 2, 'Ch2 nhận phần thiếu từ Ch3');
  assertExactTotalSections(alloc, 5);
});

test('Bank cạn: tổng section thực tế < mentor config', () => {
  const bank = buildListeningBank([1, 2, 3], 1);
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, bank);
  const alloc = listeningAllocation(result);
  const total = assertTotalSections(alloc, 5);
  assert.strictEqual(total, 3, 'mỗi chương tối đa 1 section trong bank');
});

console.log('\n=== Chi tiết Từ vựng bước 3–4 ===');
test('Ch3: 4 section, 20 câu mentor → 5+5+5+5', () => {
  const stats = [
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 10, totalCount: 19 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorVocab12, vocabBank);
  const ch3Entries = result.vocabularyPlan.filter((e) => e.sectionTempId.startsWith('3::'));
  assert.strictEqual(ch3Entries.length, 4);
  assert.strictEqual(ch3Entries.reduce((s, e) => s + e.questionCount, 0), 20);
  assert.deepStrictEqual(
    ch3Entries.map((e) => e.questionCount).sort((a, b) => a - b),
    [5, 5, 5, 5],
  );
});

test('Tổng câu Từ vựng Case 2 = 48 câu mentor (12+16+20)', () => {
  const stats = [
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 10, totalCount: 19 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorVocab12, vocabBank);
  const total = result.vocabularyPlan.reduce((s, e) => s + e.questionCount, 0);
  assert.strictEqual(total, 48);
  assert.deepStrictEqual(vocabQuestionCountsByChapter(result.vocabularyPlan), { 1: 12, 2: 16, 3: 20 });
});

test('Mỗi section Từ vựng không vượt availableCount trong bank', () => {
  const bank = buildVocabBank([1, 2, 3], 6, 8);
  const stats = [
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 10, totalCount: 19 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorVocab12, bank);
  for (const entry of result.vocabularyPlan) {
    assert.ok(entry.questionCount <= 8, `${entry.sectionTempId} vượt bank 8 câu`);
  }
});

test('Từ vựng bank thiếu section: rebalance section giữ tổng ≤ 12', () => {
  const bank = buildVocabBank([1, 2, 3], 2, 10);
  const stats = [
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 10, totalCount: 19 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorVocab12, bank);
  assert.ok(result.vocabularyPlan.length <= 12);
  const byChapter = vocabSectionCountsByChapter(result.vocabularyPlan);
  for (const pathId of [1, 2, 3]) {
    assert.ok((byChapter[pathId] || 0) <= 2, `Ch${pathId} tối đa 2 section trong bank`);
  }
});

console.log('\n=== Chi tiết kết hợp kỹ năng / mentor config ===');
test('Nghe Case 1 + Từ vựng Case 2 trong cùng lần gọi', () => {
  const mentor = {
    selectedChapterIds: ['1', '2', '3'],
    questionConfigs: [
      { part: 'LISTENING', sectionCount: 5, sectionQuestionCounts: [] },
      { part: 'READING', sectionCount: 0, sectionQuestionCounts: [] },
      {
        part: 'VOCABULARY',
        sectionCount: 12,
        sectionQuestionCounts: mentorVocab12.questionConfigs[2].sectionQuestionCounts,
      },
    ],
  };
  const bank = [...listeningBank, ...vocabBank];
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 5 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 5 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 5, totalCount: 5 },
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 10, totalCount: 19 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentor, bank);
  assert.strictEqual(listeningAllocation(result), undefined);
  assert.deepStrictEqual(vocabSectionCountsByChapter(result.vocabularyPlan), { 1: 5, 2: 3, 3: 4 });
});

test('Mentor không cấu hình Nghe (0 section) → không có chapterSectionCounts LISTENING', () => {
  const mentor = {
    selectedChapterIds: ['1', '2', '3'],
    questionConfigs: [
      { part: 'LISTENING', sectionCount: 0, sectionQuestionCounts: [] },
      { part: 'READING', sectionCount: 0, sectionQuestionCounts: [] },
      { part: 'VOCABULARY', sectionCount: 0, sectionQuestionCounts: [] },
    ],
  };
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 10, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentor, listeningBank);
  assert.strictEqual(result, mentor);
});

test('Đọc 0 section mentor → stat Đọc bị bỏ qua', () => {
  const mentor = {
    selectedChapterIds: ['1', '2', '3'],
    questionConfigs: [
      { part: 'LISTENING', sectionCount: 0, sectionQuestionCounts: [] },
      { part: 'READING', sectionCount: 0, sectionQuestionCounts: [] },
      { part: 'VOCABULARY', sectionCount: 0, sectionQuestionCounts: [] },
    ],
  };
  const stats = [
    { pathId: 1, skillType: 'READING', sectionId: 1, wrongCount: 10, totalCount: 10 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentor, readingBank);
  assert.strictEqual(result, mentor);
});

console.log('\n=== Parametric: ràng buộc luôn đúng ===');
test('10 tổ hợp stat Nghe ngẫu nhiên: tổng section ≤ mentor, không chương weight=0', () => {
  const scenarios = [
    [{ pathId: 1, wrong: 1, total: 10 }, { pathId: 2, wrong: 9, total: 10 }],
    [{ pathId: 1, wrong: 10, total: 10 }, { pathId: 2, wrong: 1, total: 10 }, { pathId: 3, wrong: 5, total: 10 }],
    [{ pathId: 1, wrong: 3, total: 7 }, { pathId: 2, wrong: 3, total: 7 }, { pathId: 3, wrong: 3, total: 7 }],
    [{ pathId: 1, wrong: 0, total: 5 }, { pathId: 2, wrong: 5, total: 5 }],
    [{ pathId: 2, wrong: 2, total: 8 }, { pathId: 3, wrong: 6, total: 8 }],
    [{ pathId: 1, wrong: 4, total: 4 }, { pathId: 2, wrong: 0, total: 4 }, { pathId: 3, wrong: 2, total: 4 }],
    [{ pathId: 1, wrong: 1, total: 3 }, { pathId: 3, wrong: 2, total: 3 }],
    [{ pathId: 1, wrong: 5, total: 10 }, { pathId: 2, wrong: 5, total: 10 }, { pathId: 3, wrong: 5, total: 10 }],
    [{ pathId: 1, wrong: 8, total: 10 }, { pathId: 2, wrong: 2, total: 10 }, { pathId: 3, wrong: 6, total: 10 }],
    [{ pathId: 1, wrong: 0, total: 1 }, { pathId: 2, wrong: 0, total: 1 }, { pathId: 3, wrong: 1, total: 1 }],
  ];
  for (const scenario of scenarios) {
    const stats = scenario.map((row) => ({
      pathId: row.pathId,
      skillType: 'LISTENING',
      sectionId: 1,
      wrongCount: row.wrong,
      totalCount: row.total,
    }));
    const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
    if (result === mentorListening5) continue;
    const alloc = listeningAllocation(result);
    assertTotalSections(alloc, 5);
    for (const row of scenario) {
      if (row.wrong === 0) {
        assert.strictEqual(alloc[row.pathId], undefined, `Ch${row.pathId} weight=0 không được phân section`);
      }
    }
  }
});

console.log('\n=== Edge cases ===');
test('Không có stat → giữ mentor config', () => {
  const result = svc.recommendCourseTestFromStats([], mentorListening5, listeningBank);
  assert.strictEqual(result, mentorListening5);
});

test('User scenario: Ch1 1 section + Ch3 4 section, 0 đúng → không Case 1', () => {
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 101, wrongCount: 10, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 301, wrongCount: 8, totalCount: 8 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 302, wrongCount: 8, totalCount: 8 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 303, wrongCount: 8, totalCount: 8 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 304, wrongCount: 8, totalCount: 8 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentorListening5, listeningBank);
  assert.notStrictEqual(result, mentorListening5);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 3, 3: 2 });
});

test('Nghe và Từ vựng tính độc lập', () => {
  const mentor = {
    selectedChapterIds: ['1', '2', '3'],
    questionConfigs: [
      { part: 'LISTENING', sectionCount: 5, sectionQuestionCounts: [] },
      { part: 'READING', sectionCount: 0, sectionQuestionCounts: [] },
      {
        part: 'VOCABULARY',
        sectionCount: 12,
        sectionQuestionCounts: mentorVocab12.questionConfigs[2].sectionQuestionCounts,
      },
    ],
  };
  const bank = [...listeningBank, ...vocabBank];
  const stats = [
    { pathId: 1, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 20 },
    { pathId: 2, skillType: 'LISTENING', sectionId: 1, wrongCount: 7, totalCount: 10 },
    { pathId: 3, skillType: 'LISTENING', sectionId: 1, wrongCount: 12, totalCount: 20 },
    { pathId: 1, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 7, totalCount: 13 },
    { pathId: 2, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 8, totalCount: 17 },
    { pathId: 3, skillType: 'VOCABULARY', sectionId: 1, wrongCount: 10, totalCount: 19 },
  ];
  const result = svc.recommendCourseTestFromStats(stats, mentor, bank);
  assert.deepStrictEqual(listeningAllocation(result), { 1: 1, 2: 3, 3: 1 });
  assert.deepStrictEqual(vocabSectionCountsByChapter(result.vocabularyPlan), { 1: 5, 2: 3, 3: 4 });
});

console.log(`\n=== KẾT QUẢ: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
