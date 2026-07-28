/**
 * =============================================================================
 * MentorQuestionBankCreatePage — Redirect route legacy
 * =============================================================================
 *
 * MỤC ĐÍCH: Chuyển hướng route tạo cũ sang workspace manage mới.
 * ROUTE URL: /mentor/question-banks/create (hoặc tương tự)
 * LUỒNG: Giữ nguyên query string → redirect sang /mentor/question-banks/manage
 *
 * Redirect legacy create route → manage workspace.
 */
import { Navigate, useSearchParams } from 'react-router-dom';

export default function MentorQuestionBankCreatePage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const chapterId = searchParams.get('chapterId');

  if (courseId && chapterId) {
    return <Navigate to={`/mentor/question-banks/${courseId}/${chapterId}`} replace />;
  }
  if (courseId) {
    return <Navigate to={`/mentor/question-banks/${courseId}`} replace />;
  }

  return <Navigate to="/mentor/question-banks" replace />;
}
