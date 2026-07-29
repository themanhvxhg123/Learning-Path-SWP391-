/**
 * Chuẩn hóa kỹ năng section — khớp dbo.Section_Type.
 * DB hiện lưu Name tiếng Việt: Nghe / Đọc / Từ Vựng/ Ngữ pháp (TypeId 1/2/3).
 */

const TYPE_ID_TO_SKILL = {
  1: 'LISTENING',
  2: 'READING',
  3: 'VOCABULARY',
};

const SKILL_TO_TYPE_ID = {
  LISTENING: 1,
  READING: 2,
  VOCABULARY: 3,
};

function mapSkillTypeToTypeId(skillType) {
  const key = String(skillType ?? '').trim().toUpperCase();
  return SKILL_TO_TYPE_ID[key] ?? SKILL_TO_TYPE_ID.VOCABULARY;
}

/** SQL CASE — trả về mã kỹ năng chuẩn từ TypeId. */
const SQL_SKILL_TYPE_FROM_TYPE_ID = `
  CASE qs.TypeId
    WHEN 1 THEN 'LISTENING'
    WHEN 2 THEN 'READING'
    ELSE 'VOCABULARY'
  END
`.trim();

module.exports = {
  TYPE_ID_TO_SKILL,
  SKILL_TO_TYPE_ID,
  mapSkillTypeToTypeId,
  SQL_SKILL_TYPE_FROM_TYPE_ID,
};
