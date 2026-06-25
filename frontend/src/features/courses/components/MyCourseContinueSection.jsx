import { Box, Typography, alpha, useTheme } from "@mui/material";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import AppButton from "@/shared/ui/AppButton";
import ThumbnailImage from "@/shared/ui/ThumbnailImage";
import AppProgressBar, { getProgressColor } from "@/shared/ui/AppProgressBar";

const MUTED = "#64748B";
const TEXT = "#0F172A";
const PRIMARY = "#0891B2";

export default function MyCourseContinueSection({ course, onContinue }) {
  const theme = useTheme();
  if (!course) return null;

  const progress = Math.min(Math.max(course.progressPercentage ?? 0, 0), 100);
  const progressTextColor = getProgressColor(progress);
  const currentLesson = course.currentLessonDetail;

  return (
    <Box
      sx={{
        position: "relative",
        mb: 3,
        p: { xs: 2.5, md: 3.5 },
        pl: { xs: 2.5, md: 3.5 },
        borderRadius: "20px",
        overflow: "hidden",
        bgcolor: "rgba(8,145,178,0.04)",
        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
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
          alignItems: { md: "stretch" },
          gap: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25 }}>
            <PlayCircleOutlineOutlinedIcon sx={{ fontSize: 16, color: PRIMARY }} />
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
              fontWeight: 800,
              fontSize: { xs: 20, sm: 24, md: 26 },
              color: TEXT,
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              mb: 1.5,
              maxWidth: 720,
            }}
          >
            {course.courseName}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: currentLesson ? 1.25 : 2 }}>
            {course.currentStage != null && course.currentLesson != null && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PlaceOutlinedIcon sx={{ fontSize: 15, color: "#94A3B8" }} />
                <Typography sx={{ fontSize: 14, color: MUTED, fontWeight: 500 }}>
                  Đang ở: Chương {course.currentStage} · Bài {course.currentLesson}
                </Typography>
              </Box>
            )}
            {course.lastActivity && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <AccessTimeOutlinedIcon sx={{ fontSize: 15, color: "#94A3B8" }} />
                <Typography sx={{ fontSize: 14, color: MUTED, fontWeight: 500 }}>
                  Học gần nhất: {course.lastActivity}
                </Typography>
              </Box>
            )}
          </Box>

          {currentLesson && (
            <Typography sx={{ fontSize: 14, color: TEXT, fontWeight: 500, mb: 2 }}>
              Bài hiện tại:{" "}
              <Typography component="span" sx={{ color: PRIMARY, fontWeight: 600 }}>
                {currentLesson.lesson} · {currentLesson.title}
              </Typography>
            </Typography>
          )}

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { sm: "center" },
              gap: 2,
              maxWidth: 560,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
              <AppProgressBar value={progress} height={8} sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: progressTextColor, minWidth: 42 }}>
                {progress}%
              </Typography>
            </Box>
            <AppButton
              size="small"
              variant="contained"
              onClick={() => onContinue?.(course)}
              sx={{ minWidth: { sm: 160 }, flexShrink: 0, py: 1 }}
            >
              Tiếp tục học
            </AppButton>
          </Box>
        </Box>

        <ThumbnailImage
          src={course.thumbnail}
          label={course.courseName ?? course.title}
          alt={course.courseName ?? course.title}
          iconSize={32}
          sx={{
            display: { xs: "none", md: "block" },
            width: 200,
            flexShrink: 0,
            alignSelf: "stretch",
            minHeight: 120,
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(8,145,178,0.12)",
          }}
        />
      </Box>
    </Box>
  );
}
