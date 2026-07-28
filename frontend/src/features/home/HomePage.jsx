import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Chip, Divider, Typography, alpha, useTheme } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import CollectionsBookmarkRoundedIcon from "@mui/icons-material/CollectionsBookmarkRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import {
  resolveCategoryChipSx,
  resolveLevelChipSx,
} from "@/shared/catalog/catalogRegistry";
import AppButton from "@/shared/ui/AppButton";
import AppProgressBar, { getProgressColor } from "@/shared/ui/AppProgressBar";
import ThumbnailImage from "@/shared/ui/ThumbnailImage";
import LearningGoalStickyNote from "@/features/home/components/LearningGoalStickyNote";
import heroImg from "@/asset/image/herosection.png";
import { getTopCoursesApi } from "@/features/auth/services/authService";
import { fetchFeaturedNewsArticles } from "@/features/news/services/newsService";
import { formatNewsDate } from "@/features/admin/utils/adminNewsUtils";

/* ─── constants ─────────────────────────────────────────── */

const PRIMARY = "#0891B2";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const BORDER = "rgba(8,145,178,0.08)";

const COURSE_GRID_SX = {
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",
    sm: "1fr 1fr",
    xl: "repeat(4, 1fr)",
  },
  gap: 2.5,
};

function countLessonsFromPaths(paths = []) {
  return paths.reduce((sum, path) => sum + (path.Nodes?.length ?? 0), 0);
}

function normalizeThumbnail(value) {
  if (!value || value === "CHƯA FIX LỖI ẢNH") return null;
  return value;
}

function normalizeHomeCourse(c) {
  const paths = c.Paths || c.paths || [];
  return {
    courseId: c.CourseId ?? c.courseId,
    courseName: c.CourseName ?? c.courseName,
    category:
      c.CategoryDisplayName ??
      c.CategoryName ??
      c.category ??
      "Giao tiếp",
    level: c.LevelDisplayName ?? c.LevelName ?? c.level ?? "Cơ bản",
    instructor: c.InstructorName ?? c.instructor ?? "",
    rating: c.Rating ?? c.rating ?? 4.5,
    studentCount: c.StudentCount ?? c.TotalStudents ?? c.studentCount ?? 0,
    totalLessons: c.TotalLessons ?? countLessonsFromPaths(paths) ?? 0,
    thumbnail: normalizeThumbnail(c.thumbnail || c.Thumbnail),
  };
}

/**
 * Lấy thông tin người dùng hiện tại từ localStorage.
 */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}


const BENEFITS = [
  {
    icon: RouteOutlinedIcon,
    title: "Lộ trình rõ ràng",
    desc: "Từng bước học được thiết kế theo mục tiêu cụ thể, không loạn khi không biết học gì.",
    color: PRIMARY,
  },
  {
    icon: TrackChangesRoundedIcon,
    title: "Theo dõi tiến độ học",
    desc: "Dashboard tiến độ cho từng khóa học, luôn biết mình đang ở đâu trong lộ trình.",
    color: "#059669",
  },
  {
    icon: CollectionsBookmarkRoundedIcon,
    title: "Học liệu theo từng bài",
    desc: "Tài liệu PDF, bài luyện tập và ghi chú đính kèm theo mỗi bài học.",
    color: "#7C3AED",
  },
  {
    icon: AutoAwesomeRoundedIcon,
    title: "Gợi ý khóa học phù hợp",
    desc: "Hệ thống đề xuất khóa học dựa trên mục tiêu và tiến độ học tập của bạn.",
    color: "#EA580C",
  },
];

/* ─── sub-components ─────────────────────────────────────── */

/**
 * Component hiển thị phần đầu (Header) của mỗi mục nội dung, bao gồm nhãn, tiêu đề chính và nút xem thêm.
 */
function SectionHeader({ label, title, action, onAction }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        gap: 1,
        mb: 3,
      }}
    >
      <Box>
        {label && (
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: PRIMARY,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
        )}
        <Typography
          component="h2"
          sx={{
            fontSize: { xs: 20, sm: 22, md: 24 },
            fontWeight: 700,
            color: TEXT,
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
          }}
        >
          {title}
        </Typography>
      </Box>
      {action && (
        <Box
          component="button"
          onClick={onAction}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: PRIMARY,
            fontSize: 13,
            fontWeight: 600,
            px: 0,
            py: 0,
            fontFamily: "inherit",
            transition: "opacity 0.2s ease",
            flexShrink: 0,
            "&:hover": { opacity: 0.75 },
          }}
        >
          {action}
          <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
        </Box>
      )}
    </Box>
  );
}

/**
 * Tiêu đề phụ cho từng mục con bên trong một section lớn.
 */
function SubsectionHeader({ title, description, icon: Icon }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: description ? 0.5 : 0 }}>
        {Icon && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              bgcolor: alpha(PRIMARY, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 17, color: PRIMARY }} />
          </Box>
        )}
        <Typography
          component="h3"
          sx={{
            fontSize: { xs: 17, sm: 18 },
            fontWeight: 700,
            color: TEXT,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>
      </Box>
      {description && (
        <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.55, pl: Icon ? 5 : 0 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Thẻ hiển thị tên danh mục khóa học hoặc chủ đề tin tức.
 */
function CategoryChip({ category }) {
  const style = resolveCategoryChipSx(
    { displayName: category },
    { withBorder: false },
  );
  return (
    <Chip
      label={category}
      size="small"
      sx={{
        ...style,
        fontSize: 11,
        fontWeight: 600,
        height: 22,
        borderRadius: "6px",
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}

/* ─── Section 1: Hero ────────────────────────────────────── */

const HERO_IMG = heroImg;

/**
 * Khối Banner chào mừng chính (Hero Section) ở đầu trang chủ, giới thiệu chung và dẫn đến trang danh sách khóa học/tin tức.
 */
function HeroSection({ onExplore, onViewNews }) {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 0,
        minHeight: { xs: 520, sm: 540, md: 620 },
        display: "flex",
        alignItems: "center",
        px: { xs: 3.5, sm: 5, md: 7 },
        py: { xs: 4, sm: 5, md: 6 },
        mb: { xs: 6, md: 6 },
        border: "none",
        boxShadow: "none",
        /* Ảnh thô — không phủ màu đè lên toàn bộ ảnh trên điện thoại, chỉ tạo lớp phủ sáng rất nhẹ bên trái để dễ đọc chữ */
        backgroundImage: [
          `linear-gradient(90deg,
            rgba(255,255,255,0.38) 0%,
            rgba(255,255,255,0.12) 22%,
            rgba(255,255,255,0.00) 52%
          )`,
          `url("${HERO_IMG}")`,
        ].join(", "),
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        /* Trên máy tính: Ảnh hiển thị với độ sắc nét tối đa ở bên phải, chỉ phủ sáng nhẹ rìa trái */
        [`@media (min-width:600px)`]: {
          backgroundImage: [
            `linear-gradient(90deg,
              rgba(255,255,255,0.42) 0%,
              rgba(255,255,255,0.18) 18%,
              rgba(255,255,255,0.00) 44%
            )`,
            `url("${HERO_IMG}")`,
          ].join(", "),
          backgroundPosition: "center right",
        },
        /*
         * Làm mềm viền (Soft-edge feather): Làm mờ dần 4 cạnh bên ngoài vào nền trắng của trang
         * giúp hình ảnh banner hòa nhập mượt mà vào trang web, không có khung viền sắc cạnh cứng nhắc.
         * Chồng các lớp Gradient: Mờ dần ở cạnh dưới → mờ dần ở cạnh trái/phải → mờ dần ở cạnh trên.
         */
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background: `
            linear-gradient(180deg,
              rgba(255,255,255,0.10) 0%,
              rgba(255,255,255,0.00) 6%,
              rgba(255,255,255,0.00) 80%,
              rgba(255,255,255,0.55) 100%
            ),
            linear-gradient(90deg,
              rgba(255,255,255,0.00) 0%,
              rgba(255,255,255,0.00) 86%,
              rgba(255,255,255,0.55) 100%
            )
          `,
        },
      }}
    >
      {/* Hero content block */}
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          maxWidth: { xs: "100%", sm: 560, md: 560 },
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Title */}
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 30, sm: 36, md: 44 },
            fontWeight: 800,
            color: "#0B1324",
            letterSpacing: "-0.03em",
            lineHeight: 1.14,
            mb: 3,
            textShadow: "0 1px 2px rgba(255,255,255,0.35)",
          }}
        >
          Học tiếng Anh theo{" "}
          <Box component="span" sx={{ color: "#0E7490" }}>
            lộ trình cá nhân hóa
          </Box>
        </Typography>

        {/* Subtitle */}
        <Typography
          sx={{
            fontSize: { xs: 15, md: 16 },
            color: "#334155",
            fontWeight: 500,
            lineHeight: 1.7,
            mb: 4,
            maxWidth: 460,
            textShadow: "0 1px 1px rgba(255,255,255,0.25)",
          }}
        >
          Khám phá khóa học phù hợp, học theo từng chương rõ ràng và theo dõi
          tiến độ của bạn mỗi ngày.
        </Typography>

        {/* CTA buttons */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <AppButton onClick={onExplore} sx={{ px: 3, py: 1.25, fontSize: 14 }}>
            Khám phá khóa học
          </AppButton>
          <AppButton
            variant="outlined"
            onClick={onViewNews}
            sx={{ px: 3, py: 1.25, fontSize: 14 }}
          >
            Xem tin tức
          </AppButton>
        </Box>
      </Box>
    </Box>
  );
}

/* ─── Section 2: Continue ────────────────────────────────── */

/**
 * Khối hiển thị khóa học đang học dang dở của học viên, gồm tiến độ % học tập và bài học gần nhất.
 * Nếu chưa đăng ký khóa nào, sẽ hiển thị khung trống gợi ý đi tìm khóa học.
 */
function ContinueSection({ course, onContinue, onExplore }) {
  const theme = useTheme();
// chưa học bao giờ (new user)
  if (!course) {
    return (
      <Box sx={{ mb: { xs: 7, md: 9 } }}>
        <SectionHeader label="Tiếp tục học" title="Hôm nay học gì?" />
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: "20px",
            border: `1px solid ${BORDER}`,
            bgcolor: "rgba(8,145,178,0.03)",
            textAlign: "center",
          }}
        >
          <MenuBookOutlinedIcon
            sx={{ fontSize: 40, color: alpha("#0891B2", 0.3), mb: 1.5 }}
          />
          <Typography
            sx={{ fontSize: 16, fontWeight: 600, color: TEXT, mb: 0.75 }}
          >
            Bạn chưa bắt đầu khóa học nào
          </Typography>
          <Typography sx={{ fontSize: 14, color: MUTED, mb: 2.5 }}>
            Khám phá khóa học phù hợp với mục tiêu của bạn.
          </Typography>
          <AppButton onClick={onExplore} sx={{ px: 3 }}>
            Khám phá khóa học
          </AppButton>
        </Box>
      </Box>
    );
  }

  // Trường hợp đã hoàn thành tất cả các khóa học trước đây
  if (course.isCompletedAll) {
    return (
      <Box sx={{ mb: { xs: 7, md: 9 } }}>
        <SectionHeader label="Tiếp tục học" title="Hôm nay học gì?" />
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: "20px",
            border: `1px solid ${BORDER}`,
            bgcolor: "rgba(8,145,178,0.03)",
            textAlign: "center",
          }}
        >
          <VerifiedRoundedIcon
            sx={{ fontSize: 40, color: "#059669", mb: 1.5 }}
          />
          <Typography
            sx={{ fontSize: 16, fontWeight: 600, color: TEXT, mb: 0.75 }}
          >
            Bạn đã hoàn thành khóa học trước đây
          </Typography>
          <Typography sx={{ fontSize: 14, color: MUTED, mb: 2.5 }}>
            Hãy ôn tập hoặc học khóa học mới của chúng tôi nhé.
          </Typography>
          <AppButton onClick={onExplore} sx={{ px: 3 }}>
            Khám phá khóa học
          </AppButton>
        </Box>
      </Box>
    );
  }
 //trh còn khoá học (phổ biến nhất)
  const progress = Math.min(Math.max(course.progressPercentage ?? 0, 0), 100);
  const progressColor = getProgressColor(progress);

  return (
    <Box sx={{ mb: { xs: 7, md: 9 } }}>
      <SectionHeader label="Tiếp tục học" title="Hôm nay học gì?" />
      <Box
        sx={{
          position: "relative",
          p: { xs: 2.5, md: 3.5 },
          borderRadius: "20px",
          overflow: "hidden",
          bgcolor: "rgba(8,145,178,0.04)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 4px 24px rgba(8,145,178,0.06)",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: PRIMARY,
            borderRadius: "20px 0 0 20px",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { md: "center" },
            gap: { xs: 2.5, md: 4 },
          }}
        >
          {/* Thumbnail */}
          <ThumbnailImage
            src={course.thumbnail}
            label={course.courseName}
            alt={course.courseName}
            iconSize={28}
            sx={{
              display: { xs: "none", sm: "block" },
              width: { sm: 100, md: 120 },
              height: { sm: 75, md: 90 },
              borderRadius: "12px",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(8,145,178,0.12)",
            }}
          />

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}
            >
              <PlayCircleOutlineRoundedIcon
                sx={{ fontSize: 14, color: PRIMARY }}
              />
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: PRIMARY,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Tiếp tục học
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: { xs: 17, md: 20 },
                fontWeight: 700,
                color: TEXT,
                lineHeight: 1.3,
                mb: 0.75,
              }}
            >
              {course.courseName}
            </Typography>
            {/* <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 1.5 }}>
              {course.currentStage != null && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 14, color: "#94A3B8" }} />
                  <Typography
                    sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
                  >
                    Chương {course.currentStage} · Bài {course.currentLesson}
                  </Typography>
                </Box>
              )}
              {course.lastActivity && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccessTimeOutlinedIcon
                    sx={{ fontSize: 14, color: "#94A3B8" }}
                  />
                  <Typography
                    sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
                  >
                    Học gần nhất: {course.lastActivity}
                  </Typography>
                </Box>
              )}
            </Box>
            {course.currentLessonDetail && (
              <Typography
                sx={{ fontSize: 13, color: TEXT, fontWeight: 500, mb: 1.5 }}
              >
                Bài hiện tại:{" "}
                <Box component="span" sx={{ color: PRIMARY, fontWeight: 600 }}>
                  {course.currentLessonDetail.lesson} ·{" "}
                  {course.currentLessonDetail.title}
                </Box>
              </Typography>
            )} */}
          </Box>

          {/* Progress + CTA */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "row", md: "column" },
              alignItems: { xs: "center", md: "flex-end" },
              gap: { xs: 2, md: 1.5 },
              flexShrink: 0,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flex: { xs: 1, md: "none" },
                width: { md: 160 },
              }}
            >
              <AppProgressBar value={progress} height={7} sx={{ flex: 1 }} />
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: progressColor,
                  minWidth: 36,
                  textAlign: "right",
                }}
              >
                {progress}%
              </Typography>
            </Box>
            <AppButton
              variant="contained"
              onClick={() => onContinue?.(course)}
              sx={{ px: 2.5, py: 1, fontSize: 13, flexShrink: 0 }}
            >
              Tiếp tục học
            </AppButton>
          </Box>
        </Box>
      </Box>
    </Box >
  );
}

/* ─── Section 3: Tin tức ──────────────────────────────────── */

/**
 * Khối tin tức nổi bật, tải tự động từ API và hiển thị dưới dạng các thẻ Card bài viết.
 */
function NewsSection() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchFeaturedNewsArticles(3).then((result) => {
      if (!cancelled && result.ok) {
        setArticles(result.articles);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(
    () =>
      articles.map((article) => ({
        id: `article-${article.id}`,
        articleId: article.id,
        type: "article",
        title: article.title,
        excerpt: article.excerpt,
        category: article.category,
        date: formatNewsDate(article.publishedAt || article.updatedAt),
        thumbnail: article.thumbnail,
      })),
    [articles],
  );

  return (
    <Box sx={{ mb: { xs: 7, md: 9 } }}>
      <SectionHeader
        title="Tin tức"
        action="Xem tất cả"
        onAction={() => navigate("/news")}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "repeat(3, 1fr)",
          },
          gap: 2.5,
        }}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/news/${item.articleId}`}
            sx={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              borderRadius: "18px",
              border: `1px solid ${BORDER}`,
              bgcolor: "#fff",
              overflow: "hidden",
              cursor: "pointer",
              transition: "transform 0.22s ease, box-shadow 0.22s ease",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: "0 12px 32px rgba(8,145,178,0.09)",
              },
            }}
          >
            <Box
              sx={{
                height: 180,
                overflow: "hidden",
                position: "relative",
                bgcolor: alpha(PRIMARY, 0.05),
              }}
            >
              <ThumbnailImage
                src={item.thumbnail}
                label={item.title}
                alt={item.title}
                icon={MenuBookOutlinedIcon}
                iconSize={36}
                sx={{ height: 180, width: "100%" }}
                imgSx={{
                  transition: "transform 0.4s ease",
                  ".MuiBox-root:hover &": { transform: "scale(1.04)" },
                }}
              />
            </Box>

            <Box sx={{ p: 2.25 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25, flexWrap: "wrap" }}
              >
                <CategoryChip category={item.category} />
                {item.date && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CalendarTodayOutlinedIcon sx={{ fontSize: 11, color: MUTED }} />
                    <Typography sx={{ fontSize: 11, color: MUTED }}>{item.date}</Typography>
                  </Box>
                )}
              </Box>

              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: TEXT,
                  lineHeight: 1.35,
                  mb: 0.875,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {item.title}
              </Typography>

              <Typography
                sx={{
                  fontSize: 13,
                  color: MUTED,
                  lineHeight: 1.6,
                  mb: 2,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {item.excerpt}
              </Typography>

              <Box
                component="span"
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: PRIMARY,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.4,
                  opacity: 0.7,
                }}
              >
                Đọc thêm <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>
          </Link>
        ))}
      </Box>
    </Box>
  );
}

/* ─── Section 4: Suggested courses ──────────────────────── */
//Hiển thị khoá học
function CourseGrid({ courses, onNavigateCourse }) {
  return (
    <Box sx={COURSE_GRID_SX}>
      {courses.map((course) => (
        <CourseHomeCard
          key={course.courseId}
          course={course}
          onClick={() => onNavigateCourse(course.courseId)}
        />
      ))}
    </Box>
  );
}
//khung báo
function ForYouPlaceholder({ isLoggedIn, learningGoal, hasCategories, onExplore, onLogin }) {
  return (
    <Box
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: "18px",
        border: `1px dashed ${alpha(PRIMARY, 0.28)}`,
        bgcolor: alpha(PRIMARY, 0.03),
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            bgcolor: alpha(PRIMARY, 0.12),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AutoAwesomeRoundedIcon sx={{ fontSize: 22, color: PRIMARY }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT, mb: 0.5 }}>
            {isLoggedIn
              ? hasCategories
                ? "Bạn đã hoàn thành hoặc đăng ký các khóa học quan tâm"
                : "Chưa có gợi ý phù hợp"
              : "Đăng nhập để nhận gợi ý cá nhân"}
          </Typography>
          <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 520 }}>
            {isLoggedIn
              ? hasCategories
                ? "Bạn đã đăng ký toàn bộ khóa học trong lĩnh vực quan tâm của mình. Hãy khám phá thêm các khóa học bổ ích khác nhé!"
                : learningGoal
                  ? "Hãy cập nhật lĩnh vực quan tâm trong hồ sơ để chúng tôi gợi ý khóa học phù hợp hơn."
                  : "Hoàn thành khảo sát hoặc cập nhật mục tiêu học tập để nhận gợi ý khóa học dành riêng cho bạn."
              : "Chúng tôi sẽ đề xuất khóa học dựa trên mục tiêu và sở thích học tập của bạn."}
          </Typography>
        </Box>
      </Box>
      <AppButton
        variant={isLoggedIn ? "outlined" : "contained"}
        onClick={isLoggedIn ? onExplore : onLogin}
        sx={{ px: 2.5, py: 1, fontSize: 13, flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
      >
        {isLoggedIn ? "Khám phá khóa học" : "Đăng nhập ngay"}
      </AppButton>
    </Box>
  );
}

/**
 * Khối hiển thị các khóa học đề xuất: gợi ý cá nhân và khóa học phổ biến.
 */
function CoursesSection({
  featuredCourses = [],
  forYouCourses = [],
  forYouLoading = false,
  isLoggedIn = false,
  learningGoal = "",
  userCategories = [],
  onExplore,
  onLogin,
  onNavigateCourse,
}) {
  return (
    <Box sx={{ mb: { xs: 7, md: 9 } }}>
      <SectionHeader
        label="Khóa học đề xuất"
        title="Khám phá lộ trình phù hợp với bạn"
        action="Xem tất cả"
        onAction={onExplore}
      />

      <Box sx={{ mb: { xs: 5, md: 6 } }}>
        <SubsectionHeader
          icon={AutoAwesomeRoundedIcon}
          title="Dành cho bạn"
          description="Gợi ý dựa trên mục tiêu học tập và lĩnh vực bạn quan tâm"
        />
        {forYouLoading ? (
          <Box sx={COURSE_GRID_SX}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  borderRadius: "18px",
                  border: `1px solid ${BORDER}`,
                  bgcolor: "#fff",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: 160,
                    bgcolor: alpha(PRIMARY, 0.06),
                    animation: "pulse 1.5s ease-in-out infinite",
                    "@keyframes pulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.45 },
                    },
                  }}
                />
                <Box sx={{ p: 2 }}>
                  <Box sx={{ height: 22, width: "55%", borderRadius: "6px", bgcolor: alpha(MUTED, 0.12), mb: 1.25 }} />
                  <Box sx={{ height: 38, borderRadius: "6px", bgcolor: alpha(MUTED, 0.1), mb: 1.5 }} />
                  <Box sx={{ height: 14, width: "70%", borderRadius: "6px", bgcolor: alpha(MUTED, 0.08) }} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : forYouCourses.length > 0 ? (
          <CourseGrid courses={forYouCourses} onNavigateCourse={onNavigateCourse} />
        ) : (
          <ForYouPlaceholder
            isLoggedIn={isLoggedIn}
            learningGoal={learningGoal}
            hasCategories={userCategories.length > 0}
            onExplore={onExplore}
            onLogin={onLogin}
          />
        )}
      </Box>

      <Box>
        <SubsectionHeader
          icon={PeopleOutlineRoundedIcon}
          title="Được nhiều học viên chọn"
          description="Các khóa học được đăng ký và đánh giá cao nhất"
        />
        <CourseGrid courses={featuredCourses} onNavigateCourse={onNavigateCourse} />
      </Box>
    </Box>
  );
}

/**
 * Thẻ Card hiển thị thông tin tóm tắt của từng khóa học đề xuất (ảnh, tên, rating, số học viên, giảng viên).
 */
function CourseHomeCard({ course, onClick }) {
  const levelSx = resolveLevelChipSx(
    { displayName: course.level },
    { withBorder: false },
  );
  const lvl = { bg: levelSx.bgcolor, text: levelSx.color };

  return (
    <Box
      onClick={onClick}
      sx={{
        borderRadius: "18px",
        border: `1px solid ${BORDER}`,
        bgcolor: "#fff",
        overflow: "hidden",
        cursor: "pointer",
        transition:
          "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 12px 32px rgba(8,145,178,0.10)",
          borderColor: "rgba(8,145,178,0.22)",
        },
      }}
    >
      <ThumbnailImage
        src={course.thumbnail}
        label={course.courseName}
        alt={course.courseName}
        iconSize={36}
        sx={{ height: 160, width: "100%" }}
      />

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {/* Category + Level */}
        <Box sx={{ display: "flex", gap: 0.75, mb: 1.25, flexWrap: "wrap" }}>
          <CategoryChip category={course.category} />
          <Chip
            label={course.level}
            size="small"
            sx={{
              bgcolor: lvl.bg,
              color: lvl.text,
              fontSize: 11,
              fontWeight: 600,
              height: 22,
              borderRadius: "6px",
              "& .MuiChip-label": { px: 1 },
            }}
          />
        </Box>

        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: TEXT,
            lineHeight: 1.35,
            mb: 1,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 38,
          }}
        >
          {course.courseName}
        </Typography>

        {/* Meta */}
        {/* 1. Rating*/}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <StarRoundedIcon sx={{ fontSize: 13, color: "#F59E0B" }} />
            <Typography sx={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>
              {course.rating}
            </Typography>
          </Box>
          {/* 2. Số học viên */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <PeopleOutlineRoundedIcon sx={{ fontSize: 13, color: MUTED }} />
            <Typography sx={{ fontSize: 12, color: MUTED }}>
              {course.studentCount >= 1000
                ? `${(course.studentCount / 1000).toFixed(1)}k`
                : course.studentCount}
            </Typography>
          </Box>
          {/* 3. Số bài học */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <MenuBookOutlinedIcon sx={{ fontSize: 13, color: MUTED }} />
            <Typography sx={{ fontSize: 12, color: MUTED }}>
              {course.totalLessons} bài
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: BORDER, mb: 1.5 }} />
        {/* 4. Giảng viên */}
        <Typography sx={{ fontSize: 12, color: MUTED }}>
          {course.instructor}
        </Typography>
      </Box>
    </Box>
  );
}

/* ─── Section 5: Benefits ────────────────────────────────── */

/**
 * Khối giới thiệu 4 lợi ích lớn nhất và điểm mạnh khi tham gia học trên S.T.A.R Learning Path.
 */
function BenefitsSection() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        mb: { xs: 7, md: 9 },
        p: { xs: 3, md: 5 },
        borderRadius: "24px",
        border: `1px solid ${BORDER}`,
        background:
          "linear-gradient(135deg, rgba(8,145,178,0.04) 0%, rgba(56,189,248,0.03) 100%)",
      }}
    >
      <Box sx={{ textAlign: "center", mb: { xs: 3.5, md: 5 } }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: PRIMARY,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            mb: 1,
          }}
        >
          Điểm mạnh
        </Typography>
        <Typography
          component="h2"
          sx={{
            fontSize: { xs: 20, sm: 22, md: 26 },
            fontWeight: 700,
            color: TEXT,
            letterSpacing: "-0.02em",
          }}
        >
          Vì sao chọn S.T.A.R Learning Path?
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "repeat(4, 1fr)",
          },
          gap: 3,
        }}
      >
        {BENEFITS.map((item) => (
          <Box key={item.title}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "14px",
                bgcolor: alpha(item.color, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.75,
              }}
            >
              <item.icon sx={{ fontSize: 24, color: item.color }} />
            </Box>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 700,
                color: TEXT,
                lineHeight: 1.3,
                mb: 0.75,
              }}
            >
              {item.title}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: MUTED, lineHeight: 1.65 }}>
              {item.desc}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ─── Section 7: CTA block ───────────────────────────────── */

/**
 * Khung banner kêu gọi hành động cuối trang kích thích học viên bắt đầu học tập.
 */
function CtaBlock({ onExplore, onMyCourses }) {
  return (
    <Box
      sx={{
        p: { xs: 3.5, md: 6 },
        borderRadius: "24px",
        border: `1px solid ${BORDER}`,
        background:
          "linear-gradient(135deg, rgba(8,145,178,0.08) 0%, rgba(56,189,248,0.06) 100%)",
        textAlign: "center",
        mb: { xs: 2, md: 4 },
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontSize: { xs: 22, sm: 26, md: 30 },
          fontWeight: 800,
          color: TEXT,
          letterSpacing: "-0.025em",
          lineHeight: 1.2,
          mb: 1.25,
        }}
      >
        Sẵn sàng bắt đầu lộ trình học của bạn?
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 14, md: 15 },
          color: MUTED,
          lineHeight: 1.65,
          mb: 3.5,
          maxWidth: 520,
          mx: "auto",
        }}
      >
        Khám phá khóa học phù hợp và theo dõi tiến độ học tập ngay hôm nay.
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <AppButton onClick={onExplore} sx={{ px: 3.5, py: 1.25, fontSize: 14 }}>
          Khám phá khóa học
        </AppButton>
        <AppButton
          variant="outlined"
          onClick={onMyCourses}
          sx={{ px: 3.5, py: 1.25, fontSize: 14 }}
        >
          Khóa học của tôi
        </AppButton>
      </Box>
    </Box>
  );
}

/* ─── Main page ──────────────────────────────────────────── */

/**
 * Component Trang chủ chính (HomePage) dành cho Học viên.
 * Quản lý logic gọi các API Backend (khóa học dở, streak, mục tiêu học tập, danh sách đề xuất) và sắp xếp các phần giao diện.
 */
export default function HomePage() {
  const navigate = useNavigate();

  const user = useMemo(() => getUser(), []);
  console.log("user =", user);
  console.log("sessionStorage user =", sessionStorage.getItem("user"));
  const displayName = user.fullName || "Học viên";

  // TODO: replace with real API call

  const [continueCourseData, setContinueCourseData] = useState(null);
  const [streak, setStreak] = useState(0);
  const [learningGoal, setLearningGoal] = useState("");
  const [learningGoalLoading, setLearningGoalLoading] = useState(false);
  const [userCategories, setUserCategories] = useState([]);
  const [userLevel, setUserLevel] = useState("");

  /**
   * Effect 1: Tự động gọi API Backend lấy thông tin khóa học đang học dở gần đây nhất của học viên.
   */
  useEffect(() => {
    console.log("Check useEffect trigger - userId hiện tại là:", user?.userId);

    if (!user?.userId) {
      console.log("Chưa có userId, đứng đợi...");
      return;
    }
    // if (!user.userId) return;
    const getData = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/courses/continue/${user.userId}`,
        );
        const result = await res.json();
        console.log("Kết quả API trả về thực tế:", result);

        // Trường hợp A: Học viên CÓ khóa học đang học dở dang (< 100%)
        if (result.success && result.data && result.data.length > 0) {

          const row = result.data[0];
          setContinueCourseData({
            courseId: row.CourseId,
            courseName: row.CourseName,
            category: row.CategoryName ?? "",
            level: row.LevelName ?? "",
            progressPercentage: row.ProgressPercentage ?? 0,
            thumbnail: (row.thumbnail || row.Thumbnail) === 'CHƯA FIX LỖI ẢNH' ? null : (row.thumbnail || row.Thumbnail || null),

          });

        }// Trường hợp B: Học viên KHÔNG CÓ khóa học học dở dang
        else {
          // Nếu học viên đã hoàn thành 100% tất cả các khóa đã đăng ký 
          if (result.success && (result.hasCompletedBefore === true || result.isCompletedAll === true)) {
            setContinueCourseData({ isCompletedAll: true });
          }
          // chưa từng đăng ký/học khóa học nào
          else {
            setContinueCourseData(null);
          }
        }
      } catch (error) {
        console.error("getContinueCourse error:", error);
      }
    };
    getData();
  }, [user.userId]);

  /**
   * Effect 2: Tự động gọi API Backend lấy số ngày học liên tục (Streak) của học viên.
   */
  useEffect(() => {
    if (!user?.userId) return;
    fetch("http://localhost:5000/api/courses/streak", {
      headers: { "x-user-id": String(user.userId) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStreak(data.streak || 0);
      })
      .catch(() => { });
  }, [user?.userId]);

  /**
   * Effect 3: Tự động gọi API Backend lấy mục tiêu học tập (Learning Goal) từ profile của học viên.
   */
  useEffect(() => {
    if (!user?.userId) {
      setLearningGoal("");
      setUserCategories([]);
      setUserLevel("");
      return;
    }

    let cancelled = false;
    setLearningGoalLoading(true);

    fetch("http://localhost:5000/api/users/profile", {
      headers: { "x-user-id": String(user.userId) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.profile) {
          setLearningGoal(String(data.profile.learningGoal ?? "").trim());
          setUserCategories(data.profile.categories || []);
          setUserLevel(data.profile.currentLevel || "");
        } else {
          setLearningGoal("");
          setUserCategories([]);
          setUserLevel("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLearningGoal("");
          setUserCategories([]);
          setUserLevel("");
        }
      })
      .finally(() => {
        if (!cancelled) setLearningGoalLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  // ============================================================
  // CÁC HÀM XỬ LÝ ĐIỀU HƯỚNG CHUYỂN TRANG (NAVIGATION HANDLERS)
  // ============================================================

  /** Chuyển sang trang danh mục tất cả khóa học */
  const handleExplore = () => navigate("/courses");

  /** Chuyển sang trang danh sách tin tức */
  const handleViewNews = () => navigate("/news");

  /** Chuyển sang trang danh sách khóa học cá nhân của học viên */
  const handleMyCourses = () => navigate("/my-courses");

  /** Chuyển thẳng học viên vào bài học đang dang dở để học tiếp */
  const handleContinue = (course) =>
    navigate(`/my-courses/${course.courseId}/learn`);

  /** Chuyển sang trang chi tiết của một khóa học cụ thể */
  const handleCourseNav = (courseId) => navigate(`/courses/${courseId}`);

  /** Chuyển sang trang đăng nhập */
  const handleLogin = () => navigate("/login");

  /** State lưu trữ danh sách khóa học đề xuất tải về từ Backend */
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [forYouCourses, setForYouCourses] = useState([]);
  const [forYouLoading, setForYouLoading] = useState(Boolean(user?.userId));

  /**
   * Effect 4: Tự động gọi API Backend lấy danh sách các khóa học đề xuất nổi bật (Featured Courses).
   */
  useEffect(() => {
    const getData = async () => {
      const res = await fetch("http://localhost:5000/api/courses/featured");
      const result = await res.json();

      if (!result.success) {
        console.error(result.message);
        return;
      }

      setFeaturedCourses(result.data.map(normalizeHomeCourse));
    };
    getData();
  }, []);

  /**
   * Effect 5: Lấy khóa học gợi ý cá nhân theo lĩnh vực quan tâm của người dùng.
   */
  useEffect(() => {
    if (!user?.userId) {
      setForYouCourses([]);
      setForYouLoading(false);
      return;
    }

    if (userCategories.length === 0) {
      setForYouCourses([]);
      setForYouLoading(false);
      return;
    }

    let cancelled = false;
    setForYouLoading(true);

    (async () => {
      try {
        const params = new URLSearchParams();
        userCategories.forEach((c) => params.append("category", String(c.categoryId)));
        // chỉ hiện chưa đăng kí 
        params.append("status", "not_enrolled");

        const coursesRes = await fetch(
          `http://localhost:5000/api/courses/student?${params.toString()}`,
          { headers: { "x-user-id": String(user.userId) } },
        );
        const coursesData = await coursesRes.json();

        if (!cancelled && coursesData.success) {
          const sortedCourses = (coursesData.data || []).sort((a, b) => {
            const aLevel = a.LevelDisplayName || a.LevelName || a.level || "";
            const bLevel = b.LevelDisplayName || b.LevelName || b.level || "";
            
            // 1. Trùng Level của User đẩy lên đầu (1 = trùng, 0 = không trùng)
            const aMatch = (aLevel === userLevel) ? 1 : 0;
            const bMatch = (bLevel === userLevel) ? 1 : 0;
            if (aMatch !== bMatch) return bMatch - aMatch;
            
            // 2. Nếu bằng mức ưu tiên Level, xếp theo Rating giảm dần (từ cao xuống thấp)
            const aRating = a.Rating ?? 0;
            const bRating = b.Rating ?? 0;
            if (aRating !== bRating) return bRating - aRating;
            
            // 3. Nếu Rating bằng nhau, xếp theo tên A-Z (Alphabetical)
            const aName = a.CourseName || "";
            const bName = b.CourseName || "";
            return aName.localeCompare(bName);
          });

          setForYouCourses(
            sortedCourses.slice(0, 4).map(normalizeHomeCourse),
          );
        }
      } catch (error) {
        console.error("Error fetching for-you courses:", error);
        if (!cancelled) setForYouCourses([]);
      } finally {
        if (!cancelled) setForYouLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.userId, userCategories, userLevel]);

  return (
    /* Wide root — hero can breathe at full width */
    <Box
      sx={{
        width: "100%",
        maxWidth: 1600,
        mx: "auto",
        px: { xs: 0, sm: 0, md: 0, lg: 0 },
        overflow: "visible",
        position: "relative",
        mt: { xs: -2, sm: -3, md: -4 },
      }}
    >
      <Box sx={{ position: "relative", overflow: "visible" }}>
        <HeroSection onExplore={handleExplore} onViewNews={handleViewNews} />

        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: { xs: 28, sm: 0, md: -20, lg: -40 },
            zIndex: 10,
            width: {
              xs: "min(100%, 360px)",
              sm: 480,
              md: 560,
              lg: 640,
              xl: 680,
            },
            maxWidth: "100%",
            pointerEvents: "auto",
          }}
        >
          <LearningGoalStickyNote
            displayName={displayName}
            streak={streak}
            isLoggedIn={Boolean(user?.userId)}
            goal={learningGoal}
            loading={learningGoalLoading}
            overlay
          />
        </Box>
      </Box>

      {/* Các mục nội dung còn lại sẽ nằm gọn trong một cột hẹp hơn.*/}
      <Box sx={{ maxWidth: 1360, mx: "auto", width: "100%" }}>
        <ContinueSection
          course={continueCourseData}
          onContinue={handleContinue}
          onExplore={handleExplore}
        />

        <NewsSection />

        <CoursesSection
          featuredCourses={featuredCourses}
          forYouCourses={forYouCourses}
          forYouLoading={forYouLoading}
          isLoggedIn={Boolean(user?.userId)}
          learningGoal={learningGoal}
          userCategories={userCategories}
          onExplore={handleExplore}
          onLogin={handleLogin}
          onNavigateCourse={handleCourseNav}
        />

        <BenefitsSection />

        <CtaBlock onExplore={handleExplore} onMyCourses={handleMyCourses} />
      </Box>
    </Box>
  );
}
