import { Box, Typography, alpha } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { getStreakColor } from "@/shared/utils/streakUtils";

const PRIMARY = "#0891B2";
const INK = "#1E293B";
const MUTED = "#64748B";
const PAPER = "#FFF59D";
const PAPER_DARK = "#F9E547";
const TAPE = "rgba(255, 255, 255, 0.52)";

export default function LearningGoalStickyNote({
  displayName = "Học viên",
  streak = 0,
  isLoggedIn = false,
  goal = "",
  loading = false,
  overlay = false,
}) {
  const trimmedGoal = String(goal ?? "").trim();
  const hasGoal = trimmedGoal.length > 0;
  const compact = overlay;

  return (
    <Box
      sx={{
        width: "100%",
        transform: compact ? "rotate(1.25deg)" : "none",
        transformOrigin: "top left",
        filter: compact
          ? `drop-shadow(2px 6px 4px ${alpha("#78350F", 0.18)}) drop-shadow(0 14px 20px ${alpha("#78350F", 0.12)})`
          : "none",
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: compact ? 2 : { xs: 0, md: 2.5 },
          px: compact ? 2.5 : { xs: 2, sm: 2.5 },
          py: compact ? 1.75 : { xs: 2, sm: 2.25 },
          pt: compact ? 2.5 : { xs: 2.5, sm: 2.75 },
          bgcolor: PAPER,
          backgroundImage: `
            linear-gradient(165deg, rgba(255,255,255,0.55) 0%, transparent 42%),
            linear-gradient(180deg, ${alpha(PAPER_DARK, 0.35)} 0%, ${PAPER} 18%, ${PAPER} 100%),
            repeating-linear-gradient(
              180deg,
              transparent,
              transparent 21px,
              ${alpha("#A16207", 0.11)} 21px,
              ${alpha("#A16207", 0.11)} 22px
            )
          `,
          borderRadius: "1px 2px 2px 2px",
          border: `1px solid ${alpha("#CA8A04", 0.28)}`,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.75),
            inset -2px -2px 6px ${alpha("#CA8A04", 0.08)}
          `,
          "&::before": {
            content: '""',
            position: "absolute",
            top: -7,
            left: "50%",
            transform: "translateX(-50%) rotate(-1deg)",
            width: compact ? 64 : 72,
            height: compact ? 16 : 18,
            borderRadius: "2px",
            bgcolor: TAPE,
            border: `1px solid ${alpha("#FFFFFF", 0.65)}`,
            boxShadow: `
              0 1px 2px ${alpha("#000", 0.08)},
              inset 0 1px 0 rgba(255,255,255,0.8)
            `,
            backdropFilter: "blur(1px)",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: 0,
            left: 15,
            width: 0,
            height: 0,
            borderStyle: "solid",
            borderWidth: compact ? "22px 22px 0 0" : "28px 28px 0 0",
            borderColor: `${alpha("#FDE047", 0.95)} transparent transparent transparent`,
            filter: `drop-shadow(1px 1px 1px ${alpha("#92400E", 0.12)})`,
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: compact ? 14 : 18,
            width: "1px",
            bgcolor: alpha("#DC2626", 0.22),
            pointerEvents: "none",
          }}
        />

        <Box sx={{ flex: "0 0 auto", pl: compact ? 1 : 1.25, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: compact ? 13.5 : { xs: 14, md: 15 },
              color: INK,
              fontWeight: 600,
              lineHeight: compact ? 1.5 : 1.65,
              whiteSpace: "nowrap",
            }}
          >
            Xin chào,{" "}
            <Box component="span" sx={{ color: PRIMARY, fontWeight: 700 }}>
              {displayName}
            </Box>
            {isLoggedIn ? (
              <>
                {" "}
                — bạn đã giữ vững{" "}
                <Box component="span" sx={{ color: "#EA580C", fontWeight: 700 }}>
                  Chuỗi
                </Box>{" "}
                <Box component="span" sx={{ fontWeight: 700, color: getStreakColor(streak) }}>
                  {streak}
                </Box>{" "}
                ngày học!
              </>
            ) : (
              "!"
            )}
          </Typography>
        </Box>

        {isLoggedIn && (
          <>
            <Box
              sx={{
                alignSelf: "stretch",
                width: "1px",
                mx: 0.25,
                background: `repeating-linear-gradient(
                  180deg,
                  ${alpha("#92400E", 0.35)} 0 4px,
                  transparent 4px 8px
                )`,
                opacity: 0.55,
              }}
            />

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: compact ? 11.5 : 12,
                  fontWeight: 700,
                  color: alpha("#92400E", 0.85),
                  mb: compact ? 0.25 : 0.75,
                  textDecoration: "underline",
                  textDecorationStyle: "wavy",
                  textUnderlineOffset: 3,
                }}
              >
                Mục tiêu học tập
              </Typography>

              {loading ? (
                <Typography
                  sx={{
                    fontSize: compact ? 12.5 : 14,
                    color: MUTED,
                    fontStyle: "italic",
                  }}
                >
                  Đang tải...
                </Typography>
              ) : hasGoal ? (
                <Typography
                  sx={{
                    fontSize: compact ? 12.5 : { xs: 14, sm: 15 },
                    color: INK,
                    fontWeight: 600,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: compact ? 1 : "unset",
                    WebkitBoxOrient: "vertical",
                    overflow: compact ? "hidden" : "visible",
                    wordBreak: "break-word",
                  }}
                >
                  {trimmedGoal}
                </Typography>
              ) : (
                <Box>
                  <Typography
                    sx={{
                      fontSize: compact ? 11.5 : 14,
                      color: MUTED,
                      lineHeight: 1.45,
                      mb: compact ? 0.35 : 0.75,
                    }}
                  >
                    Chưa có mục tiêu...
                  </Typography>
                  <Box
                    component={RouterLink}
                    to="/profile"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.35,
                      fontSize: compact ? 11.5 : 13,
                      fontWeight: 700,
                      color: "#B45309",
                      textDecoration: "none",
                      borderBottom: `1px dashed ${alpha("#B45309", 0.55)}`,
                      "&:hover": { opacity: 0.85 },
                    }}
                  >
                    <EditOutlinedIcon sx={{ fontSize: compact ? 12 : 14 }} />
                    Cập nhật Profile
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
