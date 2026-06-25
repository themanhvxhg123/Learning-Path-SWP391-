/**
 * Màu chữ chuỗi học theo mốc ngày (đồng bộ tone badge streak cũ + leo cấp theo thành tích).
 *
 * 0        — chưa có chuỗi
 * 1–6      — cam khởi đầu
 * 7–13     — đỏ (≥ 1 tuần)
 * 14–29    — vàng cam (≥ 2 tuần)
 * 30–99    — tím (≥ 1 tháng)
 * 100+     — xanh lá (kỷ lục)
 */
export function getStreakColor(streakDays) {
  const days = Math.max(0, Number(streakDays) || 0);

  if (days === 0) return "#94A3B8";
  if (days < 7) return "#EA580C";
  if (days < 14) return "#DC2626";
  if (days < 30) return "#F59E0B";
  if (days < 100) return "#7C3AED";
  return "#16A34A";
}
