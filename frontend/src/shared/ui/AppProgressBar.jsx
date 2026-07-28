import { Box, LinearProgress, Typography } from "@mui/material";

/**
 * Segment-based HSL progress color — avoids muddy brown/gray from cross-hue RGB blend.
 * 0% gray → 1-24% red → 25-49% orange → 50-74% amber → 75-99% ocean → 100% green
 */
export function getProgressColor(progress) {
  const value = Math.max(0, Math.min(Number(progress) || 0, 100));

  if (value <= 0) return "#94A3B8";
  if (value >= 100) return "#16A34A";

  if (value < 25) {
    //đỏ
    return `hsl(4, 78%, ${58 - value * 0.25}%)`;
  }
    //cam
  if (value < 50) {
    return `hsl(24, 88%, ${56 - (value - 25) * 0.2}%)`;
  }
  //vàng
  if (value < 75) {
    return `hsl(38, 88%, ${52 - (value - 50) * 0.12}%)`;
  }
  //Xanh 
  return `hsl(190, 92%, ${36 + (value - 75) * 0.08}%)`;
}

/**
 * Shared progress bar component.
 *
 * Props:
 *   value      — 0–100
 *   height     — bar height px (default 6)
 *   showLabel  — show "X%" label to the right of the bar
 *   label      — custom left-side label (implies header row)
 *   sx         — applied to outer Box wrapper
 */
// thanh tiến độ
export default function AppProgressBar({
  value = 0,
  height = 6,
  showLabel = false,
  label,
  sx,
}) {
  const progress = Math.max(0, Math.min(value ?? 0, 100));
  const color = getProgressColor(progress);

  return (
    <Box sx={{ width: "100%", ...sx }}>
      {(showLabel || label) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: 11.5 }}>
            {label ?? (progress >= 100 ? "Hoàn thành" : "Tiến độ")}
          </Typography>
          {showLabel && (
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11.5, color }}>
              {progress}%
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: showLabel && !label ? 1.5 : 0 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            flex: 1,
            height,
            borderRadius: 999,
            bgcolor: "rgba(100,116,139,0.12)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
              backgroundColor: color,
              transition: "background-color 0.3s ease, transform 0.3s ease",
            },
          }}
        />
        {showLabel && !label && (
          <Typography sx={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>
            {progress}%
          </Typography>
        )}
      </Box>
    </Box>
  );
}
