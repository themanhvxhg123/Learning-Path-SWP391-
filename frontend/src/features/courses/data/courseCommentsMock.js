/** Seed comments when API is empty or unavailable (demo). */
export const DEFAULT_COURSE_COMMENTS = [
  {
    id: 'seed-1',
    authorName: 'Nguyễn Minh Anh',
    avatarUrl: null,
    rating: 5,
    content: 'Khóa học bài bản, giảng viên giải thích dễ hiểu. Mình đã áp dụng được ngay sau vài buổi học.',
    createdAt: '2026-05-12T09:30:00.000Z',
  },
  {
    id: 'seed-2',
    authorName: 'Trần Hoàng Long',
    avatarUrl: null,
    rating: 4,
    content: 'Nội dung phong phú, bài tập thực hành hay. Mong có thêm phần tổng kết cuối chương.',
    createdAt: '2026-05-08T14:15:00.000Z',
  },
  {
    id: 'seed-3',
    authorName: 'Lê Thu Hà',
    avatarUrl: null,
    rating: 5,
    content: 'Học theo lộ trình rất mạch lạc, phù hợp người mới bắt đầu.',
    createdAt: '2026-04-28T07:45:00.000Z',
  },
];

export function getInitialComments() {
  return DEFAULT_COURSE_COMMENTS.map((item) => ({ ...item }));
}

export function mapApiComment(row) {
  return {
    id: row.CommentId,
    authorName: row.FullName || 'Học viên',
    avatarUrl: row.AvatarUrl || null,
    rating: row.Rating ?? null,
    content: row.Content,
    createdAt: row.CreatedAt,
    userId: row.UserId,
    isInstructor: Boolean(row.IsInstructor),
    reply: row.ReplyContent
      ? {
          content: row.ReplyContent,
          repliedAt: row.ReplyAt,
          repliedByName: row.ReplyByName || 'Mentor',
        }
      : null,
  };
}

export function getCommentInitials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

export function formatCommentDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function resolveAvatarSrc(avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  return `http://localhost:5000${avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`}`;
}
