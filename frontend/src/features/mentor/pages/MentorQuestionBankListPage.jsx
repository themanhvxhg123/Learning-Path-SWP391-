/**
 * MentorQuestionBankListPage
 * Route: /mentor/question-banks
 * Search: Header SearchBox (param q) — không nằm trong toolbar.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import MentorQuestionBankToolbar from '@/features/mentor/components/questionBank/MentorQuestionBankToolbar';
import MentorQuestionBankList from '@/features/mentor/components/questionBank/MentorQuestionBankList';
import MentorQuestionBankListPagination, {
  QB_LIST_PAGE_SIZE,
} from '@/features/mentor/components/questionBank/MentorQuestionBankListPagination';
import { mentorQuestionBankFilterOptionsMock } from '@/features/mentor/data/mentorQuestionBankMock';
import {
  fetchCoursesForQB,
  getQuestionBankListSummaries,
} from '@/features/mentor/services/questionBankService';
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

const MentorSelectCourseForQBDialog = lazy(
  () => import('@/features/mentor/components/questionBank/MentorSelectCourseForQBDialog'),
);

const PAGE_SIZE = QB_LIST_PAGE_SIZE;

export default function MentorQuestionBankListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [coursesWithoutQB, setCoursesWithoutQB] = useState([]);
  const coursesPrefetchStartedRef = useRef(false);

  const queryState = useMemo(() => parseQBListParams(searchParams), [searchParams]);
  const showReset = hasActiveQBFilters(queryState);

  const activeFilterChips = useMemo(
    () => buildQBActiveChips(queryState, mentorQuestionBankFilterOptionsMock),
    [queryState],
  );

  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      try {
        setLoading(true);
        const res = await getQuestionBankListSummaries();
        if (isMounted && res.ok) {
          setItems(res.items);
        }
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

  const prefetchCoursesForDialog = useCallback(() => {
    if (coursesPrefetchStartedRef.current) return;
    coursesPrefetchStartedRef.current = true;

    fetchCoursesForQB().then((res) => {
      if (res.ok) {
        setCoursesWithoutQB(res.courses);
      } else {
        coursesPrefetchStartedRef.current = false;
      }
    });
  }, []);

  useEffect(() => {
    if (!selectDialogOpen) return;
    prefetchCoursesForDialog();
  }, [selectDialogOpen, prefetchCoursesForDialog]);

  const updateQuery = useCallback(
    (patch) => {
      setSearchParams(
        buildQBListSearchParams({ ...queryState, ...patch }, searchParams),
        { replace: true },
      );
    },
    [queryState, searchParams, setSearchParams],
  );

  const filteredItems = useMemo(
    () => filterAndSortQBItems(items, queryState),
    [items, queryState],
  );

  const pagination = useMemo(
    () => paginateQBItems(filteredItems, queryState.page, PAGE_SIZE),
    [filteredItems, queryState.page],
  );

  useEffect(() => {
    if (!loading && queryState.page !== pagination.page) {
      updateQuery({ page: pagination.page });
    }
  }, [loading, queryState.page, pagination.page, updateQuery]);

  const handleStatusChange = useCallback(
    (value) => updateQuery({ status: value, page: 1 }),
    [updateQuery],
  );
  const handleQuestionStatusChange = useCallback(
    (value) => updateQuery({ questionStatus: value, page: 1 }),
    [updateQuery],
  );
  const handleSortChange = useCallback(
    (value) => updateQuery({ sort: value, page: 1 }),
    [updateQuery],
  );
  const handlePageChange = useCallback(
    (page) => {
      updateQuery({ page });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateQuery],
  );
  const handleReset = useCallback(
    () => setSearchParams(resetQBListParams(searchParams), { replace: true }),
    [searchParams, setSearchParams],
  );
  const handleRemoveChip = useCallback(
    ({ type }) => {
      const defaults = {
        q: '',
        status: QB_LIST_DEFAULTS.status,
        questionStatus: QB_LIST_DEFAULTS.questionStatus,
      };
      if (type in defaults) updateQuery({ [type]: defaults[type], page: 1 });
    },
    [updateQuery],
  );

  const handleOpenSelectDialog = useCallback(() => {
    prefetchCoursesForDialog();
    setSelectDialogOpen(true);
  }, [prefetchCoursesForDialog]);

  const handleCloseSelectDialog = useCallback(() => {
    setSelectDialogOpen(false);
  }, []);

  const handleSelectCourse = useCallback(
    (course) => {
      navigate(`/mentor/question-banks/create?courseId=${course.CourseId}`);
    },
    [navigate],
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
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
          onClick={handleOpenSelectDialog}
          onMouseEnter={prefetchCoursesForDialog}
          onFocus={prefetchCoursesForDialog}
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

      <MentorQuestionBankList
        items={pagination.items}
        loading={loading}
        hasAnyItems={items.length > 0}
        showReset={showReset}
        onReset={handleReset}
      />

      {!loading && pagination.totalPages > 1 && (
        <>
          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'center', color: '#64748B', mt: 3, fontSize: 12 }}
          >
            Hiển thị {pagination.rangeStart}–{pagination.rangeEnd} trong tổng số{' '}
            {pagination.totalItems} khóa học
          </Typography>
          <MentorQuestionBankListPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {selectDialogOpen && (
        <Suspense fallback={null}>
          <MentorSelectCourseForQBDialog
            open={selectDialogOpen}
            onClose={handleCloseSelectDialog}
            courses={coursesWithoutQB}
            onSelect={handleSelectCourse}
          />
        </Suspense>
      )}
    </Box>
  );
}
