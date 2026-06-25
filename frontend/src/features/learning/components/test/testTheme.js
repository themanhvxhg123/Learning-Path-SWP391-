export const TEST_PRIMARY = '#0891B2';
export const TEST_TEXT = '#0F172A';
export const TEST_MUTED = '#64748B';
export const TEST_SUCCESS = '#16A34A';
export const TEST_ERROR = '#DC2626';
export const TEST_WARNING = '#B45309';
export const TEST_DIVIDER = 'rgba(8,145,178,0.08)';

export function formatDurationMinutes(minutes = 0) {
  const value = Number(minutes) || 0;
  return `${value} phút`;
}

export function formatTimeSpent(seconds = 0) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins <= 0) return `${secs} giây`;
  return `${mins} phút ${secs > 0 ? `${secs} giây` : ''}`.trim();
}
