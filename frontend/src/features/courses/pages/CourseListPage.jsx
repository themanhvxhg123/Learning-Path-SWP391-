import { useEffect, useMemo, useState } from "react";
import { Box, Breadcrumbs, Grid, Link as MuiLink, Typography, alpha, useTheme } from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Loading from "@/shared/ui/Loading";
import EmptyState from "@/shared/ui/EmptyState";
import CourseCard from "@/features/courses/components/CourseCard";
import CourseCatalogToolbar from "@/features/courses/components/CourseCatalogToolbar";
import CourseListPagination, { COURSE_LIST_PAGE_SIZE } from "@/features/courses/components/CourseListPagination";
import { toast } from "@/shared/ui/Toast";
import {
  buildActiveFilterChips,
  buildCourseListSearchParams,
  hasActiveCourseFilters,
  parseCourseListParams,
  resetCourseListParams,
} from "@/features/courses/utils/courseListParams";

const PAGE_SIZE = COURSE_LIST_PAGE_SIZE;

const STATUS_OPTIONS = [
  { value: "enrolled", label: "Đã đăng ký" },
  { value: "not_enrolled", label: "Chưa đăng ký" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Phổ biến" },
  { value: "progress", label: "Tiến độ cao nhất" },
];

// Hàm gọi API lấy danh sách khóa học kèm bộ lọc từ url
async function fetchCourses(userId, filters) {
  try {
    const params = new URLSearchParams();
    if (filters.keyword) params.append('search', filters.keyword);
    if (filters.categories?.length > 0) {
      filters.categories.forEach(cat => params.append('category', cat));
    }
    if (filters.levels?.length > 0) {
      filters.levels.forEach(lvl => params.append('level', lvl));
    }
    if (filters.statuses?.length > 0) params.append('status', filters.statuses[0]);
    if (filters.sort) params.append('sort', filters.sort);

    const url = `http://localhost:5000/api/courses/student?${params.toString()}`;
    const headers = {};
    if (userId) headers['x-user-id'] = userId;

    const res = await fetch(url, { headers });
    const result = await res.json();

    if (!res.ok || !result.success) return { data: [], totalCount: 0 };
    return { data: result.data || [], totalCount: result.totalCount || 0 };
  } catch (err) {
    console.error("Lỗi fetch khóa học:", err);
    return { data: [], totalCount: 0 };
  }
}

export default function CourseListPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State lưu trữ danh sách khóa học và phân trang
  const [courses, setCourses] = useState([]);
  const [totalCourses, setTotalCourses] = useState(0);
  const [categoriesList, setCategoriesList] = useState([]);
  const [levelsList, setLevelsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Xử lý đồng bộ dữ liệu bộ lọc từ URL thanh địa chỉ
  const filters = useMemo(() => parseCourseListParams(searchParams), [searchParams]);
  const showReset = hasActiveCourseFilters(filters);
  const activeFilterChips = useMemo(() => buildActiveFilterChips(filters, undefined, categoriesList, levelsList), [filters, categoriesList, levelsList]);

  // Hàm cập nhật param lọc mới lên URL thanh địa chỉ
  const updateFilters = (patch, options = {}) => {
    const next = buildCourseListSearchParams({ ...filters, ...patch }, searchParams);
    setSearchParams(next, { replace: options.replace ?? true });
  };

  useEffect(() => {
    //danh sách cate danh sách level
    async function fetchLookups() {
      try {
        const [catRes, levRes] = await Promise.all([
          fetch('http://localhost:5000/api/categories'),
          fetch('http://localhost:5000/api/levels')
        ]);
        const catData = await catRes.json();
        const levData = await levRes.json();

        if (catData.success) {
          setCategoriesList(catData.data.map(c => ({
            value: String(c.categoryId),
            label: c.displayName
          })));
        }
        if (levData.success) {
          setLevelsList(levData.data.map(l => ({
            value: String(l.levelId),
            label: l.displayName
          })));
        }
      } catch (error) {
        console.error("Lỗi tải danh mục lựa chọn:", error);
      }
    }
    fetchLookups();
  }, []);

  // Tải danh sách khóa học dựa theo bộ lọc thay đổi (hoặc không)
  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        setLoading(true);
        // Đọc thông tin đăng nhập trực tiếp từ localStorage
        const userRaw = localStorage.getItem('user');
        const currentUser = userRaw ? JSON.parse(userRaw) : null;

        // Truyền id của user sang API lấy danh sách khóa học
        const result = await fetchCourses(currentUser?.userId, filters);
        if (isMounted) {
          setCourses(Array.isArray(result.data) ? result.data : []);
          setTotalCourses(result.totalCount || 0);
        }
      } catch {
        toast.error("Không thể tải danh sách khóa học. Vui lòng thử lại.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCourses();
    return () => { isMounted = false; };
  }, [filters]);

  // Logic chia nhỏ danh sách hiển thị phân trang ở giao diện client
  const totalPages = Math.max(1, Math.ceil(totalCourses / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageCourses = courses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (filters.page !== currentPage) {
      updateFilters({ page: currentPage });
    }
  }, [filters.page, currentPage]);

  // Bắt sự kiện tương tác bộ lọc thanh công cụ công khai
  const handleCategoriesChange = (e) => updateFilters({categories: e.target.value, page: 1});
  const handleLevelsChange = (e) => updateFilters({levels: e.target.value, page: 1});
  const handleStatusesChange = (e) => updateFilters({statuses: e.target.value, page: 1});
  const handleSortChange = (e) => updateFilters({sort: e.target.value, page: 1});
  const handlePageChange = (val) => {
    updateFilters({ page: val });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Hàm xử lý khi người dùng bấm vào nút "Tiếp tục học"
  const handleContinueLearning = (course) => {
    const cId = course.CourseId || course.courseId || course.id;
    navigate(`/my-courses/${cId}/learn`);
  };
  // Xử lý xóa nhãn chip tiêu chí lọc đang hiển thị
  const handleRemoveFilterChip = (chip) => {
    if (chip.type === "keyword") {
      updateFilters({ keyword: "", page: 1 });
      return;
    }
    if (chip.type === "category") {
      updateFilters({ categories: filters.categories.filter((v) => v !== chip.value), page: 1 });
      return;
    }
    if (chip.type === "level") {
      updateFilters({ levels: filters.levels.filter((v) => v !== chip.value), page: 1 });
      return;
    }
    if (chip.type === "status") {
      updateFilters({ statuses: [], page: 1 });
    }
  };
//Làm nhiệm vụ "Xóa sạch bộ lọc" 
  const handleResetFilters = () => setSearchParams(resetCourseListParams(searchParams), { replace: true });

  return (
    <Box sx={{ width: "100%", maxWidth: 1280, mx: "auto" }}>
      {/* Thanh định hướng điều hướng Breadcrumbs */}
      <Breadcrumbs separator="/" sx={{ mb: 2.5, "& .MuiBreadcrumbs-separator": { color: "#64748B", mx: 0.5 } }}>
        <MuiLink component={Link} to="/home" underline="hover" sx={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
          Trang chủ
        </MuiLink>
        <Typography sx={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>
          Khóa học
        </Typography>
      </Breadcrumbs>

      {/* Bộ thanh công cụ Toolbar chứa các thẻ lọc tìm kiếm */}
      <CourseCatalogToolbar
        categories={filters.categories}
        onCategoriesChange={handleCategoriesChange}
        categoryOptions={categoriesList}
        levels={filters.levels}
        onLevelsChange={handleLevelsChange}
        levelOptions={levelsList}
        statuses={filters.statuses}
        onStatusesChange={handleStatusesChange}
        statusOptions={STATUS_OPTIONS}
        sortBy={filters.sort}
        onSortChange={handleSortChange}
        sortOptions={SORT_OPTIONS}
        totalCount={totalCourses}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={handleRemoveFilterChip}
        showReset={showReset}
        onReset={handleResetFilters}
      />

      {/* Khu vực kết quả hiển thị danh sách khóa học */}
      {loading ? (
        <Loading message="Đang tải danh sách khóa học..." />
      ) : courses.length === 0 ? (
        <Box sx={{ py: 7, textAlign: "center", borderRadius: 3, bgcolor: "background.paper", border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
          <MenuBookOutlinedIcon sx={{ fontSize: 48, color: "primary.main", opacity: 0.3, mb: 1.5 }} />
          <EmptyState
            embedded
            title="Không tìm thấy khóa học phù hợp"
            description={filters.keyword ? "Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác." : "Thử chọn bộ lọc khác để xem thêm khóa học."}
            actionLabel="Xóa bộ lọc"
            onAction={handleResetFilters}
          />
        </Box>
      ) : (
        <>
          <Grid container spacing={2.5}>
            {pageCourses.map((course, index) => (
              <Grid key={course.CourseId || index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <CourseCard
                  course={course}
                  onContinueLearning={handleContinueLearning}
                />
              </Grid>
            ))}
          </Grid>

          {/* Thanh phân trang ở cuối trang danh sách */}
          <CourseListPagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </Box>
  );
}