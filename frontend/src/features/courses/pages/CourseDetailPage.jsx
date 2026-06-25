/**
 * CourseDetailPage  ─  Trang chi tiết khóa học (student)
 *
 * Props: không có (page component, route: /courses/:id)
 *
 * URL params:
 *   id : string  — courseId từ useParams()
 */
import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Breadcrumbs,
  Chip,
  Grid,
  IconButton,
  Link as MuiLink,
  Typography,
  alpha,
} from "@mui/material";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseFullscreenRoundedIcon from "@mui/icons-material/CloseFullscreenRounded";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AppButton from "@/shared/ui/AppButton";
import ThumbnailImage from "@/shared/ui/ThumbnailImage";
import AppProgressBar, { getProgressColor } from "@/shared/ui/AppProgressBar";
import CourseCard from "@/features/courses/components/CourseCard";
import CourseBookmarkButton from "@/features/courses/components/CourseBookmarkButton";
import useSavedCourses from "@/features/courses/hooks/useSavedCourses";
import { buildCourseDetailPath, buildCourseListPath } from "@/features/courses/utils/courseListParams";
import { getExtraCourseDetail } from "@/features/courses/data/courseDetailMock";
import { enrollCourseApi } from '@/features/auth/services/authService';
import { toast } from "@/shared/ui/Toast";

const PRIMARY = "#0891B2";
const PRIMARY_DARK = "#0E7490";
const ACCENT = "#EA580C";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const BORDER = "rgba(8,145,178,0.09)";
const DIVIDER = "rgba(8,145,178,0.10)";
const STICKY_TOP = 76;



/* ─── Helpers (Giữ nguyên 100%) ─── */

function getStatusChip(isEnrolled, progress) {
  if (!isEnrolled) return { label: "Chưa đăng ký", sx: { bgcolor: "rgba(100,116,139,0.10)", color: MUTED, border: "1px solid rgba(100,116,139,0.18)" } };
  if (progress >= 100) return { label: "Hoàn thành", sx: { bgcolor: "rgba(4,120,87,0.12)", color: "#047857", border: "1px solid rgba(4,120,87,0.24)" } };
  if (progress > 0) return { label: "Đang học", sx: { bgcolor: "rgba(8,145,178,0.12)", color: PRIMARY, border: "1px solid rgba(8,145,178,0.20)" } };
  return { label: "Đã đăng ký", sx: { bgcolor: "rgba(22,163,74,0.12)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.20)" } };
}

function getLevelChipSx(level = "") {
  const l = level.toLowerCase();
  if (l.includes("cơ bản")) return { bgcolor: "rgba(56,189,248,0.12)", color: "#0284C7", border: "1px solid rgba(56,189,248,0.22)" };
  if (l.includes("trung cấp")) return { bgcolor: "rgba(245,158,11,0.12)", color: "#D97706", border: "1px solid rgba(245,158,11,0.22)" };
  if (l.includes("nâng cao")) return { bgcolor: "rgba(234,88,12,0.12)", color: ACCENT, border: "1px solid rgba(234,88,12,0.22)" };
  return { bgcolor: "#F1F5F9", color: MUTED };
}

function getCategoryChipSx(category = "") {
  const map = {
    "Giao tiếp": { bgcolor: "rgba(37,99,235,0.10)", color: "#2563EB" },
    IELTS: { bgcolor: "rgba(124,58,237,0.10)", color: "#7C3AED" },
    TOEIC: { bgcolor: "rgba(14,116,144,0.10)", color: PRIMARY_DARK },
    "Ngữ pháp": { bgcolor: "rgba(15,23,42,0.08)", color: "#334155" },
    "Phát âm": { bgcolor: "rgba(236,72,153,0.10)", color: "#DB2777" },
  };
  return map[category] ?? { bgcolor: "#F1F5F9", color: MUTED };
}

function formatStudentCount(count) {
  if (count >= 1000) return count.toLocaleString("vi-VN");
  return String(count);
}

/* ─── Sub-components (Giữ nguyên 100% Component giao diện của bạn) ─── */

function SectionTitle({ children, sx }) {
  return (
    <Typography sx={{ fontWeight: 700, color: TEXT, fontSize: { xs: 18, sm: 20 }, lineHeight: 1.3, ...sx }}>
      {children}
    </Typography>
  );
}

function CourseMetaRow({ course }) {
  const items = [
    { icon: MenuBookOutlinedIcon, label: "Bài", value: `${course.lessonCount} bài` },
    { icon: RouteOutlinedIcon, label: "Chương", value: `${course.stageCount} chương` },
    { icon: ArticleOutlinedIcon, label: "Học liệu", value: `${course.materialCount} tài liệu` },
    { icon: AccessTimeOutlinedIcon, label: "Thời lượng", value: course.duration || "—" },
    { icon: CalendarTodayOutlinedIcon, label: "Cập nhật", value: course.updatedAt || "—" },
  ];

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 2, sm: 3 }, rowGap: 2, pt: 0.5 }}>
      {items.map(({ icon: Icon, label, value }) => (
        <Box key={label} sx={{ minWidth: 110, flex: "1 1 120px", maxWidth: 150, pb: "6px", borderBottom: "1px solid rgba(8,145,178,0.18)", transition: "border-color 0.2s ease", "&:hover": { borderBottomColor: "rgba(8,145,178,0.45)", "& .meta-icon": { color: PRIMARY } } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.4 }}>
            <Icon className="meta-icon" sx={{ fontSize: 14, color: MUTED, transition: "color 0.2s ease" }} />
            <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{label}</Typography>
          </Box>
          <Typography sx={{ fontSize: 14, color: TEXT, fontWeight: 700 }}>{value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function CourseProgressBlock({ progress, sx }) {
  const value = Math.min(Math.max(progress, 0), 100);
  const textColor = getProgressColor(value);
  const completed = value >= 100;

  return (
    <Box sx={sx}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
        <Typography sx={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Tiến độ học tập</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {completed && <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 15, color: textColor }} />}
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: textColor }}>{value}%</Typography>
        </Box>
      </Box>
      <AppProgressBar value={value} height={6} />
    </Box>
  );
}

function CourseIntro({ course, isEnrolled }) {
  const [searchParams] = useSearchParams();
  const coursesListPath = buildCourseListPath(searchParams);
  const { isSaved, toggleSave } = useSavedCourses();
  const statusChip = getStatusChip(isEnrolled, course.progress);
  const courseId = course.id ?? course.courseId;

  return (
    <Box>
      <Breadcrumbs separator="/" sx={{ mb: 1.5, "& .MuiBreadcrumbs-separator": { color: MUTED, mx: 0.5 } }}>
        <MuiLink component={Link} to="/home" underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>Trang chủ</MuiLink>
        <MuiLink component={Link} to={coursesListPath} underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>Khóa học</MuiLink>
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{course.title}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 1.25 }}>
        <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 700, color: TEXT, lineHeight: 1.3, fontSize: { xs: 20, sm: 22, md: 24 }, letterSpacing: "0.01em" }}>
          {course.title}
        </Typography>
        <CourseBookmarkButton isSaved={isSaved(courseId)} onToggle={() => toggleSave(courseId)} size="medium" iconSize={26} />
      </Box>

      <Typography sx={{ fontSize: 15, color: MUTED, lineHeight: 1.65, mb: 2 }}>{course.shortDescription}</Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <StarRoundedIcon sx={{ fontSize: 18, color: "#F59E0B" }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{course.rating}</Typography>
          <Typography sx={{ fontSize: 13, color: MUTED }}>({course.reviewCount.toLocaleString("vi-VN")} đánh giá)</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <PeopleOutlineRoundedIcon sx={{ fontSize: 17, color: MUTED }} />
          <Typography sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>{formatStudentCount(course.studentCount)} học viên</Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2.5 }}>
        <Chip label={statusChip.label} size="small" sx={{ height: 24, fontSize: 12, fontWeight: 600, borderRadius: "99px", ...statusChip.sx }} />
        {course.level && <Chip label={course.level} size="small" sx={{ height: 24, fontSize: 12, fontWeight: 600, borderRadius: "99px", ...getLevelChipSx(course.level) }} />}
        {course.category && <Chip label={course.category} size="small" sx={{ height: 24, fontSize: 12, fontWeight: 600, borderRadius: "99px", ...getCategoryChipSx(course.category) }} />}
      </Box>

      <CourseMetaRow course={course} />
    </Box>
  );
}

function CTAInfoRow({ icon: Icon, label, children, showDivider }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, py: 1.25, borderTop: showDivider ? `1px solid ${DIVIDER}` : "none" }}>
      <Icon sx={{ fontSize: 18, color: MUTED, mt: "2px", flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 500, lineHeight: 1.3, mb: children ? 0.5 : 0 }}>{label}</Typography>
        {children}
      </Box>
    </Box>
  );
}

function CourseStickyCTA({ course, isEnrolled, onEnroll, onContinue, sticky = true }) {
  const [searchParams] = useSearchParams();
  const prerequisites = course.prerequisites ?? [];

  const getButtonProps = () => {
    if (course.progress >= 100) return { label: "ÔN TẬP LẠI", variant: "contained", onClick: onContinue };
    if (isEnrolled) return { label: "TIẾP TỤC HỌC", variant: "contained", onClick: onContinue };
    return { label: "ĐĂNG KÝ HỌC", variant: "accent", onClick: onEnroll };
  };

  const btn = getButtonProps();

  return (
    <Box sx={{ position: sticky ? { md: "sticky" } : "static", top: sticky ? { md: STICKY_TOP } : "auto", width: "100%", flexShrink: 0 }}>
      <Box sx={{ bgcolor: "#fff", border: `1px solid ${BORDER}`, borderRadius: "20px", boxShadow: "0 8px 32px rgba(8,145,178,0.10)", overflow: "hidden" }}>
        <ThumbnailImage
          src={course.thumbnail}
          label={course.title}
          alt={course.title}
          iconSize={32}
          sx={{ aspectRatio: "16 / 9", width: "100%" }}
        />

        <Box sx={{ p: 2.5 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: TEXT, mb: 2, letterSpacing: "-0.02em" }}>
            {course.isFree !== false ? "Miễn phí" : "Liên hệ"}
          </Typography>

          <AppButton fullWidth variant={btn.variant} onClick={btn.onClick} sx={{ borderRadius: "12px", py: 1.5, fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", mb: isEnrolled ? 2 : 2.5 }}>
            {btn.label}
          </AppButton>

          {isEnrolled && <CourseProgressBlock progress={course.progress} sx={{ mb: 2.5 }} />}

          <Box sx={{ display: "flex", flexDirection: "column", pt: 2, borderTop: `1px solid ${DIVIDER}` }}>
            <CTAInfoRow icon={PersonOutlineOutlinedIcon} label="Giảng viên">
              <Typography sx={{ fontSize: 14, color: TEXT, fontWeight: 600, lineHeight: 1.45 }}>{course.instructor || "S.T.A.R Mentor Team"}</Typography>
            </CTAInfoRow>

            {prerequisites.length > 0 && (
              <CTAInfoRow icon={AssignmentOutlinedIcon} label="Yêu cầu" showDivider>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {prerequisites.map((prereq) => (
                    <MuiLink key={prereq.id} component={Link} to={buildCourseDetailPath(prereq.id, searchParams)} underline="hover" sx={{ fontSize: 14, color: PRIMARY, fontWeight: 600, lineHeight: 1.45, display: "block", "&:hover": { color: PRIMARY_DARK } }}>
                      {prereq.title}
                    </MuiLink>
                  ))}
                </Box>
              </CTAInfoRow>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function OutcomesSection({ outcomes }) {
  if (!outcomes?.length) return null;

  return (
    <Box>
      <SectionTitle sx={{ mb: 2 }}>Bạn sẽ học được gì</SectionTitle>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 4, rowGap: 1.75 }}>
        {outcomes.map((item, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, minHeight: 28 }}>
            <Box sx={{ width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", mt: "1px" }}>
              <CheckRoundedIcon sx={{ fontSize: 18, color: PRIMARY }} />
            </Box>
            <Typography sx={{ fontSize: 14, color: TEXT, lineHeight: 1.55, fontWeight: 500, pt: "1px" }}>{item}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function LessonIcon({ type }) {
  const Icon = type === "video" ? PlayCircleOutlineOutlinedIcon : ArticleRoundedIcon;
  return <Icon sx={{ fontSize: 15, color: MUTED, flexShrink: 0 }} />;
}

function CurriculumSection({ modules, isEnrolled, course }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set(modules[0]?.id ? [modules[0].id] : []));
  if (!modules?.length) return null;

  const allExpanded = modules.every((m) => expandedIds.has(m.id));

  const toggleModule = (id) => (_, isOpen) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) setExpandedIds(new Set());
    else setExpandedIds(new Set(modules.map((m) => m.id)));
  };

  return (
    <Box>
      <Box sx={{ pb: 1.75, mb: 0.5, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, borderBottom: `1px solid ${DIVIDER}` }}>
        <Box>
          <SectionTitle sx={{ mb: 0.5, fontSize: { xs: 16, sm: 17 } }}>Nội dung khóa học</SectionTitle>
          <Typography sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
            {course.stageCount} chương • {course.lessonCount} bài • {course.duration}
          </Typography>
        </Box>
        <IconButton onClick={toggleAll} sx={{ flexShrink: 0, mt: 0.15, color: MUTED, p: 0.5, "&:hover": { bgcolor: "transparent", color: MUTED } }}>
          {allExpanded ? <CloseFullscreenRoundedIcon sx={{ fontSize: 18 }} /> : <OpenInFullRoundedIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      {modules.map((mod, index) => (
        <Accordion key={mod.id} expanded={expandedIds.has(mod.id)} onChange={toggleModule(mod.id)} disableGutters elevation={0} sx={{ bgcolor: "transparent", "&:before": { display: "none" }, borderBottom: `1px solid ${DIVIDER}`, "&:last-of-type": { borderBottom: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon sx={{ color: MUTED, fontSize: 20 }} />} sx={{ px: 0, py: 0, minHeight: "unset", bgcolor: "transparent", transition: "background-color 0.15s ease", "&:hover": { bgcolor: alpha(PRIMARY, 0.03) }, "& .MuiAccordionSummary-content": { my: 2, alignItems: "center", gap: 1.25 } }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: MUTED, minWidth: 24, flexShrink: 0 }}>{String(index + 1).padStart(2, "0")}</Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, color: TEXT, lineHeight: 1.35 }}>{mod.title}</Typography>
              <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.25 }}>{mod.lessonCount} bài học</Typography>
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ p: 0, pb: 1.25 }}>
            {mod.description && (
              <Box sx={{ pl: 4, pr: 0, pt: 0, pb: 1.5, borderBottom: mod.lessons.length > 0 ? `1px solid ${alpha(DIVIDER, 0.85)}` : "none" }}>
                <Typography sx={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{mod.description}</Typography>
              </Box>
            )}
            {mod.lessons.map((lesson, lessonIndex) => {
              const isLocked = !isEnrolled && !lesson.isPreview;
              return (
                <Box key={lesson.id} sx={{ display: "flex", alignItems: "center", gap: 1, pl: 4, pr: 0, py: 1.25, borderTop: lessonIndex > 0 ? `1px solid ${alpha(DIVIDER, 0.85)}` : "none", opacity: isLocked ? 0.5 : 1, transition: "background-color 0.15s ease", "&:hover": { bgcolor: isLocked ? "transparent" : alpha(PRIMARY, 0.03) } }}>
                  {isLocked ? <LockOutlinedIcon sx={{ fontSize: 15, color: MUTED, flexShrink: 0 }} /> : <LessonIcon type={lesson.type} />}
                  <Typography sx={{ flex: 1, fontSize: 13, color: isLocked ? MUTED : TEXT, fontWeight: lesson.isCompleted ? 600 : 400, lineHeight: 1.4 }}>{lesson.title}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                    {lesson.isPreview && !isEnrolled && <Chip label="Xem thử" size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, borderRadius: "99px", bgcolor: alpha(ACCENT, 0.1), color: ACCENT }} />}
                    {lesson.isCompleted && <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 14, color: "#047857" }} />}
                    {lesson.duration && <Typography sx={{ fontSize: 11.5, color: MUTED, minWidth: 48, textAlign: "right" }}>{lesson.duration}</Typography>}
                  </Box>
                </Box>
              );
            })}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

function RelatedCoursesSection({ course }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [relatedCourses, setRelatedCourses] = useState([]);

  useEffect(() => {
    // Phải có thông tin khóa học hiện tại mới đi tìm các khóa liên quan
    if (!course?.categoryId || !course?.levelId) return;

    const fetchRelated = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const headers = user.userId ? { 'x-user-id': user.userId } : {};

        // Lấy tất cả khóa học
        const res = await fetch('http://localhost:5000/api/courses/student', { headers });
        const data = await res.json();

        if (data.success) {
          // 0. Loại bỏ chính khóa học mà user đang xem ra khỏi danh sách
          const allCourses = data.data.filter(c => String(c.CourseId) !== String(course.id));

          // 1. Lọc khóa học khớp CẢ danh mục VÀ trình độ
          let exactMatch = allCourses.filter(c =>
            String(c.CategoryId) === String(course.categoryId) &&
            String(c.LevelId) === String(course.levelId)
          );

          // 2. Lọc khóa học khớp 1 TRONG 2 (nhưng không lấy trùng với mảng ở bước 1)
          let partialMatch = allCourses.filter(c =>
            (String(c.CategoryId) === String(course.categoryId) || String(c.LevelId) === String(course.levelId)) &&
            !exactMatch.some(e => String(e.CourseId) === String(c.CourseId))
          );

          // 3. Gộp lại và CHỈ LẤY TỐI ĐA 5 khóa học
          let finalRelated = [...exactMatch, ...partialMatch].slice(0, 5);
          setRelatedCourses(finalRelated);
        }
      } catch (error) {
        console.error("Lỗi lấy khóa học liên quan:", error);
      }
    };

    fetchRelated();
  }, [course]);

  // Nếu không tìm thấy khóa nào thì ẩn luôn khu vực này cho đẹp
  if (relatedCourses.length === 0) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <SectionTitle>Khóa học liên quan</SectionTitle>
        <AppButton
          variant="text"
          sx={{ fontWeight: 600, color: PRIMARY }}
          onClick={() => navigate(`/courses?category=${course.categoryId}&level=${course.levelId}`)}
        >
          Xem thêm
        </AppButton>
      </Box>
      <Grid container spacing={2.5}>
        {relatedCourses.map((c) => (
          <Grid item xs={12} sm={6} md={4} key={c.CourseId}>
            <CourseCard
              course={c}
              onEnroll={() => navigate(buildCourseDetailPath(c.CourseId, searchParams))}
              onContinueLearning={() => navigate(buildCourseDetailPath(c.CourseId, searchParams))}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}


export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 1. Tạo State lưu dữ liệu
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2. Tự động gọi API lấy data từ Database khi mở trang
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const headers = user.userId ? { 'x-user-id': user.userId } : {};
        // Vẫn dùng API cũ vì Backend của bạn chỉ có API này cho Detail
        const res = await fetch(`http://localhost:5000/api/courses/my-courses/${id}?tab=course`, { headers });
        const result = await res.json();
        // Kiểm tra xem có dữ liệu không
        if (result.success && result.data && result.data.length > 0) {
          const dbData = result.data[0];
          // 1. Xử lý ảnh lỗi và tạo URL tuyệt đối
          let courseImage = dbData.thumbnail || dbData.Thumbnail;
          if (courseImage === 'CHƯA FIX LỖI ẢNH' || !courseImage) {
            courseImage = null;
          } else {
            let val = String(courseImage).trim();
            if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image') || val.startsWith('blob:')) {
              courseImage = val;
            } else {
              courseImage = `http://localhost:5000${val.startsWith('/') ? val : '/' + val}`;
            }
          }
          // Gán dữ liệu (Hỗ trợ đọc 2 kiểu: cả HOA lẫn thường từ DB)
          const mappedCourse = {
            id: dbData.CourseId,
            title: dbData.CourseName,
            description: dbData.Description,
            shortDescription: dbData.Description,
            thumbnail: courseImage,
            category: dbData.CategoryDisplayName,
            categoryId: dbData.CategoryId,
            level: dbData.LevelDisplayName,
            levelId: dbData.LevelId,
            instructor: dbData.InStructorName,
            isEnrolled: Boolean(dbData.isEnrolled),
            progress: dbData.progress,
            lessonCount: dbData.TotalLessons || 0,
            stageCount: dbData.Paths ? dbData.Paths.length : 0,
            materialCount: 0,
            // Các trường không có trong DB thì điền số chung để không bị vỡ layout
            duration: "6 giờ",
            rating: 4.8,
            reviewCount: 154,
            studentCount: 2000,
            isFree: true,
            outcomes: ["Nắm vững kiến thức cốt lõi"],
            prerequisites: [],
            // Lấy danh sách bài học đưa vào Modules
            modules: (dbData.Paths || []).map(path => {
              return {
                id: path.PathId,
                title: path.PathName,
                lessonCount: path.Nodes ? path.Nodes.length : 0,
                lessons: (path.Nodes || []).map((node, index) => {
                  return {
                    id: node.NodeId,
                    title: node.NodeName,
                    type: "video",
                    isPreview: index === 0, // Cho xem thử bài đầu tiên
                    isCompleted: false,
                    duration: "15 phút"
                  };
                })
              };
            })
          };
          setCourse(mappedCourse);
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseData();
  }, [id]);

  // 3. Xử lý logic lúc bấm nút
  const handleEnroll = async () => {
    // Đọc thông tin đăng nhập trực tiếp từ localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.userId) {
      toast.error('Vui lòng đăng nhập để đăng ký khóa học.');
      return;
    }

    try {
      // Gọi sang API service
      const res = await enrollCourseApi({
        userId: Number(user.userId),
        courseId: Number(course.id) // Lấy đúng ID của khóa học đang xem
      });

      if (res && (res.success === true || res.ok === true)) {
        toast.success(`Đã đăng ký khóa "${course.title}" thành công!`);
        setCourse(prev => ({ ...prev, isEnrolled: true }));
      } else {
        toast.error(res?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error("Lỗi xử lý đăng ký:", error);
      toast.error("Hệ thống gặp lỗi khi xử lý đăng ký.");
    }
  };

  const handleContinue = () => {
    navigate(`/my-courses/${id}/learn`);
  };

  // Nếu đang loading thì hiện chữ chờ
  if (loading) {
    return <Box sx={{ py: 10, textAlign: "center" }}>Đang tải khóa học...</Box>;
  }

  // Nếu API lỗi hoặc không tìm thấy khóa học
  if (!course) {
    return <Box sx={{ py: 10, textAlign: "center" }}>Không tìm thấy khóa học này</Box>;
  }

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: { xs: 0, lg: 6 }, alignItems: "flex-start" }}>

        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <CourseIntro course={course} isEnrolled={course.isEnrolled} />

          <Box sx={{ display: { xs: "block", lg: "none" }, mt: 3, mb: 1 }}>
            <CourseStickyCTA course={course} isEnrolled={course.isEnrolled} onEnroll={handleEnroll} onContinue={handleContinue} sticky={false} />
          </Box>

          <Box sx={{ mt: 5 }}>
            <OutcomesSection outcomes={course.outcomes} />
          </Box>

          <Box sx={{ mt: 5 }}>
            <CurriculumSection modules={course.modules} isEnrolled={course.isEnrolled} course={course} />
          </Box>
        </Box>

        <Box sx={{ display: { xs: "none", lg: "block" }, width: 380, flexShrink: 0 }}>
          <CourseStickyCTA course={course} isEnrolled={course.isEnrolled} onEnroll={handleEnroll} onContinue={handleContinue} sticky />
        </Box>
      </Box>

      <Box sx={{ mt: { xs: 4, sm: 5 } }}>
        <RelatedCoursesSection course={course} />
      </Box>
    </Box>
  );
}