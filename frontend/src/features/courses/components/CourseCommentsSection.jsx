import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  Rating,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AppButton from '@/shared/ui/AppButton';
import { toast } from '@/shared/ui/Toast';
import {
  formatCommentDate,
  getCommentInitials,
  getInitialComments,
  mapApiComment,
  resolveAvatarSrc,
} from '@/features/courses/data/courseCommentsMock';

const PRIMARY = '#0891B2';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const DIVIDER = 'rgba(8,145,178,0.10)';
const COMMENT_MAX_LENGTH = 250;
const COMMENT_LIST_MAX_HEIGHT = 480;

function SectionTitle({ children, sx }) {
  return (
    <Typography sx={{ fontWeight: 700, color: TEXT, fontSize: { xs: 18, sm: 20 }, lineHeight: 1.3, ...sx }}>
      {children}
    </Typography>
  );
}

function CommentItem({ comment }) {
  const avatarSrc = resolveAvatarSrc(comment.avatarUrl);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.75,
        py: 2.25,
        borderBottom: `1px solid ${DIVIDER}`,
        '&:last-child': { borderBottom: 'none', pb: 0 },
      }}
    >
      <Avatar
        src={avatarSrc || undefined}
        sx={{
          width: 42,
          height: 42,
          bgcolor: alpha(PRIMARY, 0.12),
          color: PRIMARY,
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {getCommentInitials(comment.authorName)}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>
            {comment.authorName}
          </Typography>
          {comment.isInstructor ? (
            <Chip
              size="small"
              label="Giảng viên"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: alpha(PRIMARY, 0.1),
                color: PRIMARY,
                border: `1px solid ${alpha(PRIMARY, 0.22)}`,
                '& .MuiChip-label': { px: 0.85 },
              }}
            />
          ) : null}
          <Typography sx={{ fontSize: 12.5, color: MUTED }}>
            {formatCommentDate(comment.createdAt)}
          </Typography>
        </Box>

        {comment.rating != null && (
          <Rating
            value={comment.rating}
            readOnly
            size="small"
            icon={<StarRoundedIcon sx={{ fontSize: 16 }} />}
            emptyIcon={<StarRoundedIcon sx={{ fontSize: 16, opacity: 0.28 }} />}
            sx={{ color: '#F59E0B', mb: 0.75, '& .MuiRating-iconEmpty': { color: alpha('#F59E0B', 0.28) } }}
          />
        )}

        <Typography sx={{ fontSize: 14, color: TEXT, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {comment.content}
        </Typography>

        {comment.reply?.content ? (
          <Box
            sx={{
              mt: 1.25,
              p: 1.5,
              borderRadius: '12px',
              bgcolor: alpha(PRIMARY, 0.04),
              border: `1px solid ${alpha(PRIMARY, 0.12)}`,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY, mb: 0.35 }}>
              Phản hồi từ giảng viên
              {comment.reply.repliedAt ? (
                <Box component="span" sx={{ fontWeight: 500, color: MUTED, ml: 0.75 }}>
                  · {formatCommentDate(comment.reply.repliedAt)}
                </Box>
              ) : null}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: TEXT, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {comment.reply.content}
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export default function CourseCommentsSection({ courseId, isEnrolled = false }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/courses/${courseId}/comments`);
        const result = await res.json();

        if (!cancelled && result.success && Array.isArray(result.data)) {
          setComments(
            result.data.length > 0
              ? result.data.map(mapApiComment)
              : getInitialComments(),
          );
          return;
        }
      } catch {
        // fallback to seed below
      }

      if (!cancelled) {
        setComments(getInitialComments());
      }
    };

    fetchComments().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const handleContentChange = (event) => {
    setContent(event.target.value.slice(0, COMMENT_MAX_LENGTH));
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập nội dung bình luận.');
      return;
    }

    if (trimmed.length > COMMENT_MAX_LENGTH) {
      toast.error(`Bình luận không được vượt quá ${COMMENT_MAX_LENGTH} ký tự.`);
      return;
    }

    if (!user.userId) {
      toast.error('Vui lòng đăng nhập để bình luận.');
      return;
    }

    if (!isEnrolled) {
      toast.error('Bạn cần đăng ký khóa học trước khi bình luận.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/courses/${courseId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.userId),
        },
        body: JSON.stringify({ content: trimmed, rating }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        setComments((prev) => [mapApiComment(result.data), ...prev]);
        setContent('');
        setRating(5);
        toast.success('Đã gửi bình luận.');
        return;
      }

      const localComment = {
        id: `local-${Date.now()}`,
        authorName: user.fullName || user.name || 'Bạn',
        avatarUrl: user.avatarUrl || null,
        rating,
        content: trimmed,
        createdAt: new Date().toISOString(),
        userId: user.userId,
      };
      setComments((prev) => [localComment, ...prev]);
      setContent('');
      setRating(5);
      toast.success('Đã gửi bình luận.');
    } catch {
      toast.error('Không thể gửi bình luận. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ pb: 2, mb: 0.5, borderBottom: `1px solid ${DIVIDER}` }}>
        <SectionTitle sx={{ mb: 0.75 }}>Bình luận</SectionTitle>
        <Typography sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          {comments.length} bình luận
        </Typography>
      </Box>

      {user.userId && isEnrolled ? (
        <Box
          sx={{
            mt: 2.5,
            mb: 3,
            p: 2.25,
            borderRadius: '16px',
            border: `1px solid ${DIVIDER}`,
            bgcolor: alpha(PRIMARY, 0.02),
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TEXT, mb: 1.25 }}>
            Viết bình luận của bạn
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>Đánh giá:</Typography>
            <Rating
              value={rating}
              onChange={(_, value) => setRating(value || 5)}
              size="small"
              icon={<StarRoundedIcon sx={{ fontSize: 20 }} />}
              emptyIcon={<StarRoundedIcon sx={{ fontSize: 20, opacity: 0.28 }} />}
              sx={{ color: '#F59E0B', '& .MuiRating-iconEmpty': { color: alpha('#F59E0B', 0.28) } }}
            />
          </Box>
          <TextField
            multiline
            minRows={3}
            fullWidth
            placeholder="Chia sẻ cảm nhận của bạn về khóa học..."
            value={content}
            onChange={handleContentChange}
            inputProps={{ maxLength: COMMENT_MAX_LENGTH }}
            sx={{
              mb: 0.75,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                bgcolor: '#fff',
                fontSize: 14,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: content.length >= COMMENT_MAX_LENGTH ? '#DC2626' : MUTED,
              }}
            >
              {content.length}/{COMMENT_MAX_LENGTH}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <AppButton
              onClick={handleSubmit}
              loading={submitting}
              disabled={submitting || !content.trim() || content.length > COMMENT_MAX_LENGTH}
            >
              Gửi bình luận
            </AppButton>
          </Box>
        </Box>
      ) : (
        <Typography sx={{ mt: 2, mb: 2.5, fontSize: 13.5, color: MUTED, lineHeight: 1.6 }}>
          {user.userId
            ? 'Đăng ký khóa học để chia sẻ bình luận và đánh giá.'
            : 'Đăng nhập và đăng ký khóa học để bình luận.'}
        </Typography>
      )}

      {loading ? (
        <Typography sx={{ py: 3, fontSize: 14, color: MUTED, textAlign: 'center' }}>
          Đang tải bình luận...
        </Typography>
      ) : comments.length === 0 ? (
        <Typography sx={{ py: 3, fontSize: 14, color: MUTED, textAlign: 'center' }}>
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </Typography>
      ) : (
        <Box
          sx={{
            maxHeight: COMMENT_LIST_MAX_HEIGHT,
            overflowY: 'auto',
            pr: 0.5,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(8,145,178,0.35) transparent',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(8,145,178,0.35)',
              borderRadius: '99px',
            },
          }}
        >
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </Box>
      )}
    </Box>
  );
}
