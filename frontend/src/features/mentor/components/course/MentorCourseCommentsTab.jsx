import { useCallback, useEffect, useState } from 'react';
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
import { CREATE_CARD_SX } from './mentorCourseCreateStyles';
import {
  formatCommentDate,
  getCommentInitials,
  resolveAvatarSrc,
} from '@/features/courses/data/courseCommentsMock';
import {
  createMentorCourseComment,
  fetchMentorCourseComments,
  replyMentorCourseComment,
} from '@/features/mentor/services/mentorCourseService';
import {
  COMMENT_MAX_LENGTH,
  REPLY_MAX_LENGTH,
} from '@/features/mentor/utils/mentorCourseCommentsUtils';

const PRIMARY = '#0891B2';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const DIVIDER = 'rgba(8,145,178,0.10)';
const COMMENT_LIST_MAX_HEIGHT = 480;

const INSTRUCTOR_CHIP_SX = {
  height: 22,
  fontSize: 11,
  fontWeight: 600,
  bgcolor: alpha(PRIMARY, 0.1),
  color: PRIMARY,
  border: `1px solid ${alpha(PRIMARY, 0.22)}`,
  '& .MuiChip-label': { px: 0.85 },
};

function SectionTitle({ children, sx }) {
  return (
    <Typography sx={{ fontWeight: 700, color: TEXT, fontSize: { xs: 18, sm: 20 }, lineHeight: 1.3, ...sx }}>
      {children}
    </Typography>
  );
}

function MentorCommentComposeForm({ submitting, onSubmit }) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập nội dung bình luận.');
      return;
    }
    onSubmit(trimmed, () => setContent(''));
  };

  return (
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
      <TextField
        multiline
        minRows={3}
        fullWidth
        placeholder="Chia sẻ thông báo hoặc trao đổi với học viên..."
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, COMMENT_MAX_LENGTH))}
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
  );
}

function MentorCommentReplyForm({ initialValue = '', submitting, onSubmit, onCancel }) {
  const [content, setContent] = useState(initialValue);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập nội dung phản hồi.');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 2.25,
        borderRadius: '16px',
        border: `1px solid ${DIVIDER}`,
        bgcolor: alpha(PRIMARY, 0.02),
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: TEXT, mb: 1.25 }}>
        Phản hồi cho học viên
      </Typography>
      <TextField
        multiline
        minRows={3}
        fullWidth
        placeholder="Viết phản hồi của bạn..."
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, REPLY_MAX_LENGTH))}
        inputProps={{ maxLength: REPLY_MAX_LENGTH }}
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
            color: content.length >= REPLY_MAX_LENGTH ? '#DC2626' : MUTED,
          }}
        >
          {content.length}/{REPLY_MAX_LENGTH}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.75 }}>
        {onCancel ? (
          <AppButton variant="outlined" onClick={onCancel}>
            Hủy
          </AppButton>
        ) : null}
        <AppButton
          loading={submitting}
          disabled={submitting || !content.trim()}
          onClick={handleSubmit}
        >
          Gửi phản hồi
        </AppButton>
      </Box>
    </Box>
  );
}

function MentorCommentItem({
  comment,
  replying,
  submitting,
  onStartReply,
  onCancelReply,
  onSubmitReply,
}) {
  const avatarSrc = resolveAvatarSrc(comment.avatarUrl);
  const hasReply = Boolean(comment.reply?.content);
  const isEditing = replying === comment.id;
  const canReply = !comment.isInstructor;

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
            <Chip size="small" label="Giảng viên" sx={INSTRUCTOR_CHIP_SX} />
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

        {hasReply && !isEditing ? (
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
            {canReply ? (
              <AppButton
                variant="text"
                onClick={() => onStartReply(comment.id)}
                sx={{ mt: 0.5, px: 0, minWidth: 0, fontSize: 13, fontWeight: 600, color: PRIMARY }}
              >
                Sửa phản hồi
              </AppButton>
            ) : null}
          </Box>
        ) : null}

        {canReply && !hasReply && !isEditing ? (
          <AppButton
            variant="text"
            onClick={() => onStartReply(comment.id)}
            sx={{ mt: 0.75, px: 0, minWidth: 0, fontSize: 13, fontWeight: 600, color: PRIMARY }}
          >
            Trả lời
          </AppButton>
        ) : null}

        {canReply && isEditing ? (
          <MentorCommentReplyForm
            initialValue={comment.reply?.content ?? ''}
            submitting={submitting}
            onCancel={onCancelReply}
            onSubmit={(content) => onSubmitReply(comment.id, content)}
          />
        ) : null}
      </Box>
    </Box>
  );
}

export default function MentorCourseCommentsTab({ courseId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [postingComment, setPostingComment] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    const result = await fetchMentorCourseComments(courseId);
    setComments(result.comments ?? []);
    if (!result.ok && result.message) {
      toast.error(result.message);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmitComment = async (content, resetForm) => {
    setPostingComment(true);
    const result = await createMentorCourseComment(courseId, content);
    setPostingComment(false);

    if (!result.ok) {
      toast.error(result.message ?? 'Không thể gửi bình luận.');
      return;
    }

    setComments((prev) => [result.comment, ...prev]);
    resetForm();
    toast.success('Đã gửi bình luận.');
  };

  const handleSubmitReply = async (commentId, content) => {
    setSubmittingId(commentId);
    const result = await replyMentorCourseComment(courseId, commentId, content);
    setSubmittingId(null);

    if (!result.ok) {
      const isDemoComment = !/^\d+$/.test(String(commentId));
      if (isDemoComment) {
        setComments((prev) =>
          prev.map((item) =>
            item.id === commentId
              ? {
                  ...item,
                  reply: {
                    content,
                    repliedAt: new Date().toISOString(),
                    repliedByName: 'Bạn',
                  },
                }
              : item,
          ),
        );
        setReplyingId(null);
        toast.success('Đã gửi phản hồi (demo).');
        return;
      }

      toast.error(result.message ?? 'Không thể gửi phản hồi.');
      return;
    }

    setComments((prev) =>
      prev.map((item) => (item.id === commentId ? result.comment : item)),
    );
    setReplyingId(null);
    toast.success('Đã gửi phản hồi.');
  };

  return (
    <Box sx={CREATE_CARD_SX}>
      <Box sx={{ pb: 2, mb: 0.5, borderBottom: `1px solid ${DIVIDER}` }}>
        <SectionTitle sx={{ mb: 0.75 }}>Bình luận</SectionTitle>
        <Typography sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
          {loading ? 'Đang tải...' : `${comments.length} bình luận`}
        </Typography>
      </Box>

      <MentorCommentComposeForm submitting={postingComment} onSubmit={handleSubmitComment} />

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
            <MentorCommentItem
              key={comment.id}
              comment={comment}
              replying={replyingId}
              submitting={submittingId === comment.id}
              onStartReply={setReplyingId}
              onCancelReply={() => setReplyingId(null)}
              onSubmitReply={handleSubmitReply}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
