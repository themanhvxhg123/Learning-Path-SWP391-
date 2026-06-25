const { getCompletionDates } = require("../models/studentsModel");

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function computeStreak(dateStrings) {
  console.log("dateStrings =", dateStrings);
  console.log("today =", ymd(new Date()));
  if (!dateStrings.length) return 0;
  const set = new Set(dateStrings);
  const cursor = new Date();
  if (!set.has(ymd(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(ymd(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(ymd(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getStreak(userId) {
  const dates = await getCompletionDates(userId);
  return computeStreak(dates);
}

module.exports = { getStreak };