/**
 * =============================================================================
 * MentorQuestionBankListPage — Trang danh sách ngân hàng câu hỏi
 * =============================================================================
 *
 * MỤC ĐÍCH: Hiển thị danh sách khóa học có ngân hàng câu hỏi của mentor.
 *
 * ROUTE URL: /mentor/question-banks
 *
 * LUỒNG CHÍNH:
 *   1. Tải danh sách bank + khóa học chưa có bank từ API
 *   2. Lọc/sắp xếp theo query params trên URL (status, questionStatus, sort, q)
 *   3. Click "Quản lý câu hỏi" → chuyển sang trang chi tiết chương
 *
 * Search: Header SearchBox (param q) — không nằm trong toolbar.
 */
import { useEffect, useMemo, useState } from 'react';
import { Box, Breadcrumbs, Link as MuiLink, Typography, alpha } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AppButton from '@/shared/ui/AppButton';
import AppPagination from '@/shared/ui/AppPagination';
import EmptyState from '@/shared/ui/EmptyState';
import Loading from '@/shared/ui/Loading';
import MentorQuestionBankRow from '@/features/mentor/components/questionBank/MentorQuestionBankRow';
import MentorQuestionBankToolbar from '@/features/mentor/components/questionBank/MentorQuestionBankToolbar';
import MentorSelectCourseForQBDialog from '@/features/mentor/components/questionBank/MentorSelectCourseForQBDialog';
import { mentorQuestionBankFilterOptionsMock } from '@/features/mentor/data/mentorQuestionBankMock';
import {
  parseQBListParams,
  hasActiveQBFilters,
  buildQBListSearchParams,
  resetQBListParams,
  buildQBActiveChips,
  filterAndSortQBItems,
  paginateQBItems,
  QB_LIST_DEFAULTS,
} from '@/features/mentor/utils/mentorQuestionBankListParams';

const PAGE_SIZE = 8;

export default function MentorQuestionBankListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== STATE =====
  // listQuestionBank: danh sách khóa học có ngân hàng câu hỏi từ API
  const [listQuestionBank, setListQuestionBank] = useState([]);
  // loading: true khi đang gọi API lần đầu
  const [loading, setLoading] = useState(true);
  // selectDialogOpen: mở dialog chọn khóa học để tạo bank mới
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  // coursesWithoutQB: khóa học chưa có ngân hàng câu hỏi (dùng trong dialog tạo mới)
  const [coursesWithoutQB, setCoursesWithoutQB] = useState([]);

  // ===== DERIVED STATE từ URL query params =====
  const queryState = useMemo(() => parseQBListParams(searchParams), [searchParams]);
  const showReset = hasActiveQBFilters(queryState);
  const activeFilterChips = useMemo(
    () => buildQBActiveChips(queryState, mentorQuestionBankFilterOptionsMock),
    [queryState],
  );

  // ===== useEffect: TẢI DỮ LIỆU KHI VÀO TRANG =====
  // Gọi 2 API song song: danh sách bank của mentor + tất cả khóa học của mentor
  // → lọc ra khóa học chưa có bank để hiện trong dialog "Tạo bộ câu hỏi"
  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      try {
        const userRaw = localStorage.getItem('user');
        const user = JSON.parse(userRaw);
        setLoading(true);

        const [bankRes, courseRes] = await Promise.all([
          axios.get('http://localhost:5000/api/question-bank/getAllBankOfMentor', {
            params: { userId: user.userId },
          }),
          axios.post('http://localhost:5000/api/courses/my-courses', {
            userId: user.userId,
            roleName: user.roles[0],
          }),
        ]);

        if (!isMounted) return;

        setListQuestionBank(bankRes.data.questionBanks);

        const listAllCourse = courseRes.data.data;
        const listCourseWithBank = bankRes.data.questionBanks;
        const listCourseNoBank = listAllCourse.filter(
          (course) =>
            !listCourseWithBank.some((item) => item.CourseId === course.CourseId),
        );
        setCoursesWithoutQB(listCourseNoBank);
      } catch (err) {
        console.error(err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cập nhật query params trên URL (replace để không tạo history entry mới)
  const updateQuery = (patch) => {
    setSearchParams(
      buildQBListSearchParams({ ...queryState, ...patch }, searchParams),
      { replace: true },
    );
  };

  // Lọc + sắp xếp danh sách theo queryState (keyword, status, questionStatus, sort)
  const filteredItems = useMemo(
    () => filterAndSortQBItems(listQuestionBank, queryState),
    [listQuestionBank, queryState],
  );

  // Phân trang: cắt mảng theo page hiện tại
  const pagination = useMemo(
    () => paginateQBItems(filteredItems, queryState.page, PAGE_SIZE),
    [filteredItems, queryState.page],
  );

  // Đồng bộ page trên URL nếu vượt quá tổng số trang sau khi lọc
  useEffect(() => {
    if (!loading && queryState.page !== pagination.page) {
      updateQuery({ page: pagination.page });
    }
  }, [loading, queryState.page, pagination.page]);

  // ===== HANDLERS — thay đổi bộ lọc (reset về trang 1) =====
  const handleStatusChange = (v) => updateQuery({ status: v, page: 1 });
  const handleQuestionStatusChange = (v) => updateQuery({ questionStatus: v, page: 1 });
  const handleSortChange = (v) => updateQuery({ sort: v, page: 1 });

  // Đổi trang + scroll lên đầu
  const handlePageChange = (page) => {
    updateQuery({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Xóa tất cả bộ lọc, trở về mặc định
  const handleReset = () => setSearchParams(resetQBListParams(searchParams), { replace: true });

  // Xóa từng chip lọc (từ khóa, trạng thái KH, trạng thái câu hỏi)
  const handleRemoveChip = ({ type }) => {
    const defaults = {
      q: '',
      status: QB_LIST_DEFAULTS.status,
      questionStatus: QB_LIST_DEFAULTS.questionStatus,
    };
    if (type in defaults) updateQuery({ [type]: defaults[type], page: 1 });
  };

  // Render danh sách: loading / empty / danh sách row
  const renderList = () => {
    if (loading) {
      return <Loading message="Đang tải ngân hàng câu hỏi..." />;
    }

    if (pagination.listQuestionBank.length === 0) {
      return (
        <Box
          sx={{
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: `1px solid ${alpha('#0F172A', 0.08)}`,
          }}
        >
          <EmptyState
            embedded
            icon={QuizOutlinedIcon}
            title={
              listQuestionBank.length > 0
                ? 'Không tìm thấy khóa học phù hợp'
                : 'Chưa có khóa học nào trong ngân hàng câu hỏi'
            }
            description={
              listQuestionBank.length > 0
                ? 'Thử thay đổi từ khóa hoặc bộ lọc.'
                : 'Tạo khóa học trước, sau đó quay lại để quản lý câu hỏi.'
            }
            actionLabel={listQuestionBank.length > 0 && showReset ? 'Xóa bộ lọc' : undefined}
            onAction={listQuestionBank.length > 0 && showReset ? handleReset : undefined}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {pagination.listQuestionBank.map((bank) => (
          <MentorQuestionBankRow key={bank.BankId ?? bank.CourseId} bankItem={bank} />
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      {/* Phần header: breadcrumb + nút Tạo bộ câu hỏi */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1.5, sm: 2 },
          mb: 2.5,
        }}
      >
        <Breadcrumbs
          separator="/"
          sx={{ '& .MuiBreadcrumbs-separator': { color: '#64748B', mx: 0.5 } }}
        >
          <MuiLink
            component={Link}
            to="/home"
            underline="hover"
            sx={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}
          >
            Trang chủ
          </MuiLink>
          <Typography sx={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}>
            Ngân hàng câu hỏi
          </Typography>
        </Breadcrumbs>

        <AppButton
          startIcon={<AddRoundedIcon />}
          onClick={() => setSelectDialogOpen(true)}
          sx={{
            height: 44,
            px: 2.5,
            fontSize: 14,
            fontWeight: 700,
            borderRadius: '999px',
            bgcolor: '#0891B2',
            color: '#fff',
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
            boxShadow: 'none',
            '&:hover': { bgcolor: '#0E7490', boxShadow: 'none' },
          }}
        >
          Tạo bộ câu hỏi
        </AppButton>
      </Box>

      {/* Toolbar: bộ lọc trạng thái KH, trạng thái câu hỏi, sắp xếp */}
      <MentorQuestionBankToolbar
        statusFilter={queryState.status}
        onStatusChange={handleStatusChange}
        questionStatusFilter={queryState.questionStatus}
        onQuestionStatusChange={handleQuestionStatusChange}
        sortBy={queryState.sort}
        onSortChange={handleSortChange}
        totalCount={filteredItems.length}
        showReset={showReset}
        onReset={handleReset}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={handleRemoveChip}
      />

      {/* Danh sách khóa học (hoặc loading/empty) */}
      {renderList()}

      {/* Phân trang — chỉ hiện khi có nhiều hơn 1 trang */}
      {!loading && pagination.totalPages > 1 && (
        <>
          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'center', color: '#64748B', mt: 3, fontSize: 12 }}
          >
            Hiển thị {pagination.rangeStart}–{pagination.rangeEnd} trong tổng số{' '}
            {pagination.totalItems} khóa học
          </Typography>
          <AppPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Dialog chọn khóa học chưa có bank để tạo mới */}
      <MentorSelectCourseForQBDialog
        open={selectDialogOpen}
        onClose={() => setSelectDialogOpen(false)}
        courses={coursesWithoutQB}
        onSelect={(course) =>
          navigate(`/mentor/question-banks/${course.CourseId}`)
        }
      />
    </Box>
  );
}
