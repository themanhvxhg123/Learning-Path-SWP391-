import { mapApiComment } from '@/features/courses/data/courseCommentsMock';

export const COMMENT_MAX_LENGTH = 250;
export const REPLY_MAX_LENGTH = COMMENT_MAX_LENGTH;

export function mapMentorCourseComment(row) {
  return mapApiComment(row);
}
