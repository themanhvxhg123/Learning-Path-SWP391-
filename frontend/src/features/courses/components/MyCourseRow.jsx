/**
 * MyCourseRow  ─  Dòng hiển thị một khóa học trong "Khóa học của tôi"
 *
 * Props:
 *   course : {
 *     courseId:           number,
 *     title:              string,
 *     thumbnail:          string,
 *     category:           string,
 *     level:              string,
 *     instructor:         string,
 *     progressPercentage: number,    // 0–100
 *     enrollmentStatus:   string,    // "in_progress" | "completed"
 *     lastActivity:       string,    // "2 ngày trước"
 *     currentStage:       string,    // tên chương hiện tại
 *     currentLesson:      string,    // tên bài học hiện tại
 *     lessonCount:        number,
 *     completedLessons:   number,
 *     modules?:           array      // cấu trúc chương nếu có
 *   }
 *   isSaved   : boolean
 *   onSave    : (courseId) => void
 *   onContinue: (courseId) => void   — navigate đến /my-courses/:courseId/learn
 *   onClick   : (courseId) => void   — navigate đến /courses/:courseId (detail)
 */
import { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppButton from "@/shared/ui/AppButton";
import ThumbnailImage from "@/shared/ui/ThumbnailImage";
import AppProgressBar, { getProgressColor } from "@/shared/ui/AppProgressBar";
import MyCourseProgressSummary from "./MyCourseProgressSummary";
import { buildCourseDetailPath } from "@/features/courses/utils/courseListParams";
import { resolveCategoryChipSx, resolveLevelChipSx } from "@/shared/catalog/catalogRegistry";

const MUTED = "#64748B";
const TEXT = "#0F172A";
const PRIMARY = "#0891B2";
const SAVED = "#F59E0B";

const ghostIconSx = {
  transition: "all 0.2s ease",
  "&:hover": { bgcolor: "rgba(15,23,42,0.04)" },
};

function normalizeCourse(course = {}) {
  const progress = course.progressPercentage ?? course.progress ?? 0;
  return {
    courseId: course.courseId ?? course.id,
    courseName: course.courseName ?? course.title ?? "Khóa học",
    thumbnail: course.Thumbnail ?? course.thumbnail ?? null,
    category: course.category ?? "",
    level: course.level ?? "",
    instructor: course.instructor ?? "",
    totalLessons: course.totalLessons ?? 0,
    totalNodes: course.totalNodes ?? 0,
    totalMaterials: course.totalMaterials ?? 0,
    progressPercentage: progress,
    enrollmentStatus: course.enrollmentStatus ?? "none",
    isSaved: course.isSaved ?? false,
    currentStage: course.currentStage ?? null,
    currentLesson: course.currentLesson ?? null,
    lastActivity: course.lastActivity ?? null,
    modules: course.modules ?? [],
    currentLessonDetail: course.currentLessonDetail ?? null,
    recentLessons: course.recentLessons ?? [],
  };
}

function getCompletedStatusChip() {
  return {
    label: "Hoàn thành",
    sx: {
      bgcolor: "rgba(4,120,87,0.12)",
      color: "#047857",
      border: "1px solid rgba(4,120,87,0.24)",
    },
  };
}

function getLearningStatusChip() {
  return {
    label: "Đang học",
    sx: {
      bgcolor: "rgba(8,145,178,0.12)",
      color: PRIMARY,
      border: "1px solid rgba(8,145,178,0.20)",
    },
  };
}



function getSavedStatusChip() {
  return {
    label: "Đã lưu",
    sx: {
      bgcolor: "rgba(245,158,11,0.10)",
      color: "#D97706",
      border: "1px solid rgba(245,158,11,0.22)",
    },
  };
}

function MetaItem({ icon: Icon, label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Icon sx={{ fontSize: 13, color: "#94A3B8", flexShrink: 0 }} />
      <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 500, lineHeight: 1.2 }}>
        {label}
      </Typography>
    </Box>
  );
}

function RowTopActions({ showBookmark, isSaved, onBookmarkToggle, showExpand, expanded, onExpandToggle }) {
  if (!showBookmark && !showExpand) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: { xs: 10, md: 12 },
        right: { xs: 10, md: 12 },
        display: "flex",
        alignItems: "center",
        gap: 0.25,
        zIndex: 1,
      }}
    >
      {showBookmark && (
        <Tooltip title={isSaved ? "Bỏ lưu" : "Lưu khóa học"}>
          <IconButton
            size="small"
            aria-label={isSaved ? "Bỏ lưu" : "Lưu khóa học"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBookmarkToggle?.();
            }}
            sx={{
              ...ghostIconSx,
              color: isSaved ? SAVED : MUTED,
              "&:hover": { bgcolor: "transparent", color: isSaved ? SAVED : PRIMARY },
            }}
          >
            {isSaved ? (
              <BookmarkRoundedIcon sx={{ fontSize: 20 }} />
            ) : (
              <BookmarkBorderRoundedIcon sx={{ fontSize: 20 }} />
            )}
          </IconButton>
        </Tooltip>
      )}
      {showExpand && (
        <Tooltip title={expanded ? "Thu gọn" : "Xem tiến độ khóa học"}>
          <IconButton
            size="small"
            aria-label={expanded ? "Thu gọn" : "Xem tiến độ khóa học"}
            onClick={() => onExpandToggle?.()}
            sx={ghostIconSx}
          >
            {expanded ? (
              <ExpandLessRoundedIcon sx={{ fontSize: 20 }} />
            ) : (
              <ExpandMoreRoundedIcon sx={{ fontSize: 20 }} />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

export default function MyCourseRow({
  course,
  variant = "learning",
  onAction,
  onUnsave,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const data = normalizeCourse(course);
  const isSavedRow = variant === "saved";
  const isCompleted = variant === "completed";
  const isLearning = variant === "learning";
  const canExpand = !isSavedRow && (data.modules.length > 0 || data.currentLessonDetail);
  const progressValue = Math.min(Math.max(data.progressPercentage, 0), 100);
  const detailPath = buildCourseDetailPath(data.courseId, searchParams, "/my-courses");
  const learningPath = `/my-courses/${data.courseId}/learn`;
  const titlePath = detailPath;
  const progressTextColor = getProgressColor(progressValue);

  const statusChip = isSavedRow
    ? getSavedStatusChip()
    : isCompleted
      ? getCompletedStatusChip()
      : getLearningStatusChip();

  const actionLabel = isSavedRow ? "Xem chi tiết" : isCompleted ? "Ôn tập lại" : "Tiếp tục học";

  const handleAction = () => {
    if (isSavedRow) {
      navigate(detailPath);
    } else {
      navigate(learningPath);
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        bgcolor: "#FFFFFF",
        borderRadius: "18px",
        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
        boxShadow: theme.ios18?.shadow?.sm,
        overflow: "hidden",
        transition: [
          `box-shadow 0.25s ${theme.ios18?.transition}`,
          `border-color 0.25s ${theme.ios18?.transition}`,
        ].join(", "),
        "&:hover": {
          boxShadow: theme.ios18?.shadow?.md,
          borderColor: alpha(theme.palette.primary.main, 0.18),
        },
      }}
    >
      <RowTopActions
        showBookmark={isSavedRow && Boolean(onUnsave)}
        isSaved={isSavedRow}
        onBookmarkToggle={onUnsave}
        showExpand={canExpand}
        expanded={expanded}
        onExpandToggle={() => setExpanded((prev) => !prev)}
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "center" },
          gap: { xs: 2, md: 2.5 },
          p: { xs: 2, md: 2.25 },
          pt: { xs: 4.5, md: 2.25 },
          pr: { xs: 2, md: canExpand || isSavedRow ? 7 : 2.25 },
        }}
      >
        <ThumbnailImage
          src={data.thumbnail}
          label={data.courseName}
          alt={data.courseName}
          iconSize={20}
          sx={{
            width: { xs: "100%", md: 160 },
            flexShrink: 0,
            aspectRatio: "16 / 9",
            borderRadius: "12px",
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography
            component={Link}
            to={titlePath}
            sx={{
              fontWeight: 700,
              fontSize: { xs: 16, md: 17 },
              lineHeight: 1.35,
              color: TEXT,
              textDecoration: "none",
              pr: { xs: 5, md: 0 },
              transition: `color 0.18s ${theme.ios18?.transition}`,
              "&:hover": { color: "primary.main" },
            }}
          >
            {data.courseName}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            <Chip
              label={statusChip.label}
              size="small"
              sx={{ height: 22, fontSize: 11, fontWeight: 600, borderRadius: "99px", ...statusChip.sx }}
            />
            {data.level && (
              <Chip
                label={data.level}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: "99px",
                  ...resolveLevelChipSx({ displayName: data.level }),
                }}
              />
            )}
            {data.category && (
              <Chip
                label={data.category}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: "99px",
                  ...resolveCategoryChipSx({ displayName: data.category }, { withBorder: false }),
                }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <MetaItem icon={MenuBookOutlinedIcon} label={`${data.totalLessons} bài`} />
            <MetaItem icon={RouteOutlinedIcon} label={`${data.totalNodes} chương`} />
            <MetaItem icon={ArticleOutlinedIcon} label={`${data.totalMaterials} học liệu`} />
            {data.instructor && (
              <MetaItem icon={PersonOutlineOutlinedIcon} label={data.instructor} />
            )}
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {isSavedRow && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <BookmarkRoundedIcon sx={{ fontSize: 13, color: SAVED }} />
                <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>
                  Đã lưu để học sau
                </Typography>
              </Box>
            )}
            {isLearning && data.currentStage != null && data.currentLesson != null && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PlaceOutlinedIcon sx={{ fontSize: 13, color: "#94A3B8" }} />
                <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>
                  Đang ở: Chương {data.currentStage} · Bài {data.currentLesson}
                </Typography>
              </Box>
            )}
            {!isSavedRow && data.lastActivity && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <AccessTimeOutlinedIcon sx={{ fontSize: 13, color: "#94A3B8" }} />
                <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>
                  Học gần nhất: {data.lastActivity}
                </Typography>
              </Box>
            )}
          </Box>

          {!isSavedRow && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.25 }}>
              <AppProgressBar value={progressValue} height={6} sx={{ flex: 1 }} />
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: progressTextColor,
                  minWidth: 36,
                  textAlign: "right",
                }}
              >
                {progressValue}%
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            flexShrink: 0,
            width: { xs: "100%", md: "auto" },
            alignSelf: { xs: "stretch", md: "center" },
          }}
        >
          <AppButton
            fullWidth={isMobile}
            size="small"
            variant={isSavedRow ? "outlined" : "contained"}
            onClick={handleAction}
            sx={{ minWidth: { md: 140 }, whiteSpace: "nowrap" }}
          >
            {actionLabel}
          </AppButton>
        </Box>
      </Box>

      {canExpand && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box
            sx={{
              px: { xs: 2, md: 2.25 },
              pb: { xs: 2, md: 2.25 },
              pt: 2,
              borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
            }}
          >
            <MyCourseProgressSummary course={course} />
          </Box>
        </Collapse>
      )}
    </Box>
  );
}
