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
// Thêm import
import { getTopCoursesApi } from "@/features/auth/services/authService";
import { fetchFeaturedNewsArticles } from "@/features/news/services/newsService";
import { formatNewsDate } from "@/features/admin/utils/adminNewsUtils";

/* ─── constants ─────────────────────────────────────────── */

const PRIMARY = "#0891B2";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const BORDER = "rgba(8,145,178,0.08)";

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
        /* Raw image — no overlay wash on mobile, just a very light left-side assist */
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
        /* Desktop: image shows at full fidelity, tiny left assist only */
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
         * Soft-edge feather: fades the four outer edges into page white
         * so the image blends seamlessly without a hard frame.
         * Gradient layers stack: bottom fade → left/right side fades → top fade.
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

function ContinueSection({ course, onContinue, onExplore }) {
  const theme = useTheme();

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
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 1.5 }}>
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
            )}
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
    </Box>
  );
}

/* ─── Section 3: Tin tức (lộ trình + bài viết) ───────────── */

function NewsSection() {
  const navigate = useNavigate();
  const [paths, setPaths] = useState([]);
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const fetchFeaturedPaths = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/courses/featured-paths",
        );
        const data = await res.json();
        setPaths(
          data.data.map((p) => ({
            id: `path-${p.PathId}`,
            type: "path",
            title: p.PathName,
            excerpt: p.Description ?? "",
            category: "Lộ trình",
            date: null,
            thumbnail: p.thumbnail || p.Thumbnail || null,
            accent: "#0891B2",
            nodeCount: p.TotalNodes ?? 0,
          })),
        );
      } catch (error) {
        console.error("Error fetching featured paths:", error);
      }
    };

    fetchFeaturedPaths();
  }, []);

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
    () => [
      ...paths,
      ...articles.map((article) => ({
        id: `article-${article.id}`,
        articleId: article.id,
        type: "article",
        title: article.title,
        excerpt: article.excerpt,
        category: article.category,
        date: formatNewsDate(article.publishedAt || article.updatedAt),
        thumbnail: article.thumbnail,
      })),
    ],
    [paths, articles],
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
        {items.map((item) => {
          const isArticle = item.type === "article";
          const CardRoot = isArticle ? Link : Box;
          const cardRootProps = isArticle
            ? { to: `/news/${item.articleId}` }
            : {};

          return (
          <CardRoot
            key={item.id}
            {...cardRootProps}
            sx={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              borderRadius: "18px",
              border: `1px solid ${BORDER}`,
              bgcolor: "#fff",
              overflow: "hidden",
              cursor: isArticle ? "pointer" : "default",
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
              icon={item.type === "path" ? RouteOutlinedIcon : MenuBookOutlinedIcon}
              iconSize={36}
              sx={{ height: 180, width: "100%" }}
              imgSx={{
                transition: "transform 0.4s ease",
                ".MuiBox-root:hover &": { transform: "scale(1.04)" },
              }}
            />
              {item.type === "path" && item.thumbnail && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(135deg, ${alpha(item.accent ?? PRIMARY, 0.35)} 0%, transparent 60%)`,
                  }}
                />
              )}
            </Box>

            <Box sx={{ p: 2.25 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25, flexWrap: "wrap" }}
              >
                <CategoryChip category={item.category} />
                {item.type === "article" && item.date && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CalendarTodayOutlinedIcon sx={{ fontSize: 11, color: MUTED }} />
                    <Typography sx={{ fontSize: 11, color: MUTED }}>{item.date}</Typography>
                  </Box>
                )}
                {item.type === "path" && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <RouteOutlinedIcon sx={{ fontSize: 12, color: item.accent ?? PRIMARY }} />
                    <Typography sx={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>
                      {item.nodeCount} chương
                    </Typography>
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

              {item.type === "article" ? (
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
              ) : (
                <Box
                  component="span"
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: MUTED,
                    opacity: 0.65,
                  }}
                >
                  Sắp ra mắt
                </Box>
              )}
            </Box>
          </CardRoot>
          );
        })}
      </Box>
    </Box>
  );
}

/* ─── Section 4: Suggested courses ──────────────────────── */

function CoursesSection({ courses = [], onExplore, onNavigateCourse }) {
  const theme = useTheme();

  return (
    <Box sx={{ mb: { xs: 7, md: 9 } }}>
      <SectionHeader
        label="Khóa học đề xuất"
        title="Được nhiều học viên chọn"
        action="Xem tất cả"
        onAction={onExplore}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            xl: "repeat(4, 1fr)",
          },
          gap: 2.5,
        }}
      >
        {courses.map((course) => (
          <CourseHomeCard
            key={course.courseId}
            course={course}
            onClick={() => onNavigateCourse(course.courseId)}
          />
        ))}
      </Box>
    </Box>
  );
}

function CourseHomeCard({ course, onClick }) {
  const theme = useTheme();
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
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <StarRoundedIcon sx={{ fontSize: 13, color: "#F59E0B" }} />
            <Typography sx={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>
              {course.rating}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <PeopleOutlineRoundedIcon sx={{ fontSize: 13, color: MUTED }} />
            <Typography sx={{ fontSize: 12, color: MUTED }}>
              {course.studentCount >= 1000
                ? `${(course.studentCount / 1000).toFixed(1)}k`
                : course.studentCount}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <MenuBookOutlinedIcon sx={{ fontSize: 13, color: MUTED }} />
            <Typography sx={{ fontSize: 12, color: MUTED }}>
              {course.totalLessons} bài
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: BORDER, mb: 1.5 }} />
        <Typography sx={{ fontSize: 12, color: MUTED }}>
          {course.instructor}
        </Typography>
      </Box>
    </Box>
  );
}

/* ─── Section 5: Benefits ────────────────────────────────── */

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
        if (result.success && result.data && result.data.length > 0) {
       
          const row = result.data[0];
          setContinueCourseData({
            courseId: row.CourseId, 
            courseName: row.CourseName,
            category: row.CategoryName ?? "",
            level: row.LevelName ?? "",
            progressPercentage: row.ProgressPercentage ?? 0,
            thumbnail: (row.thumbnail || row.Thumbnail) === 'CHƯA FIX LỖI ẢNH' ? null : (row.thumbnail || row.Thumbnail || null),
            currentStage: null,
            currentLesson: null,
            lastActivity: null,
            currentLessonDetail: null,
          });
        } else {
          setContinueCourseData(null);
        }
      } catch (error) {
        console.error("getContinueCourse error:", error);
      }
    };
    getData();
  }, [user.userId]);

  useEffect(() => {
    if (!user?.userId) return;
    fetch("http://localhost:5000/api/courses/streak", {
      headers: { "x-user-id": String(user.userId) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStreak(data.streak || 0);
      })
      .catch(() => {});
  }, [user?.userId]);

  useEffect(() => {
    if (!user?.userId) {
      setLearningGoal("");
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
        } else {
          setLearningGoal("");
        }
      })
      .catch(() => {
        if (!cancelled) setLearningGoal("");
      })
      .finally(() => {
        if (!cancelled) setLearningGoalLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const handleExplore = () => navigate("/courses");
  const handleViewNews = () => navigate("/news");
  const handleMyCourses = () => navigate("/my-courses");
  const handleContinue = (course) =>
    navigate(`/my-courses/${course.courseId}/learn`);
  const handleCourseNav = (courseId) => navigate(`/courses/${courseId}`);

  const [courses, setCourses] = useState([]);
  useEffect(() => {
    const getData = async () => {
      const res = await fetch("http://localhost:5000/api/courses/featured");
      const result = await res.json();

      if (!result.success) {
        console.error(result.message);
        return;
      }

      setCourses(
        result.data.map((c) => ({
          courseId: c.CourseId,
          courseName: c.CourseName,
          category: c.CategoryName ?? "Giao tiếp",
          level: c.LevelName ?? "Cơ bản",
          instructor: c.InstructorName ?? "",
          rating: c.Rating ?? 4.5,
          studentCount: c.TotalStudents ?? 0,
          totalLessons: c.TotalLessons ?? 0,
          thumbnail: (c.thumbnail || c.Thumbnail) === 'CHƯA FIX LỖI ẢNH' ? null : (c.thumbnail || c.Thumbnail || null),
        })),
      );
    };
    getData();
  }, []);

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

      {/* Remaining sections sit in a tighter content column */}
      <Box sx={{ maxWidth: 1360, mx: "auto", width: "100%" }}>
        <ContinueSection
          course={continueCourseData}
          onContinue={handleContinue}
          onExplore={handleExplore}
        />

        <NewsSection />

        <CoursesSection
          courses={courses}
          onExplore={handleExplore}
          onNavigateCourse={handleCourseNav}
        />

        <BenefitsSection />

        <CtaBlock onExplore={handleExplore} onMyCourses={handleMyCourses} />
      </Box>
    </Box>
  );
}
