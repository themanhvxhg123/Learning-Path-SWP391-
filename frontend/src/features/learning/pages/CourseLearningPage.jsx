/**
 * CourseLearningPage  ─  Trang học bài trong khóa học (student)
 *
 * Props: không có (page component, route: /my-courses/:courseId/learn)
 *
 * URL params:
 *   courseId : string  — ID khóa học, từ useParams()
 *
 * ── Data source (hiện đang dùng mock) ───────────────────────────────────
 *   getCourseLearningMock(courseId) từ courseLearningMock.js
 *   Thứ tự ưu tiên: mentorCourseDetailById → MANUAL_COURSE_LEARNING → fallback
 *
 *   TODO: khi BE sẵn sàng → thay bằng:
 *   GET /api/courses/:courseId/learning?userId=<id>
 *
 *   Response JSON mong đợi từ BE:
 *   {
 *     success: true,
 *     course: {
 *       courseId:    number,
 *       courseTitle: string,
 *       instructor:  string,
 *       progress:    number,    // 0–100
 *       modules: [
 *         {
 *           id:    number,
 *           title: string,
 *           lessons: [
 *             {
 *               id:       number,
 *               title:    string,
 *               duration: string,
 *               type:     "video" | "reading" | "quiz",
 *               status:   "completed" | "current" | "not_started",
 *               materials: [
 *                 {
 *                   id:    number,
 *                   type:  "VIDEO" | "DOCUMENT" | "TEST",
 *                   title: string,
 *                   url:   string | null
 *                 }
 *               ]
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   }
 *
 * ── API call (cập nhật tiến trình) ──────────────────────────────────────
 *   TODO: POST /api/courses/:courseId/progress
 *   Request JSON:
 *   {
 *     userId:     number,
 *     lessonId:   number,
 *     completed:  boolean,
 *     timeSpent:  number    // giây
 *   }
 *   Response JSON: { success: true, progressPercentage: number }
 */
import { useMemo, useState, useEffect } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Breadcrumbs,
  Chip,
  Link as MuiLink,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleRounded";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppButton from "@/shared/ui/AppButton";
import AppProgressBar, { getProgressColor } from "@/shared/ui/AppProgressBar";
import EmptyState from "@/shared/ui/EmptyState";
import { resolveVideoEmbed } from "@/shared/utils/videoEmbedUtils";
import {
  getChapterQuizConfig,
  getCourseQuizConfig,
} from "@/features/mentor/services/chapterQuizConfigService";

const PRIMARY = "#0891B2";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const SUCCESS = "#16A34A";
const DIVIDER = "rgba(8,145,178,0.08)";

// CSS cấu hình để nội dung bài đọc (HTML) hiển thị y hệt như bên Mentor soạn thảo
const RICH_CONTENT_SX = {
  fontSize: 15,
  lineHeight: 1.8,
  color: TEXT,
  wordBreak: 'break-word',
  '& p': { margin: '0 0 8px' },
  '& ul, & ol': { paddingLeft: '1.5rem', marginBottom: '8px' },
  '& li': { marginBottom: '4px' },
  '& img': { maxWidth: '100%', height: 'auto', borderRadius: '8px' },
  '& i, & em': { fontStyle: 'italic' },
  '& b, & strong': { fontWeight: 700 },
  '& u': { textDecoration: 'underline' },
};

// Component phụ trách render Video: Tự động phân loại link Youtube/Vimeo hay link .mp4
function LessonVideoPlayer({ url }) {
  if (!url) return null;
  const { previewType, embedUrl } = resolveVideoEmbed(url);

  // Trả về thẻ video gốc nếu là file .mp4
  if (previewType === 'video') {
    return (
      <Box
        component="video"
        src={embedUrl}
        controls
        sx={{ width: '100%', height: '100%', bgcolor: '#000', objectFit: 'contain' }}
      />
    );
  }

  // Trả về thẻ iframe nếu là link YouTube, Vimeo...
  return (
    <Box
      component="iframe"
      src={embedUrl}
      allowFullScreen
      sx={{ width: '100%', height: '100%', border: 'none', bgcolor: '#000' }}
    />
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function flatLessons(mods) {
  return mods.flatMap((m) => m.lessons);
}

function findLessonAndModule(mods, lessonId) {
  for (const mod of mods) {
    const lesson = mod.lessons.find((l) => l.id === lessonId);
    if (lesson) return { lesson, mod };
  }
  return { lesson: null, mod: null };
}

function getInitialLessonId(mods) {
  const all = flatLessons(mods);
  return (all.find((l) => l.status === "current") ?? all[0])?.id ?? null;
}

function computeProgress(mods) {
  const all = flatLessons(mods);
  if (!all.length) return 0;
  return Math.round(
    (all.filter((l) => l.status === "completed").length / all.length) * 100
  );
}

function OutlineTestItem({ label, subtitle, onClick, variant = "chapter" }) {
  const isCourse = variant === "course";

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        py: 1,
        px: 1.25,
        mt: isCourse ? 0.5 : 0.25,
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        bgcolor: isCourse ? alpha("#7C3AED", 0.08) : alpha("#7C3AED", 0.05),
        borderTop: isCourse ? "none" : `1px dashed ${alpha("#7C3AED", 0.22)}`,
        transition: "background-color 0.15s ease",
        "&:hover": {
          bgcolor: alpha("#7C3AED", isCourse ? 0.12 : 0.1),
        },
      }}
    >
      <Box sx={{ pt: 0.1, flexShrink: 0 }}>
        <QuizRoundedIcon sx={{ fontSize: 18, color: "#7C3AED" }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#6D28D9",
            lineHeight: 1.35,
          }}
        >
          {label}
        </Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.25, lineHeight: 1.35 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

const TYPE_ICON = {
  video: PlayCircleRoundedIcon,
  reading: ArticleRoundedIcon,
  quiz: AssignmentRoundedIcon,
  doc: DescriptionRoundedIcon,
  text: ArticleRoundedIcon,
};

const TYPE_LABEL = { video: "Video", reading: "Bài đọc", quiz: "Bài tập", doc: "Tài liệu", text: "Văn bản" };

const MATERIAL_TYPE_UI = {
  VIDEO: "video",
  TEXT: "reading",
  DOC: "doc",
  TEST: "quiz",
};

function mapMaterialTypeToUi(materialType) {
  if (!materialType) return "video";
  const key = String(materialType).toUpperCase();
  return MATERIAL_TYPE_UI[key] ?? String(materialType).toLowerCase();
}

const ICON_COLORS = {
  route: "#7C3AED",
  instructor: "#2563EB",
  duration: "#D97706",
  video: PRIMARY,
  reading: "#0EA5E9",
  quiz: "#EA580C",
  objective: SUCCESS,
  content: "#6366F1",
  pdf: "#DC2626",
  doc: "#1D4ED8",
  file: "#64748B",
  download: PRIMARY,
};

const TYPE_ICON_COLOR = {
  video: ICON_COLORS.video,
  reading: ICON_COLORS.reading,
  quiz: ICON_COLORS.quiz,
  doc: ICON_COLORS.doc,
  text: ICON_COLORS.reading,
};

const META_TEXT_SX = { fontSize: 12, color: MUTED, fontWeight: 500, lineHeight: 1.2 };

function getMaterialFileMeta(title = "") {
  const lower = title.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return { Icon: PictureAsPdfRoundedIcon, color: ICON_COLORS.pdf };
  }
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
    return { Icon: DescriptionRoundedIcon, color: ICON_COLORS.doc };
  }
  return { Icon: InsertDriveFileRoundedIcon, color: ICON_COLORS.file };
}

function HeaderMetaItem({ icon: Icon, iconColor = PRIMARY, children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Icon sx={{ fontSize: 15, color: iconColor, flexShrink: 0 }} />
      {children}
    </Box>
  );
}

function LessonChip({ icon: Icon, label, iconColor = MUTED, sx = {} }) {
  return (
    <Chip
      icon={<Icon sx={{ fontSize: "14px !important", color: `${iconColor} !important` }} />}
      label={label}
      size="small"
      sx={{
        height: 26,
        fontSize: 11,
        fontWeight: 600,
        borderRadius: "99px",
        bgcolor: alpha(iconColor === MUTED ? PRIMARY : iconColor, 0.06),
        border: `1px solid ${alpha(iconColor === MUTED ? PRIMARY : iconColor, 0.14)}`,
        color: MUTED,
        ...sx,
      }}
    />
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function CourseLearningPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = String(user.userId || '1');

  // 1. Tạo State
  const [modules, setModules] = useState([]);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [chapterQuizConfigs, setChapterQuizConfigs] = useState({});
  const [courseQuizConfig, setCourseQuizConfig] = useState(null);

  // 2. Tạo state để lưu tên khóa học và giảng viên
  const [courseInfo, setCourseInfo] = useState({ courseTitle: "Đang tải dữ liệu...", instructor: "" });
  const rawData = courseInfo; // Dùng lại tên rawData để UI bên dưới không bị lỗi

  // 3. Gọi API và Dịch dữ liệu Database -> React UI
  useEffect(() => {
    const fetchLearningData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/courses/${courseId}/learning`, {
          headers: { 'x-user-id': currentUserId }
        });
        const result = await response.json();

        if (result.success) {
          setCourseInfo({
            courseTitle: result.courseTitle,
            instructor: result.instructor
          });
          // ĐÂY LÀ ĐOẠN "DỊCH THUẬT" SIÊU HAY
          const mappedModules = result.data.map((mod, chapterIndex) => ({
            id: mod.PathId,
            index: chapterIndex + 1,
            title: mod.PathName,
            description: String(mod.Description ?? "").trim(),
            lessons: mod.lessons.map((lesson, lessonIndex) => ({
              id: lesson.NodeId,
              index: lessonIndex + 1,
              title: lesson.NodeName,
              description: String(lesson.Description ?? "").trim(),
              type: mapMaterialTypeToUi(lesson.MaterialType),
              status: lesson.IsCompleted ? "completed" : "not_started",
              // Lấy thêm trường link video và nội dung HTML từ Backend
              videoUrl: lesson.MaterialUrl,
              contentBody: lesson.Content
            })),
          }));

          setModules(mappedModules);

          // Chọn bài đầu tiên
          if (mappedModules.length > 0 && mappedModules[0].lessons.length > 0) {
            setCurrentLessonId(mappedModules[0].lessons[0].id);
          }
        }
      } catch (error) {
        console.error("Lỗi:", error);
      }
    };
    fetchLearningData();
  }, [courseId]);

  useEffect(() => {
    if (!courseId || modules.length === 0) return;

    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        modules.map(async (mod) => {
          const res = await getChapterQuizConfig(courseId, mod.id, {
            chapterTitle: mod.title,
            chapterIndex: mod.index - 1,
          });
          return [mod.id, res.ok ? res.config : null];
        }),
      );

      if (cancelled) return;
      setChapterQuizConfigs(Object.fromEntries(entries));

      const courseRes = await getCourseQuizConfig(courseId, {
        courseTitle: courseInfo.courseTitle,
      });
      if (!cancelled && courseRes.ok) {
        setCourseQuizConfig(courseRes.config);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, modules, courseInfo.courseTitle]);

  // 4. Các hàm tính toán của React (Giữ nguyên không đổi)
  const allLessons = useMemo(() => flatLessons(modules), [modules]);
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const { lesson: currentLesson, mod: currentMod } = findLessonAndModule(modules, currentLessonId);
  const progress = useMemo(() => computeProgress(modules), [modules]);

  // 5. Nút Đánh dấu hoàn thành
  const handleToggleComplete = async () => {
    if (!currentLesson) return;
    try {
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({ nodeId: currentLesson.id })
      });

      const result = await response.json();
      if (result.success) {
        // Cập nhật giao diện thành xanh
        setModules(prev =>
          prev.map(module => ({
            ...module,
            lessons: module.lessons.map(lesson =>
              lesson.id === currentLesson.id
                ? { ...lesson, status: "completed" }
                : lesson
            )
          }))
        );
      }
    } catch (error) {
      console.error("Lỗi khi lưu tiến độ:", error);
    }
  };

  if (!rawData) {
    return (
      <Box sx={{ maxWidth: 1280, mx: "auto", py: 8 }}>
        <EmptyState
          variant="error"
          icon={SearchOffRoundedIcon}
          title="Không tìm thấy khóa học"
          description="Khóa học này chưa có nội dung học hoặc bạn chưa đăng ký."
          actionLabel="Về Khóa học của tôi"
          onAction={() => navigate("/my-courses")}
        />
      </Box>
    );
  }

  const handleSelectLesson = (id) => setCurrentLessonId(id);

  const handlePrev = () => {
    if (currentIndex > 0) handleSelectLesson(allLessons[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (currentIndex < allLessons.length - 1)
      handleSelectLesson(allLessons[currentIndex + 1].id);
  };

  const handleGoToChapterTest = (chapterId) => {
    navigate(`/my-courses/${courseId}/test/chapter/${chapterId}`);
  };

  const handleGoToCourseTest = () => {
    navigate(`/my-courses/${courseId}/test/final`);
  };

  const TypeIcon = TYPE_ICON[currentLesson?.type] ?? ArticleRoundedIcon;
  const isCompleted = currentLesson?.status === "completed";

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      {/* ── Breadcrumb ── */}
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2.5, "& .MuiBreadcrumbs-separator": { color: MUTED, mx: 0.5 } }}
      >
        <MuiLink
          component={Link}
          to="/my-courses"
          underline="none"
          sx={{
            fontSize: 13,
            color: MUTED,
            fontWeight: 500,
            "&:hover": { color: PRIMARY },
          }}
        >
          Khóa học của tôi
        </MuiLink>
        <MuiLink
          component={Link}
          to={`/courses/${courseId}`}
          underline="none"
          sx={{
            fontSize: 13,
            color: MUTED,
            fontWeight: 500,
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
            "&:hover": { color: PRIMARY },
          }}
        >
          {rawData.courseTitle}
        </MuiLink>
        <Typography
          sx={{
            fontSize: 13,
            color: TEXT,
            fontWeight: 600,
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentLesson
            ? `Bài ${currentLesson.index}: ${currentLesson.title}`
            : "Bài học"}
        </Typography>
      </Breadcrumbs>

      {/* ── Course / lesson header ── */}
      <Box
        sx={{
          mb: 3,
          pb: 2.5,
          borderBottom: `1px solid ${DIVIDER}`,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 2,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: { xs: 1.25, md: 1.5 },
          }}
        >
          {/* Hàng 1: Chương — cỡ chữ lớn nhất trong cụm */}
          {currentMod && (
            <Typography
              component="div"
              sx={{
                fontSize: { xs: 18, sm: 19, md: 20 },
                lineHeight: 1.35,
                letterSpacing: "-0.02em",
              }}
            >
              <Box component="span" sx={{ color: TEXT, fontWeight: 800 }}>
                Chương {currentMod.index}:
              </Box>
              <Box component="span" sx={{ color: TEXT, fontWeight: 700, ml: 0.5 }}>
                {currentMod.title}
              </Box>
            </Typography>
          )}

          {/* Hàng 2: Bài học — nhỏ hơn chương */}
          {currentLesson && (
            <>
              <Typography
                component="div"
                sx={{
                  fontSize: { xs: 14, sm: 15, md: 16 },
                  lineHeight: 1.4,
                  letterSpacing: "-0.01em",
                }}
              >
                <Box component="span" sx={{ color: PRIMARY, fontWeight: 700 }}>
                  Bài {currentLesson.index}:
                </Box>
                <Box component="span" sx={{ color: TEXT, fontWeight: 700, ml: 0.5 }}>
                  {currentLesson.title}
                </Box>
              </Typography>

              {/* Hàng 3: Author + loại học liệu — dưới tên bài */}
              {(rawData.instructor || currentLesson.type) && (
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  {rawData.instructor && (
                    <HeaderMetaItem icon={PersonRoundedIcon} iconColor={ICON_COLORS.instructor}>
                      <Typography
                        sx={{
                          fontSize: { xs: 12, md: 13 },
                          fontWeight: 500,
                          color: MUTED,
                          lineHeight: 1.3,
                        }}
                      >
                        {rawData.instructor}
                      </Typography>
                    </HeaderMetaItem>
                  )}
                  {currentLesson.type && (
                    <LessonChip
                      icon={TypeIcon}
                      iconColor={TYPE_ICON_COLOR[currentLesson.type] ?? ICON_COLORS.reading}
                      label={TYPE_LABEL[currentLesson.type] ?? currentLesson.type}
                      sx={{
                        flexShrink: 0,
                        height: 22,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: TYPE_ICON_COLOR[currentLesson.type] ?? ICON_COLORS.reading,
                        border: "none",
                        "& .MuiChip-icon": {
                          fontSize: "12px !important",
                          ml: 0.75,
                        },
                        "& .MuiChip-label": {
                          px: 0.875,
                          py: 0,
                        },
                      }}
                    />
                  )}
                </Box>
              )}
            </>
          )}
        </Box>

        {/* Progress block */}
        <Box
          sx={{
            minWidth: 220,
            width: { xs: "100%", sm: "auto" },
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
            <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>
              Tiến độ khóa học
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: getProgressColor(progress) }}>
              {progress}%
            </Typography>
          </Box>
          <AppProgressBar value={progress} height={7} />
        </Box>
      </Box>

      {/* ── 2-col layout ── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column-reverse", lg: "row" },
          gap: 3,
          alignItems: "flex-start",
        }}
      >
        {/* ── Main lesson content ── */}
        <Box sx={{ flex: "1 1 65%", minWidth: 0, width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Mô tả bài học — container riêng */}
          <Box
            sx={{
              bgcolor: "#fff",
              borderRadius: "16px",
              border: `1px solid ${DIVIDER}`,
              boxShadow: theme.ios18?.shadow?.sm,
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
              <MenuBookRoundedIcon sx={{ fontSize: 16, color: ICON_COLORS.content }} />
              <Typography sx={{ fontSize: { xs: 16, sm: 17 }, fontWeight: 700, color: TEXT }}>
                Mô tả
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 14, color: MUTED, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {currentLesson?.description || "Chưa có mô tả cho bài học này."}
            </Typography>
          </Box>

          {/* Học liệu bài học */}
          <Box
            sx={{
              bgcolor: "#fff",
              borderRadius: "16px",
              border: `1px solid ${DIVIDER}`,
              boxShadow: theme.ios18?.shadow?.sm,
              p: { xs: 2.5, md: 3.5 },
            }}
          >
            {/* Khu vực hiển thị Video (chỉ hiện nếu type là video và có link) */}
            {currentLesson?.type === "video" && currentLesson?.videoUrl && (
              <Box
                sx={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  borderRadius: "12px",
                  mb: 3,
                  bgcolor: "#000",
                  border: `1px solid ${DIVIDER}`,
                  overflow: "hidden"
                }}
              >
                <LessonVideoPlayer url={currentLesson.videoUrl} />
              </Box>
            )}

            {/* Type chip (compact — header đã hiển thị đầy đủ) */}
            {currentLesson?.duration && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2.5 }}>
                <LessonChip
                  icon={AccessTimeRoundedIcon}
                  iconColor={ICON_COLORS.duration}
                  label={currentLesson.duration}
                />
              </Box>
            )}

            {/* Mục tiêu — chỉ hiển thị khi có dữ liệu mock/objectives */}
            {currentLesson?.content?.objectives?.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: TEXT, mb: 1.25 }}>
                  Mục tiêu bài học
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {currentLesson.content.objectives.map((item, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                      <CheckCircleRoundedIcon
                        sx={{ fontSize: 18, color: ICON_COLORS.objective, mt: 0.15, flexShrink: 0 }}
                      />
                      <Typography sx={{ fontSize: 14, color: MUTED, lineHeight: 1.65 }}>
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Khu vực hiển thị Bài đọc (Rich Text HTML) */}
            {currentLesson?.contentBody && (
              <Box sx={{ mb: 3, pt: 2, borderTop: `1px solid ${DIVIDER}` }}>
                <Box
                  sx={RICH_CONTENT_SX}
                  dangerouslySetInnerHTML={{ __html: currentLesson.contentBody }}
                />
              </Box>
            )}
            {/* Materials */}
            {currentLesson?.materials?.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: TEXT, mb: 1.25 }}>
                  Tài liệu kèm theo
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {currentLesson.materials.map((file) => {
                    const { Icon: FileIcon, color: fileColor } = getMaterialFileMeta(file.title);
                    return (
                      <Box
                        key={file.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          py: 1,
                          px: 1.5,
                          borderRadius: "10px",
                          border: `1px solid ${DIVIDER}`,
                          transition: "border-color 0.2s ease, background-color 0.2s ease",
                          "&:hover": {
                            borderColor: "rgba(8,145,178,0.18)",
                            bgcolor: "rgba(8,145,178,0.03)",
                            "& .material-download": { color: ICON_COLORS.download, opacity: 1 },
                          },
                        }}
                      >
                        <FileIcon sx={{ fontSize: 18, color: fileColor, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 500, flex: 1, minWidth: 0 }}>
                          {file.title}
                        </Typography>
                        <DownloadRoundedIcon
                          className="material-download"
                          sx={{ fontSize: 16, color: MUTED, flexShrink: 0, opacity: 0.55, transition: "color 0.2s ease, opacity 0.2s ease" }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* ── Navigation buttons ── */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                pt: 3,
                mt: 1,
                borderTop: `1px solid ${DIVIDER}`,
              }}
            >
              <AppButton
                size="small"
                variant="outlined"
                disabled={currentIndex <= 0}
                onClick={handlePrev}
                startIcon={<ArrowBackRoundedIcon />}
                sx={{ minWidth: 120 }}
              >
                Bài trước
              </AppButton>

              <AppButton
                size="small"
                variant={isCompleted ? "outlined" : "contained"}
                onClick={handleToggleComplete}
                startIcon={<CheckRoundedIcon sx={{ fontSize: "18px !important" }} />}
                sx={{
                  minWidth: 190,
                  fontWeight: 600,
                  ...(isCompleted
                    ? {
                      borderColor: alpha(SUCCESS, 0.5),
                      color: SUCCESS,
                      bgcolor: alpha(SUCCESS, 0.08),
                      "&:hover": {
                        borderColor: SUCCESS,
                        bgcolor: alpha(SUCCESS, 0.14),
                      },
                    }
                    : {
                      bgcolor: SUCCESS,
                      color: "#fff",
                      boxShadow: `0 2px 8px ${alpha(SUCCESS, 0.28)}`,
                      "&:hover": {
                        bgcolor: "#15803D",
                        boxShadow: `0 3px 10px ${alpha(SUCCESS, 0.34)}`,
                      },
                    }),
                }}
              >
                {isCompleted ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
              </AppButton>

              <AppButton
                size="small"
                variant="contained"
                disabled={currentIndex >= allLessons.length - 1}
                onClick={handleNext}
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{ minWidth: 120 }}
              >
                Bài tiếp theo
              </AppButton>
            </Box>
          </Box>
        </Box>

        {/* ── Lesson list sidebar ── */}
        <Box sx={{ flex: "0 0 32%", width: "100%", maxWidth: { lg: 400 } }}>
          <Box sx={{ position: { lg: "sticky" }, top: 84 }}>
            {currentMod?.description && (
              <Box
                sx={{
                  mb: 1.5,
                  px: 2,
                  py: 1.5,
                  bgcolor: "#fff",
                  borderRadius: "14px",
                  border: `1px solid ${DIVIDER}`,
                  boxShadow: theme.ios18?.shadow?.sm,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: TEXT,
                    mb: 0.5,
                  }}
                >
                  Mô tả chương
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {currentMod.description}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                bgcolor: "#fff",
                borderRadius: "16px",
                border: `1px solid ${DIVIDER}`,
                boxShadow: theme.ios18?.shadow?.sm,
                overflow: "hidden",
              }}
            >
              {/* Sidebar header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.75,
                  borderBottom: `1px solid ${DIVIDER}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                  Nội dung khóa học
                </Typography>
                <Typography sx={{ fontSize: 12, color: MUTED }}>
                  {allLessons.filter((l) => l.status === "completed").length}/
                  {allLessons.length} bài
                </Typography>
              </Box>

              {/* Accordion module list */}
              <Box
                sx={{
                  px: 1,
                  py: 1,
                  maxHeight: { lg: "calc(100vh - 260px)" },
                  overflowY: "auto",
                }}
              >
                {modules.map((mod) => {
                  const doneCount = mod.lessons.filter(
                    (l) => l.status === "completed"
                  ).length;
                  const isActiveModule = mod.lessons.some((l) => l.id === currentLessonId);
                  const modPercent =
                    mod.lessons.length > 0
                      ? Math.round((doneCount / mod.lessons.length) * 100)
                      : 0;

                  return (
                    <Accordion
                      key={mod.id}
                      defaultExpanded={isActiveModule}
                      disableGutters
                      elevation={0}
                      sx={{
                        bgcolor: "transparent",
                        "&:before": { display: "none" },
                        boxShadow: "none",
                      }}
                    >
                      <AccordionSummary
                        expandIcon={
                          <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: MUTED }} />
                        }
                        sx={{
                          minHeight: 44,
                          px: 1,
                          "& .MuiAccordionSummary-content": { my: 1 },
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                          <Typography
                            sx={{
                              fontSize: 12.5,
                              fontWeight: isActiveModule ? 600 : 500,
                              color: isActiveModule ? PRIMARY : TEXT,
                              lineHeight: 1.4,
                            }}
                          >
                            Chương {mod.index}: {mod.title}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.2 }}>
                            {doneCount}/{mod.lessons.length} bài
                          </Typography>
                        </Box>
                      </AccordionSummary>

                      <AccordionDetails sx={{ px: 0.5, pt: 0, pb: 1 }}>
                        {/* Mini progress bar per module */}
                        <AppProgressBar value={modPercent} height={3} sx={{ px: 1, mb: 0.75 }} />

                        {mod.lessons.map((lesson) => {
                          const isActive = lesson.id === currentLessonId;
                          const LIcon = TYPE_ICON[lesson.type] ?? ArticleRoundedIcon;

                          return (
                            <Box
                              key={lesson.id}
                              component="button"
                              type="button"
                              onClick={() => handleSelectLesson(lesson.id)}
                              sx={{
                                width: "100%",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1,
                                py: 1,
                                px: 1.25,
                                border: "none",
                                borderRadius: "10px",
                                cursor: "pointer",
                                textAlign: "left",
                                fontFamily: "inherit",
                                bgcolor: isActive ? alpha(PRIMARY, 0.08) : "transparent",
                                transition: "background-color 0.15s ease",
                                "&:hover": {
                                  bgcolor: isActive
                                    ? alpha(PRIMARY, 0.1)
                                    : alpha(PRIMARY, 0.04),
                                },
                              }}
                            >
                              <Box sx={{ pt: 0.1, flexShrink: 0 }}>
                                {lesson.status === "completed" ? (
                                  <CheckRoundedIcon sx={{ fontSize: 18, color: SUCCESS }} />
                                ) : isActive ? (
                                  <PlayCircleRoundedIcon sx={{ fontSize: 18, color: PRIMARY }} />
                                ) : (
                                  <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: "#CBD5E1" }} />
                                )}
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: 12.5,
                                    fontWeight: isActive ? 600 : 500,
                                    color: isActive ? PRIMARY : TEXT,
                                    lineHeight: 1.35,
                                  }}
                                >
                                  Bài {lesson.index}: {lesson.title}
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    mt: 0.25,
                                  }}
                                >
                                  <LIcon sx={{ fontSize: 11, color: TYPE_ICON_COLOR[lesson.type] ?? ICON_COLORS.reading }} />
                                  <Typography sx={{ fontSize: 11, color: MUTED }}>
                                    {lesson.duration}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          );
                        })}

                        <OutlineTestItem
                          label="Làm bài kiểm tra"
                          subtitle={
                            chapterQuizConfigs[mod.id]?.title || "Kiểm tra cuối chương"
                          }
                          onClick={() => handleGoToChapterTest(mod.id)}
                        />
                      </AccordionDetails>
                    </Accordion>
                  );
                })}

                <Box sx={{ px: 0.5, pt: 0.5, pb: 0.5 }}>
                  <OutlineTestItem
                    variant="course"
                    label="Làm bài kiểm tra toàn khóa"
                    subtitle={courseQuizConfig?.title || "Kiểm tra cuối khóa"}
                    onClick={handleGoToCourseTest}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
