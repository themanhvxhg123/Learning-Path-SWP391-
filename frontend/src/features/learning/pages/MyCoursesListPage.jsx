import { useEffect, useMemo, useState } from "react";
import { Box, Breadcrumbs, Link as MuiLink, Stack, Typography, alpha, useTheme } from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import MyCourseRow from "@/features/courses/components/MyCourseRow";
import MyCoursesToolbar from "@/features/courses/components/MyCoursesToolbar";
import MyCourseContinueSection from "@/features/courses/components/MyCourseContinueSection";
import CourseListPagination, {
  COURSE_LIST_PAGE_SIZE,
} from "@/features/courses/components/CourseListPagination";
import EmptyState from "@/shared/ui/EmptyState";
import useSavedCourses from "@/features/courses/hooks/useSavedCourses";
import { buildActiveFilterChips, buildCourseDetailPath } from "@/features/courses/utils/courseListParams";
import { getMyCoursesApi } from "@/features/auth/services/authService";

const PAGE_SIZE = COURSE_LIST_PAGE_SIZE;

const SORT_OPTIONS = [
  { value: "recent", label: "Hoạt động gần nhất" },
  { value: "progress", label: "Tiến độ cao nhất" },
  { value: "name", label: "Tên khóa học (A-Z)" },
];

const DEFAULT_FILTERS = {
  statusTab: "all",
  categories: [],
  levels: [],
  sort: "recent",
  page: 1,
};



function getRowVariant(course) {
  if (course.enrollmentStatus === "completed") return "completed";
  if (course.enrollmentStatus === "learning") return "learning";
  return "saved";
}

function matchesStatusTab(course, tab) {
  if (tab === "all") return true;
  if (tab === "learning") return course.enrollmentStatus === "learning";
  if (tab === "completed") return course.enrollmentStatus === "completed";
  if (tab === "saved") return course.enrollmentStatus === "none";
  return true;
}

function hasActiveFilters(filters, keyword = "") {
  return (
    Boolean(keyword) ||
    filters.categories.length > 0 ||
    filters.levels.length > 0
  );
}

function matchesKeyword(course, keyword) {
  if (!keyword) return true;
  const kw = keyword.toLowerCase();
  return (
    course.courseName.toLowerCase().includes(kw) ||
    course.category.toLowerCase().includes(kw) ||
    (course.instructor?.toLowerCase().includes(kw) ?? false)
  );
}

function pickContinueCourse(courses) {
  const learning = courses
    .filter((c) => c.enrollmentStatus === "learning")
    .sort((a, b) => (a.lastActivityOrder ?? 99) - (b.lastActivityOrder ?? 99));
  return learning[0] ?? null;
}

export default function MyCoursesListPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { savedIds, isSaved, unsave } = useSavedCourses();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const keyword = (searchParams.get("keyword") ?? "").trim();
  const [allCourses, setAllCourses] = useState([]);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [levelOptions, setLevelOptions] = useState([]);

  useEffect(() => {
    async function fetchLookups() {
      try {
        const [catRes, levRes] = await Promise.all([
          fetch('http://localhost:5000/api/categories'),
          fetch('http://localhost:5000/api/levels')
        ]);


        const catData = await catRes.json();
        const levData = await levRes.json();

        // Nếu API categories thành công, ta đổ dữ liệu vào state categoryOptions
        if (catData.success) {
          setCategoryOptions(catData.data.map(c => ({
            value: c.displayName,
            label: c.displayName
          })));
        }

        // Nếu API levels thành công, ta đổ dữ liệu vào state levelOptions
        if (levData.success) {
          setLevelOptions(levData.data.map(l => ({
            value: l.displayName,
            label: l.displayName
          })));
        }
      } catch (error) {
        console.error("Lỗi tải danh mục lựa chọn:", error);
      }
    }

    fetchLookups();
  }, []); // Mảng rỗng [] báo cho React biết chỉ chạy đoạn code này 1 lần duy nhất

  //________________FETCH DATA______________________
  useEffect(() => {
    const getData = async () => {
      try {
        const rawUser = localStorage.getItem("user");

        console.log("RAW USER:", rawUser);

        if (!rawUser) {
          console.error("Chưa có user trong localStorage");
          return;
        }

        const user = JSON.parse(rawUser);

        console.log("PARSED USER:", user);

        const userId = user.userId || user.UserId || user.id || user.Id;

        const roleName = Array.isArray(user.roles)
          ? (
            typeof user.roles[0] === "string"
              ? user.roles[0]
              : user.roles[0]?.roleName || user.roles[0]?.RoleName
          )
          : user.roles || user.roleName || user.RoleName || user.role;

        console.log("SEND TO BACKEND:", {
          userId,
          roleName,
        });

        if (!userId || !roleName) {
          console.error("Thiếu userId hoặc roleName sau khi đọc localStorage", {
            userId,
            roleName,
            user,
          });
          return;
        }

        const res = await fetch("http://localhost:5000/api/courses/my-courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: Number(userId),
            roleName: String(roleName).toLowerCase(),
          }),
        });

        const result = await res.json();

        console.log("MY COURSES RESPONSE:", result);

        if (!res.ok || !result.success) {
          console.error(result.message || "Không thể lấy danh sách Courses");
          return;
        }

        // Bắt đầu vòng lặp để đổi tên biến từ Database cho khớp với Giao diện
        const mappedData = [];
        const rawData = result.data || [];

        for (let i = 0; i < rawData.length; i++) {
          const dbCourse = rawData[i];

          // 1. Kiểm tra tiến độ học
          let currentProgress = 0;
          if (dbCourse.progress != null) {
            currentProgress = dbCourse.progress;
          }
          // 2. Kiểm tra trạng thái
          let status = "learning";
          if (currentProgress >= 100) {
            status = "completed";
          }
          // 3. Đếm số chương học (Paths)
          let stageCount = 0;
          if (dbCourse.Paths) {
            stageCount = dbCourse.Paths.length;
          }
          // 4. Kiểm tra ảnh Thumbnail bị lỗi
          let courseImage = dbCourse.Thumbnail || dbCourse.thumbnail;
          if (courseImage === 'CHƯA FIX LỖI ẢNH') {
            courseImage = null;
          }
          // 5. Đưa dữ liệu vào danh sách mới với tên biến viết thường
          mappedData.push({
            courseId: dbCourse.CourseId,
            courseName: dbCourse.CourseName,
            thumbnail: courseImage,

            category: dbCourse.CategoryDisplayName || dbCourse.CategoryName || "Chưa phân loại",
            level: dbCourse.LevelDisplayName || dbCourse.levelName || "Cơ bản",
            instructor: dbCourse.Instructor || "S.T.A.R Mentor Team",

            totalLessons: dbCourse.TotalLessons || 0,
            totalNodes: stageCount,

            progressPercentage: currentProgress,
            enrollmentStatus: status,

            // Các dữ liệu mặc định bắt buộc phải có để tránh lỗi giao diện
            isSaved: false,
            modules: dbCourse.Paths || []
          });
        }
        // Đưa danh sách đã xử lý xong lên giao diện
        setAllCourses(mappedData);
      } catch (error) {
        console.log("Fetch courses error:", error);
      }
    };

    getData();
  }, []);

  const showReset = hasActiveFilters(filters, keyword);
  const activeFilterChips = useMemo(
    () => buildActiveFilterChips({ ...filters, keyword, statuses: [] }),
    [filters, keyword]
  );

  const updateFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const filteredCourses = useMemo(() => {
    let list = allCourses.filter((course) => matchesStatusTab(course, filters.statusTab));

    if (keyword) {
      list = list.filter((course) => matchesKeyword(course, keyword));
    }
    if (filters.categories.length > 0) {
      list = list.filter((course) => filters.categories.includes(course.category));
    }
    if (filters.levels.length > 0) {
      list = list.filter((course) => filters.levels.includes(course.level));
    }

    list.sort((a, b) => {
      if (filters.sort === "progress") {
        return b.progressPercentage - a.progressPercentage;
      }
      if (filters.sort === "name") {
        return a.courseName.localeCompare(b.courseName, "vi");
      }
      const orderA = a.lastActivityOrder ?? a.savedAtOrder ?? 99;
      const orderB = b.lastActivityOrder ?? b.savedAtOrder ?? 99;
      return orderA - orderB;
    });

    return list;
  }, [allCourses, filters, keyword]);

  const continueCourse = useMemo(() => pickContinueCourse(filteredCourses), [filteredCourses]);
  const showContinueSection =
    continueCourse &&
    (filters.statusTab === "all" || filters.statusTab === "learning");

  const hasAnyCourse = allCourses.length > 0;
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageCourses = filteredCourses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    if (filters.page !== currentPage) updateFilters({ page: currentPage });
  }, [filters.page, currentPage]);

  const handleRemoveFilterChip = (chip) => {
    if (chip.type === "keyword") {
      const next = new URLSearchParams(searchParams);
      next.delete("keyword");
      next.delete("page");
      setSearchParams(next, { replace: true });
      updateFilters({ page: 1 });
      return;
    }
    if (chip.type === "category") {
      updateFilters({ categories: filters.categories.filter((v) => v !== chip.value), page: 1 });
    } else if (chip.type === "level") {
      updateFilters({ levels: filters.levels.filter((v) => v !== chip.value), page: 1 });
    }
  };

  const handleResetFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("keyword");
    next.delete("page");
    setSearchParams(next, { replace: true });
    updateFilters({ categories: [], levels: [], page: 1 });
  };

  const handleLearningAction = (course) => {
    navigate(`/my-courses/${course.courseId}/learn`);
  };

  const renderEmptyState = () => {
    if (filters.statusTab === "saved") {
      return (
        <Box sx={{ py: 7, textAlign: "center", borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
          <BookmarkBorderRoundedIcon sx={{ fontSize: 48, color: "#F59E0B", opacity: 0.45, mb: 1.5 }} />
          <EmptyState
            embedded
            title="Bạn chưa lưu khóa học nào"
            description="Lưu các khóa học bạn quan tâm để quay lại sau."
            actionLabel="Khám phá khóa học"
            onAction={() => navigate("/courses")}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ py: 7, textAlign: "center", borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
        <MenuBookOutlinedIcon sx={{ fontSize: 48, color: "primary.main", opacity: 0.3, mb: 1.5 }} />
        <EmptyState
          embedded
          title={hasAnyCourse ? "Không tìm thấy khóa học phù hợp" : "Bạn chưa đăng ký khóa học nào"}
          description={
            hasAnyCourse
              ? keyword
                ? "Thử từ khóa khác hoặc xóa bộ lọc để xem thêm khóa học."
                : "Thử chọn bộ lọc khác để xem thêm khóa học."
              : "Khám phá các khóa học phù hợp để bắt đầu lộ trình học."
          }
          actionLabel={hasAnyCourse ? "Xóa bộ lọc" : "Khám phá khóa học"}
          onAction={() => (hasAnyCourse ? handleResetFilters() : navigate("/courses"))}
        />
      </Box>
    );
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1280, mx: "auto" }}>
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2.5, "& .MuiBreadcrumbs-separator": { color: "#64748B", mx: 0.5 } }}
      >
        <MuiLink component={Link} to="/home" underline="hover" sx={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
          Trang chủ
        </MuiLink>
        <Typography sx={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>
          Khóa học của tôi
        </Typography>
      </Breadcrumbs>

      <MyCoursesToolbar
        statusTab={filters.statusTab}
        onStatusTabChange={(value) => updateFilters({ statusTab: value, page: 1 })}
        categories={filters.categories}
        onCategoriesChange={(e) => updateFilters({ categories: e.target.value, page: 1 })}
        categoryOptions={categoryOptions}
        levels={filters.levels}
        onLevelsChange={(e) => updateFilters({ levels: e.target.value, page: 1 })}
        levelOptions={levelOptions}
        sortBy={filters.sort}
        onSortChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}
        sortOptions={SORT_OPTIONS}
        totalCount={filteredCourses.length}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={handleRemoveFilterChip}
        showReset={showReset}
        onReset={handleResetFilters}
      />



      {!hasAnyCourse || filteredCourses.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <Stack spacing={2}>
            {pageCourses.map((course) => (
              <MyCourseRow
                key={course.courseId}
                course={course}
                variant={getRowVariant(course)}
                onAction={handleLearningAction}
                onUnsave={
                  course.enrollmentStatus === "none"
                    ? () => unsave(course.courseId)
                    : undefined
                }
              />
            ))}
          </Stack>

          <CourseListPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={(value) => {
              updateFilters({ page: value });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}
    </Box>
  );
}
