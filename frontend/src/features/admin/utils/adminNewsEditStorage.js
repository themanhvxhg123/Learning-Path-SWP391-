export const ADMIN_NEWS_EDIT_STORAGE_KEY = 'admin_news_edit_draft';

export function loadAdminNewsEditDraft() {
  try {
    const raw = sessionStorage.getItem(ADMIN_NEWS_EDIT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      articleId: parsed.articleId ?? null,
      step1: parsed.step1 ?? null,
      content: parsed.content ?? '',
      original: parsed.original ?? null,
      returnTo: parsed.returnTo ?? 'edit',
    };
  } catch {
    return null;
  }
}

export function saveAdminNewsEditDraft(draft = {}) {
  const existing = loadAdminNewsEditDraft();
  const next = {
    articleId: draft.articleId ?? existing?.articleId ?? null,
    step1: draft.step1 ?? existing?.step1 ?? null,
    content: draft.content ?? existing?.content ?? '',
    original: draft.original ?? existing?.original ?? null,
    returnTo: draft.returnTo ?? existing?.returnTo ?? 'edit',
  };
  sessionStorage.setItem(ADMIN_NEWS_EDIT_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function saveAdminNewsEditStep1ToStorage(articleId, step1) {
  return saveAdminNewsEditDraft({ articleId, step1 });
}

export function saveAdminNewsEditContentToStorage(content) {
  return saveAdminNewsEditDraft({ content });
}

export function clearAdminNewsEditDraft() {
  sessionStorage.removeItem(ADMIN_NEWS_EDIT_STORAGE_KEY);
}

export function isAdminNewsEditDraftForArticle(articleId) {
  const draft = loadAdminNewsEditDraft();
  return draft?.articleId != null && String(draft.articleId) === String(articleId);
}
