import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";

export default function StreakBadge({ userId, alwaysActive = false, variant = "pill", displayName = "" }) {
  const [streak, setStreak] = useState(0);
  const [hasStudiedToday, setHasStudiedToday] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';
    
    const fetchStreak = () => {
      fetch(`${API_BASE}/courses/streak`, {
        headers: { "x-user-id": String(userId) },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStreak(data.streak || 0);
            setHasStudiedToday(data.hasStudiedToday || false);
          }
        })
        .catch(() => {});
    };

    fetchStreak();

    const handleStreakUpdate = (e) => {
      if (e && e.detail && e.detail.hasStudiedToday) {
        setHasStudiedToday(true);
      }
      fetchStreak();
    };

    window.addEventListener("streakUpdate", handleStreakUpdate);
    return () => {
      window.removeEventListener("streakUpdate", handleStreakUpdate);
    };
  }, [userId]);

  if (variant === "yellowBox") {
    return (
      <Box
        sx={{
          bgcolor: "#FFF8C9",
          borderRadius: 2,
          p: { xs: 2, md: 3 },
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: { xs: 2.5, md: 3 },
          border: "1px solid #FDE047",
        }}
      >
        <Typography sx={{ fontSize: 16, color: "#334155", fontWeight: 500 }}>
          Xin chào,{" "}
          <Box component="span" sx={{ color: "#0891B2", fontWeight: 700 }}>
            {displayName}
          </Box>{" "}
          bạn đã giữ vững{" "}
          <Box component="span" sx={{ color: "#EA580C", fontWeight: 700 }}>
            Chuỗi
          </Box>{" "}
          <Box
            component="span"
            sx={{
              bgcolor: "rgba(100,116,139,0.15)",
              color: "#64748B",
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontWeight: 700,
              mx: 0.5,
            }}
          >
            {streak}
          </Box>{" "}
          ngày học!
        </Typography>

        <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
          <Box sx={{ width: "1px", height: 40, bgcolor: "rgba(234,88,12,0.2)", display: { xs: "none", md: "block" } }} />
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#EA580C", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              🚀 Mục tiêu học tập
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#64748B", mb: 0.5 }}>
              Chưa có mục tiêu.
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#D97706", display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>
              🖊 Cập nhật Profile
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // Logic màu dành cho header (dành cho Header)
  const isGray = !hasStudiedToday && !alwaysActive;
  
  const bgColor = isGray ? "rgba(100,116,139,0.10)" : "rgba(234,88,12,0.10)";
  const borderColor = isGray ? "rgba(100,116,139,0.20)" : "rgba(234,88,12,0.20)";
  const textColor = isGray ? "#64748B" : "#EA580C";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.25,
        py: 0.5,
        borderRadius: "99px",
        bgcolor: bgColor,
        border: `1px solid ${borderColor}`,
        transition: "all 0.3s ease",
      }}
    >
      <LocalFireDepartmentRoundedIcon sx={{ fontSize: 18, color: textColor }} />
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: textColor }}>
        {streak} ngày
      </Typography>
    </Box>
  );
}
