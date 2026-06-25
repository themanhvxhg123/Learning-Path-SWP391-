import { uploadAudioMaterial } from '@/features/mentor/services/materialUploadService';
import {
  TEST_SKILL_LISTENING,
  isFilledTestQuestion,
} from '@/features/mentor/utils/mentorTestContentUtils';

function isBrowserFile(value) {
  return typeof File !== 'undefined' && value instanceof File;
}

/** Upload file nghe lên Cloudinary trước khi lưu question bank. */
export async function uploadListeningFilesInSections(sections = []) {
  const next = [];
  for (const section of sections) {
    if (section.SkillType !== TEST_SKILL_LISTENING || !isBrowserFile(section.File)) {
      next.push(section);
      continue;
    }
    const uploaded = await uploadAudioMaterial(section.File);
    next.push({
      ...section,
      AudioUrl: uploaded.url ?? '',
      FileName: uploaded.fileName ?? section.File.name,
      FileSize: uploaded.fileSize ?? section.File.size,
      File: null,
    });
  }
  return next;
}

/** Kiểm tra bài nghe đã có URL sau khi upload. */
export function validateListeningSectionsHaveAudio(sections = []) {
  for (const section of sections) {
    if (section.SkillType !== TEST_SKILL_LISTENING) continue;
    const hasQuestions = (section.Questions ?? []).some(
      (q) => isFilledTestQuestion(q) && q.isActive !== false,
    );
    if (!hasQuestions) continue;
    const audioUrl = String(section.AudioUrl ?? '').trim();
    if (!audioUrl) {
      return 'Bài nghe thiếu file audio hoặc link nghe.';
    }
  }
  return null;
}
