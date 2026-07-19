import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';

import { CREATE_CARD_SX, DETAIL_SECTION_HEADER_SX, MUTED } from './mentorCourseCreateStyles';
import MentorCardSectionTitle from './MentorCardSectionTitle';

import MentorCourseStudentsSummary from './MentorCourseStudentsSummary';
import MentorCourseStudentsToolbar from './MentorCourseStudentsToolbar';
import MentorCourseStudentsList from './MentorCourseStudentsList';
import MentorCourseStudentsPagination from './MentorCourseStudentsPagination';

import { fetchCourseStudents } from '@/features/mentor/services/mentorCourseService';

import {
  computeCourseStudentStats,
  filterAndSortCourseStudents,
  hasActiveCourseStudentFilters,
  paginateCourseStudents,
} from '@/features/mentor/utils/mentorCourseStudentsUtils';

// Bộ filter mặc định ban đầu
// q: từ khóa search
// status: lọc trạng thái học viên
// sort: kiểu sắp xếp
const DEFAULT_FILTERS = {
  q: '',
  status: 'all',
  sort: 'progress_desc',
};

export default function MentorCourseStudentsTab({ courseId }) {
  // Lưu toàn bộ danh sách học viên lấy từ API
  // Đây là data gốc, chưa filter, chưa sort, chưa phân trang
  const [allStudents, setAllStudents] = useState([]);

  // Lưu thống kê tổng quan của học viên trong khóa học
  // Ví dụ: tổng số học viên, đang học, hoàn thành, tiến độ trung bình
  const [stats, setStats] = useState({
    totalStudents: 0,
    learningCount: 0,
    completedCount: 0,
    averageProgress: 0,
  });

  // loading dùng để biết API đang tải hay đã tải xong
  const [loading, setLoading] = useState(true);

  // filters lưu trạng thái search/filter/sort hiện tại
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // page lưu trang hiện tại của pagination
  const [page, setPage] = useState(1);

  // Hàm update filter dùng chung cho search, status, sort
  // Mỗi lần filter thay đổi thì reset page về 1
  // Vì nếu đang ở page 3 mà search ra ít kết quả thì page 3 có thể không còn hợp lệ
  const updateFilters = useCallback((updater) => {
    setPage(1);
    setFilters(updater);
  }, []);

  // Hàm gọi API để lấy danh sách học viên và thống kê
  // useCallback giúp giữ lại function này, chỉ tạo lại khi courseId thay đổi
  const loadStudents = useCallback(async () => {
    // Bắt đầu loading
    setLoading(true);

    // Gọi song song 2 API:
    // 1. fetchCourseStudents(courseId): lấy danh sách học viên
    // 2. fetchCourseStudentStats(courseId): lấy thống kê học viên
    //
    // Promise.all giúp 2 API chạy cùng lúc, nhanh hơn gọi tuần tự
    const studentsRes = await fetchCourseStudents(courseId);

    if (studentsRes.ok) {
      setAllStudents(studentsRes.students);
      setStats(computeCourseStudentStats(studentsRes.students));
    } else {
      setAllStudents([]);
      setStats(computeCourseStudentStats([]));
    }

    // Tải xong thì tắt loading
    setLoading(false);
  }, [courseId]);

  // useEffect này chạy khi component mount lần đầu
  // hoặc khi loadStudents thay đổi
  //
  // Vì loadStudents phụ thuộc vào courseId,
  // nên khi courseId đổi thì API sẽ được gọi lại
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Tính danh sách học viên sau khi search/filter/sort
  //
  // allStudents là danh sách gốc lấy từ API
  // filters là điều kiện lọc hiện tại
  //
  // useMemo giúp chỉ tính lại khi allStudents hoặc filters thay đổi
  const filteredStudents = useMemo(
    () => filterAndSortCourseStudents(allStudents, filters),
    [allStudents, filters]
  );

  // Tính dữ liệu phân trang từ danh sách đã filter
  //
  // filteredStudents: danh sách đã search/filter/sort
  // page: trang hiện tại
  //
  // pagination thường sẽ trả về:
  // - items: học viên của trang hiện tại
  // - page: page hiện tại hợp lệ
  // - totalItems: tổng số học viên sau filter
  // - totalPages: tổng số trang
  // - rangeStart, rangeEnd: khoảng đang hiển thị
  const pagination = useMemo(
    () => paginateCourseStudents(filteredStudents, page),
    [filteredStudents, page]
  );

  // Effect này dùng để tự sửa page nếu page hiện tại không hợp lệ
  //
  // Ví dụ:
  // Đang ở page 5
  // Sau khi search/filter chỉ còn 1 page
  // paginateCourseStudents có thể trả pagination.page = 1
  //
  // Nếu pagination.page khác page hiện tại thì setPage lại
  useEffect(() => {
    if (pagination.page !== page) {
      setPage(pagination.page);
    }
  }, [pagination.page, page]);

  // Kiểm tra có filter nào đang được bật không
  //
  // Ví dụ:
  // q !== ''
  // status !== 'all'
  // sort !== 'progress_desc'
  //
  // Nếu có filter active thì hiện nút reset
  const showReset = hasActiveCourseStudentFilters(filters);

  return (
    <Box sx={CREATE_CARD_SX}>
      <Box sx={DETAIL_SECTION_HEADER_SX}>
        <MentorCardSectionTitle title="Học viên" mb={0.35} />
        <MentorCourseStudentsSummary stats={stats} loading={loading} />
      </Box>

      <MentorCourseStudentsToolbar
        search={filters.q}
        onSearchChange={(q) => updateFilters((prev) => ({ ...prev, q }))}
        statusFilter={filters.status}
        onStatusChange={(status) => updateFilters((prev) => ({ ...prev, status }))}
        sortBy={filters.sort}
        onSortChange={(sort) => updateFilters((prev) => ({ ...prev, sort }))}
        showReset={showReset}
        onReset={() => {
          // Khi bấm reset:
          // reset về trang 1
          // đưa filters về mặc định
          setPage(1);
          setFilters(DEFAULT_FILTERS);
        }}
        resultCount={loading ? '—' : pagination.totalItems}
      />

      <MentorCourseStudentsList
        students={pagination.items}
        loading={loading}
        hasAnyStudents={allStudents.length > 0}
        isFiltered={showReset}
        onClearFilters={() => {
          setPage(1);
          setFilters(DEFAULT_FILTERS);
        }}
      />

      {!loading && pagination.totalItems > 0 && pagination.totalPages > 1 && (
        <>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              color: MUTED,
              mt: 2.5,
              fontSize: 12,
            }}
          >
            Hiển thị {pagination.rangeStart}–{pagination.rangeEnd} trong tổng số{' '}
            {pagination.totalItems} học viên
          </Typography>

          <MentorCourseStudentsPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </Box>
  );
}