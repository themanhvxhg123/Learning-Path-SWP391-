export const ADMIN_NEWS_CREATE_STORAGE_KEY = 'admin_news_create_draft';

export function loadAdminNewsCreateDraft() {
  try {
    const raw = sessionStorage.getItem(ADMIN_NEWS_CREATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      step1: parsed.step1 ?? null,
      content: parsed.content ?? '',
    };
  } catch {
    return null;
  }
}

export function saveAdminNewsCreateDraft(draft = {}) {
  const existing = loadAdminNewsCreateDraft();
  const next = {
    step1: draft.step1 ?? existing?.step1 ?? null,
    content: draft.content ?? existing?.content ?? '',
  };
  sessionStorage.setItem(ADMIN_NEWS_CREATE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function saveAdminNewsStep1ToStorage(step1) {
  return saveAdminNewsCreateDraft({ step1 });
}

export function saveAdminNewsContentToStorage(content) {
  return saveAdminNewsCreateDraft({ content });
}

export function clearAdminNewsCreateDraft() {
  sessionStorage.removeItem(ADMIN_NEWS_CREATE_STORAGE_KEY);
}
