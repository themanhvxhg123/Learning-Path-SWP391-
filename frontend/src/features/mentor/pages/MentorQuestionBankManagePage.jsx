/**
 * =============================================================================
 * MentorQuestionBankManagePage — Trang workspace chỉnh sửa ngân hàng câu hỏi
 * =============================================================================
 *
 * MỤC ĐÍCH:
 *   Trang chính để mentor tạo/sửa câu hỏi theo từng chương (path) của khóa học.
 *   Mỗi chương có các section theo kỹ năng: Listening, Reading, Vocabulary.
 *
 * ROUTE URL:
 *   /mentor/question-banks/:courseId/:pathId
 *   Ví dụ: /mentor/question-banks/3/10  → khóa học #3, chương #10
 *
 * LUỒNG CHÍNH (3 bước):
 *   1. TẢI DỮ LIỆU — Gọi API lấy thông tin khóa học, danh sách chương,
 *      các section và câu hỏi; lưu vào state `sections` + baseline để so sánh thay đổi.
 *   2. CHỈNH SỬA SECTION — Mentor chọn kỹ năng → chọn bài/section → sửa đề + câu hỏi
 *      trong `MentorQuestionBankBuilderPanel`; thay đổi lưu tạm trong state (chưa gửi API).
 *   3. LƯU SECTION — Bấm "Cập nhật section" → xác nhận (ConfirmDialog)
 *      → gọi `saveQuestionBankSection` → cập nhật baseline sau khi lưu thành công.
 *      (Dialog preview JSON payload: bật SHOW_SECTION_SAVE_JSON_PREVIEW_DIALOG)
 *
 * Workspace question bank — axios tại trang.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '@/shared/ui/Loading';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { toast } from '@/shared/ui/Toast';
import ScrollToTopButton from '@/shared/ui/ScrollToTopButton';
import MentorQuestionBankBuilderPanel from '@/features/mentor/components/questionBank/MentorQuestionBankBuilderPanel';
import MentorQuestionBankSectionSavePreviewDialog from '@/features/mentor/components/questionBank/MentorQuestionBankSectionSavePreviewDialog';
import MentorQuestionBankDetailHeader from '@/features/mentor/components/questionBank/MentorQuestionBankDetailHeader';
import MentorQuestionBankOutlinePanel from '@/features/mentor/components/questionBank/MentorQuestionBankOutlinePanel';
import MentorQuestionBankSkillNav from '@/features/mentor/components/questionBank/MentorQuestionBankSkillNav';
import {
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
  countActiveQuestionsBySkill,
  createQuestionBankSection,
  createQuestionBankSkillSections,
  getFilledQuestionCount,
  getSectionBaiNumber,
  getSectionsBySkill,
  getVisibleSectionsBySkill,
  attachInitialQuestionsToSection,
  finalizeSectionAfterFullQuestionRestore,
  normalizeQuestionBankSectionForSave,
  scrollToQuestionBankItem,
  validateQuestionBankSection,
  getQuestionBankSectionValidationToast,
  hasPendingPersistedQuestionDeletes,
  SECTION_USE_FOR_TEST_FILTER,
  countSectionsByUseForTest,
  filterSectionsByUseForTest,
  validateSectionUseForTestRule,
  SECTION_USE_FOR_TEST_REQUIRES_QUESTION_MESSAGE,
} from '@/features/mentor/utils/mentorTestContentUtils';
import {
  buildSectionBaselinesMap,
  buildSectionEditorSnapshot,
  buildSectionSourceBaselinesMap,
  buildSectionSourceSnapshot,
  buildQuestionBankSectionSavePayload,
  hasQuestionBankWorkspaceChanges,
  hasSectionUnsavedChanges,
  isQuestionBankDeleteOnlyPayload,
  shouldUploadReadingComposeText,
  applyInitialQuestionsBaseline,
  revertSectionToSavedBaseline,
  mapApiSectionToEditorSection,
  mergeQuestionsIntoSection,
  hydrateReadingSectionFromSourceUrl,
} from '@/features/mentor/utils/questionBankApiMappers';
import useQuestionBankSectionCommit from '@/features/mentor/hooks/useQuestionBankSectionCommit';
import { saveQuestionBankSection } from '@/features/mentor/services/questionBankService';
import { uploadTextMaterial } from '@/features/mentor/services/materialUploadService';
import { isHtmlContentEmpty } from '@/features/mentor/utils/mentorCourseContentUtils';
import { getChapterQuizConfig } from '@/features/mentor/services/chapterQuizConfigService';
import { validateListeningReadingPublishedSectionQuota, validateVocabularySectionQuestionQuota, isSkillSectionRandomPick } from '@/features/mentor/utils/mentorChapterQuizConfigUtils';
import { useNavigationGuard } from '@/context/NavigationGuardContext';

// URL gốc của backend API (lấy từ biến môi trường hoặc localhost mặc định)
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

/** Bật true để dùng dialog preview JSON payload (dev); mặc định dùng ConfirmDialog. */
const SHOW_SECTION_SAVE_JSON_PREVIEW_DIALOG = false;

export default function MentorQuestionBankManagePage() {
  const navigate = useNavigate();
  // Lấy courseId và pathId (chương) từ URL, ví dụ /mentor/question-banks/3/10
  const { courseId, pathId } = useParams();

  // ===== 1. KHAI BÁO STATE =====

  // loading: true khi đang tải dữ liệu ban đầu từ API
  const [loading, setLoading] = useState(true);
  // errors: lưu lỗi theo key (ví dụ pathId khi chọn chương không hợp lệ)
  const [errors, setErrors] = useState({});
  // course: thông tin khóa học (tên, trạng thái xuất bản, category...)
  const [course, setCourse] = useState(null);
  // coursePaths: danh sách tất cả chương (paths) của khóa học
  const [coursePaths, setCoursePaths] = useState([]);
  // sections: mảng tất cả section (bài) của 3 kỹ năng — state trung tâm của editor
  const [sections, setSections] = useState(() => createQuestionBankSkillSections());
  // sectionsRef: ref giữ giá trị sections mới nhất (dùng trong callback/async tránh stale closure)
  const sectionsRef = useRef(sections);
  // sectionBaselines: snapshot JSON của từng section đã lưu — dùng phát hiện thay đổi chưa lưu
  const [sectionBaselines, setSectionBaselines] = useState({});
  const sectionBaselinesRef = useRef(sectionBaselines);
  // initialSectionBaselines: baseline ban đầu khi tải trang (dùng khi khôi phục câu hỏi)
  const [initialSectionBaselines, setInitialSectionBaselines] = useState({});
  const initialSectionBaselinesRef = useRef(initialSectionBaselines);
  // sectionSourceBaselines: baseline URL nguồn (audio/reading) — tách riêng vì upload file
  const [sectionSourceBaselines, setSectionSourceBaselines] = useState({});
  const sectionSourceBaselinesRef = useRef(sectionSourceBaselines);
  // unsavedNavDialogOpen: hiện dialog cảnh báo khi rời trang có thay đổi chưa lưu
  const [unsavedNavDialogOpen, setUnsavedNavDialogOpen] = useState(false);
  // sectionSaveConfirmOpen: xác nhận lưu section (luồng mặc định)
  const [sectionSaveConfirmOpen, setSectionSaveConfirmOpen] = useState(false);
  // savePreviewOpen: mở dialog xem trước payload trước khi gửi API lưu
  const [savePreviewOpen, setSavePreviewOpen] = useState(false);
  // savePreviewPayload: object payload sẽ gửi lên server (insert/update/delete)
  const [savePreviewPayload, setSavePreviewPayload] = useState(null);
  // savePreviewReadingText: HTML bài đọc (Reading) hiển thị trong preview
  const [savePreviewReadingText, setSavePreviewReadingText] = useState(null);
  const savePayloadRef = useRef(null);
  const savePreviewReadingTextRef = useRef(null);

  const closeSectionSaveDialogs = () => {
    setSectionSaveConfirmOpen(false);
    setSavePreviewOpen(false);
    setSavePreviewReadingText(null);
    savePreviewReadingTextRef.current = null;
    savePayloadRef.current = null;
  };
  // confirmSaveInFlightRef: chặn double-click khi đang gọi API lưu
  const confirmSaveInFlightRef = useRef(false);
  // pendingNavigationRef: lưu hàm navigate chờ user xác nhận bỏ thay đổi
  const pendingNavigationRef = useRef(null);
  const requestNavigationRef = useRef(null);
  // registerNavigationGuard: đăng ký guard chặn chuyển route khi có thay đổi chưa lưu
  const { registerNavigationGuard } = useNavigationGuard() ?? {};
  // questionPathId: ID bản ghi Questions_Path trên DB (liên kết course + chapter)
  const [questionPathId, setQuestionPathId] = useState(null);
  // sectionErrors: lỗi validate theo tempId của section (hiển thị dưới form)
  const [sectionErrors, setSectionErrors] = useState({});
  // updatingSectionId: tempId section đang được lưu (hiện loading trên nút Lưu)
  const [updatingSectionId, setUpdatingSectionId] = useState('');
  // activeSkill: kỹ năng đang chọn (LISTENING | READING | VOCABULARY)
  const [activeSkill, setActiveSkill] = useState(TEST_SKILL_LISTENING);
  // activeSectionId: tempId của section (bài) đang được chỉnh sửa
  const [activeSectionId, setActiveSectionId] = useState('');
  // sectionUseForTestFilter: bộ lọc section theo "dùng trong test" hay không
  const [sectionUseForTestFilter, setSectionUseForTestFilter] = useState(
    SECTION_USE_FOR_TEST_FILTER.ALL,
  );
  // chapterQuizConfig: cấu hình quiz của chương (quota số section/câu hỏi trong test)
  const [chapterQuizConfig, setChapterQuizConfig] = useState(null);
  // Hook quản lý flush editor + chặn navigate khi đang upload file
  const {
    bindSectionControls,
    flushActiveSection,
    isActiveSectionBusy,
    prepareSectionNavigation,
  } = useQuestionBankSectionCommit();

  // ===== 2. ĐỒNG BỘ REF VỚI STATE =====
  // Mỗi khi state thay đổi, cập nhật ref tương ứng để callback async luôn đọc giá trị mới nhất

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    sectionBaselinesRef.current = sectionBaselines;
  }, [sectionBaselines]);

  useEffect(() => {
    initialSectionBaselinesRef.current = initialSectionBaselines;
  }, [initialSectionBaselines]);

  useEffect(() => {
    sectionSourceBaselinesRef.current = sectionSourceBaselines;
  }, [sectionSourceBaselines]);

  // ===== 3. TẢI DỮ LIỆU BAN ĐẦU (useEffect chính) =====
  // Chạy khi courseId hoặc pathId thay đổi (vào trang hoặc đổi chương).
  // Gọi song song 4 API: khóa học, danh sách chương, sections, cấu hình quiz.
  // Sau đó tải câu hỏi từng section và hydrate nội dung Reading từ Cloudinary.

  useEffect(() => {
    if (!courseId || !pathId) return undefined;

    let cancelled = false; // cờ hủy request nếu component unmount hoặc đổi params

    (async () => {
      setLoading(true);
      try {
        // Gọi 4 API song song để tải nhanh hơn
        const [resCourse, resPaths, resSections, resQuizConfig] = await Promise.all([
          axios.get(`${API_BASE}/api/courses/my-courses/${courseId}`, { params: { tab: 'course' } }),
          axios.get(`${API_BASE}/api/courses/my-courses/${courseId}/chapters`),
          axios.get(`${API_BASE}/api/question-bank/courses/${courseId}/paths/${pathId}/sections`),
          getChapterQuizConfig(courseId, pathId),
        ]);

        if (cancelled) return;

        setCourse(resCourse.data?.data?.[0] ?? null);
        setCoursePaths(resPaths.data?.data?.Paths ?? []);
        setChapterQuizConfig(resQuizConfig?.ok ? resQuizConfig.config ?? null : null);

        const sectionPayload = resSections.data;
        if (sectionPayload?.success === false) {
          toast.error(sectionPayload.message ?? 'Không tải được danh sách section.');
          setSections(createQuestionBankSkillSections());
          return;
        }

        // Map dữ liệu API → format editor, sắp xếp theo order
        let mappedSections = (sectionPayload?.data?.sections ?? [])
          .slice()
          .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
          .map(mapApiSectionToEditorSection);
        if (mappedSections.length === 0) {
          mappedSections = createQuestionBankSkillSections();
        }

        // Tải câu hỏi cho từng section đã có SectionId trên DB
        const sectionsWithQuestions = (
          await Promise.all(
            mappedSections.map(async (section) => {
              if (!section.SectionId) return section;
              const { data } = await axios.get(
                `${API_BASE}/api/question-bank/sections/${section.SectionId}/questions`,
                { params: { courseId, pathId } },
              );
              if (data?.success === false) return section;
              return mergeQuestionsIntoSection(section, data?.data?.questions ?? []);
            }),
          )
        ).map(attachInitialQuestionsToSection);

        // Với Reading: tải HTML bài đọc từ MaterialUrl nếu Description còn trống
        const hydratedSections = await Promise.all(
          sectionsWithQuestions.map((section) => hydrateReadingSectionFromSourceUrl(section)),
        );

        if (cancelled) return;

        // Lưu state và tạo baseline ban đầu để so sánh thay đổi sau này
        setQuestionPathId(sectionPayload?.data?.questionPathId ?? null);
        const baselines = buildSectionBaselinesMap(hydratedSections);
        setSections(hydratedSections);
        sectionsRef.current = hydratedSections;
        setSectionBaselines(baselines);
        setInitialSectionBaselines(baselines);
        setSectionSourceBaselines(buildSectionSourceBaselinesMap(hydratedSections));
        setSectionErrors({});

        // Tự chọn section Listening đầu tiên (hoặc section đầu tiên nếu không có Listening)
        const firstSection =
          getSectionsBySkill(hydratedSections, TEST_SKILL_LISTENING)[0]
          ?? hydratedSections[0];

        if (firstSection) {
          setActiveSkill(firstSection.SkillType);
          setActiveSectionId(firstSection.tempId);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error(error.response?.data?.message ?? 'Không tải được dữ liệu ngân hàng câu hỏi.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, pathId]);

  // ===== 4. HYDRATE NỘI DUNG READING KHI CHUYỂN SANG KỸ NĂNG READING =====
  // Khi user chọn tab Reading, tải HTML từ Cloudinary cho các section có MaterialUrl nhưng chưa có Description

  useEffect(() => {
    if (activeSkill !== TEST_SKILL_READING) return undefined;

    let cancelled = false;

    (async () => {
      const readingSections = getSectionsBySkill(sectionsRef.current, TEST_SKILL_READING);
      const pending = readingSections.filter(
        (section) =>
          String(section.MaterialUrl ?? '').trim() && isHtmlContentEmpty(section.Description),
      );
      if (pending.length === 0) return;

      const hydrated = await Promise.all(
        pending.map((section) => hydrateReadingSectionFromSourceUrl(section)),
      );
      if (cancelled) return;

      const hydratedByTempId = Object.fromEntries(
        pending.map((section, index) => [section.tempId, hydrated[index]]),
      );
      const changed = pending.some((section, index) => hydrated[index] !== section);
      if (!changed) return;

      const nextSections = sectionsRef.current.map(
        (section) => hydratedByTempId[section.tempId] ?? section,
      );
      sectionsRef.current = nextSections;
      setSections(nextSections);

      setSectionBaselines((prev) => {
        const nextBaselines = { ...prev };
        pending.forEach((section, index) => {
          const updated = hydrated[index];
          if (updated !== section) {
            nextBaselines[section.tempId] = buildSectionEditorSnapshot(updated);
          }
        });
        return nextBaselines;
      });
      setInitialSectionBaselines((prev) => {
        const nextBaselines = { ...prev };
        pending.forEach((section, index) => {
          const updated = hydrated[index];
          if (updated !== section) {
            nextBaselines[section.tempId] = buildSectionEditorSnapshot(updated);
          }
        });
        return nextBaselines;
      });
      setSectionSourceBaselines((prev) => {
        const nextBaselines = { ...prev };
        pending.forEach((section, index) => {
          const updated = hydrated[index];
          if (updated !== section) {
            const snapshot = buildSectionSourceSnapshot(updated);
            if (snapshot != null) {
              nextBaselines[section.tempId] = snapshot;
            }
          }
        });
        return nextBaselines;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSkill]);

  // ===== 5. DERIVED STATE (useMemo & biến tính toán) =====
  // Các giá trị phụ thuộc sections/activeSkill — không cần state riêng

  // Danh sách section của kỹ năng đang chọn (chưa lọc useForTest)
  const skillSectionsAll = useMemo(
    () => getVisibleSectionsBySkill(sections, activeSkill),
    [sections, activeSkill],
  );

  // Danh sách section sau khi lọc theo "dùng trong test"
  const skillSections = useMemo(
    () => filterSectionsByUseForTest(skillSectionsAll, sectionUseForTestFilter),
    [skillSectionsAll, sectionUseForTestFilter],
  );

  // Đếm số section trong từng nhóm lọc (tất cả / trong test / không trong test)
  const sectionUseForTestCounts = useMemo(
    () => countSectionsByUseForTest(skillSectionsAll),
    [skillSectionsAll],
  );

  // Tự chọn section đầu tiên nếu section hiện tại không còn trong danh sách đã lọc
  useEffect(() => {
    if (skillSections.length === 0) return;
    if (!skillSections.some((section) => section.tempId === activeSectionId)) {
      setActiveSectionId(skillSections[0].tempId);
    }
  }, [skillSections, activeSectionId]);

  const visibleSections = sections;

  // Section đang active (đang được chỉnh sửa trong builder panel)
  const activeSection = useMemo(() => {
    const picked = sections.find((s) => s.tempId === activeSectionId);
    if (picked?.SkillType === activeSkill) return picked;
    return skillSections[0] ?? null;
  }, [sections, activeSkill, activeSectionId, skillSections]);

  // Số thứ tự bài (Bài 1, Bài 2...) trong kỹ năng hiện tại
  const activeSectionIndex = activeSection
    ? getSectionBaiNumber(activeSection, visibleSections) - 1
    : 0;

  // Thông tin hiển thị header: chương đang chọn, tên khóa học, tổng câu hỏi...
  const selectedPath = coursePaths.find((item) => String(item.PathId) === String(pathId));
  const bankTitle = selectedPath?.PathName?.trim() ?? `Path #${pathId}`;
  const courseCategory = [course?.CategoryDisplayName, course?.LevelDisplayName].filter(Boolean).join(' · ');
  const questionCount = getFilledQuestionCount(visibleSections);
  const questionCountBySkill = countActiveQuestionsBySkill(visibleSections);
  // Kiểm tra section active có thay đổi chưa lưu không
  const activeSectionUnsaved = activeSection
    ? hasSectionUnsavedChanges(activeSection, sectionBaselines, sectionSourceBaselines)
    : false;
  const hasPendingQuestionDeletes = activeSection
    ? hasPendingPersistedQuestionDeletes(activeSection)
    : false;
  const canSaveSection = hasPendingQuestionDeletes
    || (activeSectionUnsaved && Boolean(activeSection));
  const activeSectionDirty = canSaveSection;

  // ===== 6. HANDLERS — CẬP NHẬT SECTION TRONG STATE =====

  // Trigger: user sửa nội dung section trong MentorTestSectionCard
  // Làm gì: thay section tương ứng trong mảng sections; xóa lỗi validate nếu có
  const handleSectionChange = (tempId, nextSection) => {
    const next = sectionsRef.current.map((s) => (s.tempId === tempId ? nextSection : s));
    sectionsRef.current = next;
    setSections(next);
    if (sectionErrors[tempId]) {
      setSectionErrors((prev) => ({ ...prev, [tempId]: undefined }));
    }
  };

  // Trigger: khôi phục hết câu hỏi đã xóa trong section
  // Kết quả: cập nhật baseline câu hỏi ban đầu
  const handleQuestionsFullyRestored = (tempId, nextSection) => {
    const finalized = finalizeSectionAfterFullQuestionRestore(nextSection);
    handleSectionChange(tempId, finalized);
    setSectionBaselines((prev) =>
      applyInitialQuestionsBaseline(finalized, prev, initialSectionBaselinesRef.current),
    );
  };

  // Tạo baseline cho section mới thêm (chưa có trong sectionBaselines)
  const appendSectionBaselines = (nextSections) => {
    const missing = nextSections.filter((s) => s?.tempId);
    setSectionBaselines((prev) => {
      const additions = buildSectionBaselinesMap(missing.filter((s) => prev[s.tempId] == null));
      if (Object.keys(additions).length > 0) {
        setInitialSectionBaselines((initialPrev) => ({ ...initialPrev, ...additions }));
      }
      return { ...prev, ...additions };
    });
    setSectionSourceBaselines((prev) => ({
      ...prev,
      ...buildSectionSourceBaselinesMap(missing.filter((s) => prev[s.tempId] == null)),
    }));
  };

  // Hoàn tác mọi thay đổi chưa lưu của section đang active — trả về baseline đã lưu
  const revertActiveSectionChanges = () => {
    const section = sectionsRef.current.find((s) => s.tempId === activeSectionId);
    if (!section) return;

    const reverted = revertSectionToSavedBaseline(
      section,
      sectionBaselinesRef.current,
      sectionSourceBaselinesRef.current,
    );
    const next = sectionsRef.current.map((s) => (s.tempId === section.tempId ? reverted : s));
    sectionsRef.current = next;
    setSections(next);
    setSectionErrors((prev) => ({ ...prev, [section.tempId]: undefined }));
  };

  // ===== 7. HANDLERS — NAVIGATION GUARD (chặn rời trang khi chưa lưu) =====

  // Trigger: user muốn chuyển skill/section/chương hoặc quay lại
  // Làm gì: nếu có thay đổi chưa lưu → hiện dialog; nếu không → navigate ngay
  const requestNavigation = (navigateFn) => {
    const section = sectionsRef.current.find((s) => s.tempId === activeSectionId) ?? activeSection;
    if (!prepareSectionNavigation(section)) return;

    const isDirty = hasQuestionBankWorkspaceChanges(
      sectionsRef.current,
      section,
      sectionBaselinesRef.current,
      sectionSourceBaselinesRef.current,
    );

    if (isDirty) {
      pendingNavigationRef.current = navigateFn;
      setUnsavedNavDialogOpen(true);
      return;
    }

    navigateFn();
  };

  // User bấm Hủy trên dialog → giữ nguyên trang, tiếp tục chỉnh sửa
  const handleUnsavedNavCancel = () => {
    pendingNavigationRef.current = null;
    setUnsavedNavDialogOpen(false);
  };

  // User bấm Tiếp tục → hoàn tác thay đổi section active rồi thực hiện navigate
  const handleUnsavedNavContinue = () => {
    const navigateFn = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setUnsavedNavDialogOpen(false);
    revertActiveSectionChanges();
    navigateFn?.();
  };

  // Wrapper: mọi navigation đều đi qua requestNavigation để kiểm tra unsaved changes
  const withSavedSection = (navigateFn) => {
    requestNavigation(navigateFn);
  };

  requestNavigationRef.current = requestNavigation;

  // Tạo section mới với sectionOrder tiếp theo trong cùng kỹ năng
  const createSectionWithNextOrder = (skill, currentSections = []) => {
    const newSection = attachInitialQuestionsToSection(createQuestionBankSection(skill));
    const maxOrder = currentSections
      .filter((section) => section.SkillType === skill)
      .reduce((max, section) => Math.max(max, Number(section.sectionOrder) || 0), 0);
    return {
      ...newSection,
      sectionOrder: maxOrder + 1,
    };
  };

  // Đăng ký navigation guard toàn app (chặn click link sidebar khi có thay đổi chưa lưu)
  useEffect(() => {
    if (!registerNavigationGuard) return undefined;
    return registerNavigationGuard((navigateFn) => {
      requestNavigationRef.current?.(navigateFn);
    });
  }, [registerNavigationGuard]);

  // ===== 8. HANDLERS — LƯU SECTION (SAVE FLOW) =====

  // Trigger: bấm nút "Cập nhật section" trên BuilderPanel
  // Làm gì: flush editor → kiểm tra thay đổi → build payload → xác nhận lưu
  const handleUpdateSection = () => {
    if (!activeSection) return;

    flushActiveSection();

    const section = sectionsRef.current.find((s) => s.tempId === activeSection.tempId) ?? activeSection;
    if (isActiveSectionBusy(section)) {
      toast.warning('Đang tải file lên, vui lòng đợi hoàn tất.');
      return;
    }

    const hasActiveChanges = hasSectionUnsavedChanges(
      section,
      sectionBaselinesRef.current,
      sectionSourceBaselinesRef.current,
    );
    if (!hasActiveChanges) {
      toast.info('Không có thay đổi để lưu.');
      return;
    }

    const sectionOrder = getSectionBaiNumber(section, visibleSections);
    const previewPayload = buildQuestionBankSectionSavePayload(
      section,
      {
        courseId,
        pathId,
        questionPathId,
        sectionOrder,
      },
      sectionBaselinesRef.current,
      sectionSourceBaselinesRef.current,
    );

    savePayloadRef.current = previewPayload;
    const readingHtml = section.SkillType === TEST_SKILL_READING
      ? String(section.Description ?? '')
      : null;
    savePreviewReadingTextRef.current = readingHtml;
    setSavePreviewPayload(previewPayload);
    setSavePreviewReadingText(readingHtml);

    if (SHOW_SECTION_SAVE_JSON_PREVIEW_DIALOG) {
      setSavePreviewOpen(true);
    } else {
      setSectionSaveConfirmOpen(true);
    }
  };

  const handleSectionSaveConfirmClose = () => {
    if (updatingSectionId) return;
    setSectionSaveConfirmOpen(false);
    savePayloadRef.current = null;
    savePreviewReadingTextRef.current = null;
  };

  const handleSectionSaveConfirm = () => {
    handleConfirmSaveSection();
  };

  // Đóng dialog preview (không lưu) — chỉ khi không đang gọi API
  const handleSavePreviewClose = () => {
    if (updatingSectionId) return;
    closeSectionSaveDialogs();
  };

  // Trigger: bấm "Lưu thay đổi" trên dialog preview
  // Luồng: validate → upload Reading HTML nếu cần → gọi saveQuestionBankSection → cập nhật baseline + state
  const handleConfirmSaveSection = async () => {
    if (confirmSaveInFlightRef.current) return;

    flushActiveSection();

    const section = sectionsRef.current.find((s) => s.tempId === activeSectionId) ?? activeSection;
    if (!section) return;

    const useForTestError = validateSectionUseForTestRule(section);
    if (useForTestError.isUseForTest) {
      setSectionErrors((prev) => ({
        ...prev,
        [section.tempId]: {
          ...(prev[section.tempId] ?? {}),
          isUseForTest: useForTestError.isUseForTest,
        },
      }));
      toast.error(SECTION_USE_FOR_TEST_REQUIRES_QUESTION_MESSAGE);
      setSectionSaveConfirmOpen(false);
      return;
    }

    if (isSkillSectionRandomPick(section.SkillType)) {
      const quotaError = validateListeningReadingPublishedSectionQuota(
        sectionsRef.current,
        section.SkillType,
        chapterQuizConfig,
      );
      if (quotaError.isUseForTest) {
        setSectionErrors((prev) => ({
          ...prev,
          [section.tempId]: {
            ...(prev[section.tempId] ?? {}),
            isUseForTest: quotaError.isUseForTest,
          },
        }));
        toast.error(quotaError.isUseForTest);
        closeSectionSaveDialogs();
        return;
      }
    }

    if (section.SkillType === TEST_SKILL_VOCABULARY) {
      const vocabQuotaError = validateVocabularySectionQuestionQuota(section, chapterQuizConfig);
      if (vocabQuotaError.isUseForTest || vocabQuotaError._questions) {
        setSectionErrors((prev) => ({
          ...prev,
          [section.tempId]: {
            ...(prev[section.tempId] ?? {}),
            ...vocabQuotaError,
          },
        }));
        toast.error(vocabQuotaError.isUseForTest ?? vocabQuotaError._questions);
        closeSectionSaveDialogs();
        return;
      }
    }

    const normalized = normalizeQuestionBankSectionForSave(section);
    const previewPayload = savePayloadRef.current ?? buildQuestionBankSectionSavePayload(
      section,
      {
        courseId,
        pathId,
        questionPathId,
        sectionOrder: getSectionBaiNumber(section, visibleSections),
      },
      sectionBaselinesRef.current,
      sectionSourceBaselinesRef.current,
    );
    const deleteQuestionsOnly = isQuestionBankDeleteOnlyPayload(previewPayload);

    if (!deleteQuestionsOnly) {
      const errors = validateQuestionBankSection(normalized, {
        forSave: true,
        allSections: sectionsRef.current,
      });
      if (Object.keys(errors).length > 0) {
        setSectionErrors((prev) => ({ ...prev, [section.tempId]: errors }));
        const validationToast = getQuestionBankSectionValidationToast(errors, section);
        if (validationToast) toast.error(validationToast);
        closeSectionSaveDialogs();
        return;
      }
    }

    confirmSaveInFlightRef.current = true;
    setUpdatingSectionId(section.tempId);

    try {
      const sectionOrder = getSectionBaiNumber(section, visibleSections);
      let uploadedReadingSourceUrl = null;

      if (shouldUploadReadingComposeText(section, sectionSourceBaselinesRef.current)) {
        const html = String(
          section.Description ?? savePreviewReadingTextRef.current ?? '',
        );
        try {
          const uploaded = await uploadTextMaterial({
            html,
            title: String(section.SectionTitle ?? section.DisplayName ?? 'question-bank-reading').trim()
              || 'question-bank-reading',
          });
          uploadedReadingSourceUrl = String(uploaded.url ?? '').trim() || null;
          if (!uploadedReadingSourceUrl) {
            toast.error('Không thể tải nội dung văn bản lên Cloudinary.');
            return;
          }
        } catch (error) {
          console.error(error);
          toast.error(error.message ?? 'Không thể tải nội dung văn bản lên Cloudinary.');
          return;
        }
      }

      const savePayload = buildQuestionBankSectionSavePayload(
        section,
        {
          courseId,
          pathId,
          questionPathId,
          sectionOrder,
        },
        sectionBaselinesRef.current,
        sectionSourceBaselinesRef.current,
        { uploadedReadingSourceUrl },
      );
      savePayloadRef.current = savePayload;

      const normalized = normalizeQuestionBankSectionForSave(section);
      const hasSectionSaveOps =
        savePayload.sectionInsert
        || savePayload.sectionUpdate
        || savePayload.sectionSourceUpdate
        || (savePayload.questionsInsert?.length ?? 0) > 0
        || (savePayload.questionsUpdate?.length ?? 0) > 0
        || (savePayload.questionsDelete?.length ?? 0) > 0;

      let result = {
        ok: true,
        sectionId: section.SectionId ?? null,
        questionIdMap: [],
        message: 'Đã lưu thay đổi.',
      };

      if (hasSectionSaveOps) {
        result = await saveQuestionBankSection(savePayload);
        if (!result.ok) {
          toast.error(result.message ?? 'Không thể cập nhật section.');
          return;
        }
      }

      if (!hasSectionSaveOps) {
        closeSectionSaveDialogs();
        toast.success(result.message ?? 'Đã lưu thay đổi.');
        return;
      }

      if (result.sectionId && !section.SectionId) {
        const next = sectionsRef.current.map((s) =>
          s.tempId === section.tempId ? { ...s, SectionId: result.sectionId } : s,
        );
        sectionsRef.current = next;
        setSections(next);
      }

      if (result.questionPathId) {
        setQuestionPathId(result.questionPathId);
      }

      const questionIdByRef = Object.fromEntries(
        (result.questionIdMap ?? []).map((item) => [item.clientRef, item.questionId]),
      );
      const choiceIdByRef = Object.fromEntries(
        (result.choiceIdMap ?? [])
          .filter((item) => item?.clientRef && item?.choiceId)
          .map((item) => [item.clientRef, item.choiceId]),
      );
      const questionsWithIds = (normalized.Questions ?? []).map((question) => {
        const nextQuestion = question.QuestionId
          ? question
          : { ...question, QuestionId: questionIdByRef[question.tempId] ?? null };
        return {
          ...nextQuestion,
          Options: (nextQuestion.Options ?? []).map((option) =>
            option.ChoiceId
              ? option
              : { ...option, ChoiceId: choiceIdByRef[option.tempId] ?? option.ChoiceId ?? null },
          ),
        };
      });

      const clearedDeleted = sectionsRef.current.map((s) => {
        if (s.tempId !== section.tempId) return s;
        const withQuestions = attachInitialQuestionsToSection({
          ...s,
          Questions: questionsWithIds,
          DeletedQuestions: [],
        });
        if (result.sourceUrl == null) return withQuestions;
        if (withQuestions.SkillType === TEST_SKILL_LISTENING) {
          return { ...withQuestions, AudioUrl: result.sourceUrl };
        }
        if (withQuestions.SkillType === TEST_SKILL_READING) {
          return { ...withQuestions, MaterialUrl: result.sourceUrl };
        }
        return withQuestions;
      });
      sectionsRef.current = clearedDeleted;
      setSections(clearedDeleted);

      const sectionForBaseline = {
        ...normalized,
        SectionId: result.sectionId ?? normalized.SectionId ?? null,
        Questions: questionsWithIds,
        ...(result.sourceUrl != null && normalized.SkillType === TEST_SKILL_LISTENING
          ? { AudioUrl: result.sourceUrl }
          : {}),
        ...(result.sourceUrl != null && normalized.SkillType === TEST_SKILL_READING
          ? { MaterialUrl: result.sourceUrl }
          : {}),
      };
      const snapshot = buildSectionEditorSnapshot(sectionForBaseline);
      setSectionBaselines((prev) => ({
        ...prev,
        [section.tempId]: snapshot,
      }));
      setInitialSectionBaselines((prev) => ({
        ...prev,
        [section.tempId]: snapshot,
      }));
      const sourceSnapshot = buildSectionSourceSnapshot(sectionForBaseline);
      if (sourceSnapshot != null) {
        setSectionSourceBaselines((prev) => ({
          ...prev,
          [section.tempId]: sourceSnapshot,
        }));
      }
      setSectionErrors((prev) => ({ ...prev, [section.tempId]: undefined }));
      closeSectionSaveDialogs();
      toast.success(result.message ?? 'Đã cập nhật section.');
    } finally {
      confirmSaveInFlightRef.current = false;
      setUpdatingSectionId('');
    }
  };

  // ===== 9. HANDLERS — CHUYỂN KỸ NĂNG / SECTION / CHƯƠNG =====

  // Trigger: click tab kỹ năng bên trái (Listening/Reading/Vocabulary)
  const handleSkillSelect = (skill) => {
    if (skill === activeSkill) return;
    withSavedSection(() => {
      setActiveSkill(skill);
      const existing = getSectionsBySkill(sectionsRef.current, skill)[0];
      if (existing) {
        setActiveSectionId(existing.tempId);
        return;
      }
      const newSection = createSectionWithNextOrder(skill, sectionsRef.current);
      const nextSections = [...sectionsRef.current, newSection];
      sectionsRef.current = nextSections;
      setSections(nextSections);
      appendSectionBaselines([newSection]);
      setActiveSectionId(newSection.tempId);
    });
  };

  // Trigger: click tab bài (Bài 1, Bài 2...) trên BuilderPanel
  const handleSectionSelect = (tempId) => {
    if (tempId === activeSectionId) return;
    withSavedSection(() => {
      const section = sectionsRef.current.find((item) => item.tempId === tempId);
      if (!section) return;
      setActiveSkill(section.SkillType);
      setActiveSectionId(tempId);
    });
  };

  // Trigger: bấm "Thêm bài" / "Thêm nhóm câu hỏi"
  const handleAddBai = () => {
    withSavedSection(() => {
      const newSection = createSectionWithNextOrder(activeSkill, sectionsRef.current);
      const skillIndexes = sectionsRef.current
        .map((section, index) => ({ section, index }))
        .filter(({ section }) => section.SkillType === activeSkill)
        .map(({ index }) => index);
      const nextSections = [...sectionsRef.current];
      if (skillIndexes.length > 0) {
        const lastSkillIndex = skillIndexes[skillIndexes.length - 1];
        nextSections.splice(lastSkillIndex + 1, 0, newSection);
      } else {
        nextSections.push(newSection);
      }
      sectionsRef.current = nextSections;
      setSections(nextSections);
      appendSectionBaselines([newSection]);
      setActiveSectionId(newSection.tempId);
    });
  };

  // Trigger: click mục trong mục lục bên phải (OutlinePanel) — nhảy tới skill/section/câu hỏi
  const handleOutlineNavigate = (target) => {
    const isSameSection = target.sectionTempId && target.sectionTempId === activeSectionId;
    const isSameSkillOnly = !target.sectionTempId && target.skill === activeSkill;

    const navigate = () => {
      if (target.sectionTempId) {
        const section = sectionsRef.current.find((item) => item.tempId === target.sectionTempId);
        if (section) {
          setActiveSkill(section.SkillType);
          setActiveSectionId(target.sectionTempId);
        }
      } else if (target.skill) {
        setActiveSkill(target.skill);
        const existing = getSectionsBySkill(sectionsRef.current, target.skill)[0];
        if (existing) {
          setActiveSectionId(existing.tempId);
        } else {
          const newSection = createSectionWithNextOrder(target.skill, sectionsRef.current);
          const nextSections = [...sectionsRef.current, newSection];
          sectionsRef.current = nextSections;
          setSections(nextSections);
          appendSectionBaselines([newSection]);
          setActiveSectionId(newSection.tempId);
        }
      }
      scrollToQuestionBankItem(target);
    };

    if (isSameSection || isSameSkillOnly) {
      scrollToQuestionBankItem(target);
      return;
    }

    withSavedSection(navigate);
  };

  // Trigger: chọn chương khác từ OutlinePanel → đổi URL pathId
  const handlePathSelect = (nextPathId) => {
    if (String(nextPathId) === String(pathId)) return;
    withSavedSection(() => {
      setErrors((prev) => ({ ...prev, pathId: undefined }));
      navigate(`/mentor/question-banks/${courseId}/${nextPathId}`, { replace: true });
    });
  };

  // Trigger: bấm "Quay lại" trên header → về trang danh sách chương của khóa học
  const handleBack = () => {
    withSavedSection(() => navigate(`/mentor/question-banks/${courseId}`));
  };

  // ===== 10. RENDER =====

  // Thiếu params URL → hiện thông báo hướng dẫn
  if (!courseId || !pathId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', color: '#64748B' }}>
        Thiếu courseId hoặc pathId. Ví dụ: /mentor/question-banks/3/10
      </Box>
    );
  }

  if (loading) return <Loading />;

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', lg: 1520 }, mx: 'auto' }}>
      {/* Phần header: breadcrumb, tên chương, tổng câu hỏi, nút quay lại */}
      <MentorQuestionBankDetailHeader
        isCreateMode
        breadcrumbMode="coursePath"
        bankTitle={bankTitle}
        courseId={courseId}
        courseName={course?.CourseName ?? `Khóa học #${courseId}`}
        coursePublished={Boolean(course?.IsPublished)}
        totalQuestionCount={questionCount}
        questionCountBySkill={questionCountBySkill}
        onBack={handleBack}
        onNavigateRequest={requestNavigation}
      />

      {/* Layout 3 cột: SkillNav (trái) | BuilderPanel + OutlinePanel (giữa/phải) */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, lg: 2.5 },
          alignItems: 'start',
        }}
      >
        {/* Cột trái: tab chọn kỹ năng Listening / Reading / Vocabulary */}
        <MentorQuestionBankSkillNav
          sections={visibleSections}
          activeSkill={activeSkill}
          sectionErrors={sectionErrors}
          chapterQuizConfig={chapterQuizConfig}
          onSkillChange={handleSkillSelect}
        />

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(280px, 3fr)' },
            gap: { xs: 2, lg: 2.5 },
            alignItems: 'start',
          }}
        >
          {/* Cột giữa: editor section + câu hỏi */}
          {/*_________________Phần ở giữa gồm các câu hỏi theo section_______________*/}
          <MentorQuestionBankBuilderPanel
            sections={sections}
            activeSkill={activeSkill}
            activeSection={activeSection}
            activeSectionIndex={activeSectionIndex}
            activeSectionId={activeSectionId}
            skillSections={skillSections}
            skillSectionsAllCount={skillSectionsAll.length}
            sectionUseForTestFilter={sectionUseForTestFilter}
            sectionUseForTestCounts={sectionUseForTestCounts}
            onSectionUseForTestFilterChange={setSectionUseForTestFilter}
            sectionErrors={sectionErrors}
            sectionBaselines={sectionBaselines}
            sectionSourceBaselines={sectionSourceBaselines}
            activeSectionDirty={activeSectionDirty}
            updatingSection={updatingSectionId === activeSectionId}
            questionCount={questionCount}
            coursePublished={Boolean(course?.IsPublished)}
            chapterQuizConfig={chapterQuizConfig}
            onSectionSelect={handleSectionSelect}
            onAddBai={handleAddBai}
            onSectionChange={handleSectionChange}
            onQuestionsFullyRestored={handleQuestionsFullyRestored}
            onUpdateSection={handleUpdateSection}
            onRegisterSectionControls={bindSectionControls}
          />

          {/* Cột phải: mục lục nội dung + danh sách chương */}
          <MentorQuestionBankOutlinePanel
            sections={visibleSections}
            activeSkill={activeSkill}
            activeSectionId={activeSectionId}
            sectionUseForTestFilter={sectionUseForTestFilter}
            onNavigateToItem={handleOutlineNavigate}
            courseName={course?.CourseName ?? `Khóa học #${courseId}`}
            courseCategory={courseCategory}
            chapterTitle={selectedPath?.PathName}
            courseChapters={coursePaths}
            selectedChapterId={pathId}
            chapterError={errors.pathId}
            courseId={courseId}
            chapterQuizConfig={chapterQuizConfig}
            onChapterSelect={handlePathSelect}
          />
        </Box>
      </Box>

      <ScrollToTopButton avoidSelectors={['#app-site-footer']} />

      {/* Dialog cảnh báo khi rời trang có thay đổi chưa lưu */}
      <ConfirmDialog
        open={unsavedNavDialogOpen}
        onClose={handleUnsavedNavCancel}
        onConfirm={handleUnsavedNavContinue}
        title="Thay đổi chưa được lưu"
        message="Nếu bạn chuyển sang mục khác, các sự thay đổi sẽ không được lưu. Bạn có muốn tiếp tục?"
        confirmLabel="Tiếp tục"
        cancelLabel="Hủy"
      />

      <ConfirmDialog
        open={sectionSaveConfirmOpen}
        onClose={handleSectionSaveConfirmClose}
        onConfirm={handleSectionSaveConfirm}
        title="Cập nhật section"
        message={
          activeSection
            ? `Lưu thay đổi cho section "${String(
                activeSection.SectionTitle || activeSection.DisplayName || 'hiện tại',
              ).trim()}"?`
            : 'Lưu thay đổi cho section hiện tại?'
        }
        confirmLabel="Lưu thay đổi"
        cancelLabel="Hủy"
        loading={Boolean(updatingSectionId)}
      />

      {/* Dialog xem trước payload API (JSON) — giữ cho dev: SHOW_SECTION_SAVE_JSON_PREVIEW_DIALOG */}
      {SHOW_SECTION_SAVE_JSON_PREVIEW_DIALOG ? (
        <MentorQuestionBankSectionSavePreviewDialog
          open={savePreviewOpen}
          payload={savePreviewPayload}
          readingTextHtml={savePreviewReadingText}
          loading={Boolean(updatingSectionId)}
          onClose={handleSavePreviewClose}
          onConfirm={handleConfirmSaveSection}
        />
      ) : null}
    </Box>
  );
}
