# Outline slide bảo vệ SWP391 — S.T.A.R Learning Path

**Thời lượng mục tiêu:** 15–20 phút trình bày + 5–10 phút demo + Q&A  
**Điểm nhấn:** Hệ thống e-learning + ngân hàng câu hỏi + **thuật toán đề xuất bài kiểm tra retake**

---

## Phân bổ thời gian đề xuất

| Phần | Thời gian | Slide |
|------|-----------|-------|
| Mở đầu & bài toán | 3 phút | 1–3 |
| Hệ thống & kiến trúc | 4 phút | 4–7 |
| Luồng nghiệp vụ test | 3 phút | 8–10 |
| Thuật toán đề xuất | 6 phút | 11–15 |
| Kiểm chứng & kết luận | 3 phút | 16–18 |
| Demo (riêng) | 5 phút | xem `DEMO_RETAKE_SCRIPT.md` |
| Q&A | 5–10 phút | — |

---

## Slide 1 — Trang bìa (~30 giây)

**Tiêu đề:** S.T.A.R Learning Path — Nền tảng học trực tuyến với bài kiểm tra thích ứng theo kết quả học tập

**Nội dung slide:**
- Tên đồ án, môn SWP391, FPT University
- Nhóm 5 thành viên (MSSV)
- GVHD (nếu có)

**Lời nói mẫu:**
> Em/chúng em xin trình bày đồ án xây dựng nền tảng e-learning theo lộ trình, trong đó phần nổi bật là module kiểm tra cuối khóa có thuật toán điều chỉnh cấu hình đề khi học viên làm lại dựa trên thống kê sai theo chương.

---

## Slide 2 — Bài toán thực tế (~1,5 phút)

**Tiêu đề:** Vì sao cần hệ thống này?

**Bullet:**
- Khóa học online cần lộ trình rõ ràng: khóa → chương → bài → học liệu
- Mentor cần công cụ tạo nội dung, ngân hàng câu hỏi, cấu hình bài test
- Học viên làm test nhiều lần — **đề random thuần không phản ánh điểm yếu theo chương**
- Cần cơ chế: mentor giữ quyền kiểm soát (trần config), hệ thống **điều chỉnh retake** theo kết quả

**Hình gợi ý:** Sơ đồ 3 vai trò Student / Mentor / Admin

**Lời nói mẫu:**
> Bài toán không phải chỉ “làm web học online”, mà là làm sao vừa cho mentor kiểm soát chất lượng đề, vừa giúp học viên lần làm sau tập trung hơn vào chương làm kém.

---

## Slide 3 — Mục tiêu & phạm vi (~1 phút)

**Tiêu đề:** Mục tiêu đồ án

**Mục tiêu chính:**
1. Xây dựng nền tảng học 3 role (Student, Mentor, Admin)
2. Module ngân hàng câu hỏi IELTS-style (Nghe / Đọc / Từ vựng)
3. Module cấu hình & làm bài kiểm tra (chương + toàn khóa)
4. **Thuật toán đề xuất phân bổ section/câu theo chương khi retake test toàn khóa**

**Phạm vi giới hạn (nói thẳng):**
- Thuật toán áp dụng **test toàn khóa, lần làm thứ 2 trở đi**
- Test chương: random theo config mentor, **không** chạy đề xuất
- Heuristic có spec + unit test — **không** dùng Machine Learning

---

## Slide 4 — Tổng quan hệ thống (~1,5 phút)

**Tiêu đề:** S.T.A.R Learning Path — Module chính

| Role | Chức năng |
|------|-----------|
| **Student** | Ghi danh, học theo path, làm test, streak, profile |
| **Mentor** | Tạo khóa, content builder, question bank, config quiz |
| **Admin** | Quản lý user, category, level, news |

**Luồng demo trọng tâm (highlight):**
```
Mentor QB → Config test toàn khóa → Student làm bài → Submit stat → Retake + đề xuất
```

**Hình gợi ý:** Screenshot Home + Learning path + Question bank

---

## Slide 5 — Tech stack (~1 phút)

**Frontend:** React 18, Vite, MUI, React Router, Axios  
**Backend:** Node.js, Express, JWT  
**Database:** SQL Server (`LearningPath_Base`)  
**Media:** Cloudinary (học liệu), Multer (avatar)

**Kiến trúc API:** `Routes → Controllers → Services → Models`

---

## Slide 6 — Kiến trúc & CSDL (~1,5 phút)

**Tiêu đề:** Kiến trúc và schema liên quan test

**Sơ đồ kiến trúc (vẽ trên slide):**
```
[React UI] --REST--> [Express API] --SQL--> [SQL Server]
                         |
              testRecommendationService
              testPaperRandomService
              chapterQuizConfigService
```

**Nhóm bảng quan trọng:**
- Question bank: `Question_Bank` → `Questions_Path` → `Question_Sections` → `Questions`
- Test config: `Tests`, `Test_Config`, `Test_Config_Section`, `Test_Course_Chapters`
- Làm bài: `Test_Attempts`, `Test_Attempt_Section_Stats`

**Ghi chú:** Cột `IsUseForTest` ở section và câu — chỉ nội dung “in test” mới vào pool random/đề xuất.

---

## Slide 7 — Tính năng theo vai trò (~1 phút)

**Student:** catalog, enrollment, learning path, timed test, submit, điểm  
**Mentor:** wizard tạo khóa, CRUD học liệu, question bank, setup quiz chương/toàn khóa, publish lock  
**Admin:** quản trị tài khoản, danh mục (phần phụ trong demo)

*Nói nhanh — không đi sâu admin nếu thiếu thời gian.*

---

## Slide 8 — Luồng Mentor: Question Bank (~1 phút)

**Tiêu đề:** Ngân hàng câu hỏi

**Luồng:**
1. Mentor tạo bank theo khóa / chương
2. Tạo section theo kỹ năng (Nghe, Đọc, Từ vựng)
3. Thêm câu hỏi trắc nghiệm + đáp án
4. Bật `IsUseForTest` cho section/câu dùng trong kiểm tra
5. Publish — có **publish lock** nếu section/câu đang nằm trong config test

**File tham chiếu:** `questionBankModel.js`, `MentorQuestionBankManagePage`

**Điểm nhấn:** Mentor validate `availableCount` trước khi lưu config — đảm bảo bank đủ câu usable.

---

## Slide 9 — Luồng Mentor: Config test (~1 phút)

**Tiêu đề:** Cấu hình bài kiểm tra

**Test chương:** title, thời gian, điểm đạt, max attempts, số section Nghe/Đọc, câu Từ vựng theo section  
**Test toàn khóa:** thêm **chọn chương nguồn** (`selectedChapterIds`)

**Validate (FE + BE):**
- Nghe/Đọc: `sectionCount` ≤ số section inTest trong bank
- Từ vựng: `questionCount` ≤ `availableCount` từng section

**Lưu DB:** `Test_Config_Section` — không lưu JSON tạm

**API:** `PUT .../course-quiz-config`, `PUT .../chapter-quiz-config`

---

## Slide 10 — Luồng Student: Start → Submit (~1,5 phút)

**Tiêu đề:** Học viên làm bài kiểm tra

**API chính:**
- `GET  /api/courses/:courseId/tests/:scope/meta`
- `POST /api/courses/:courseId/tests/:scope/start`
- `POST /api/courses/:courseId/tests/attempts/:attemptId/submit`

**Test toàn khóa (`scope=final`):**

| Lần | Hành vi |
|-----|---------|
| Lần 1 | Random theo **mentor config gốc** |
| Lần 2+ | Đọc stat lần trước → **đề xuất config** → random đề |

**Test chương:** luôn random mentor config, không đề xuất.

**Submit:** lưu `Test_Attempt_Section_Stats` (wrong/total theo section) — input cho retake.

**Route UI:** `/my-courses/:courseId/test/final`

---

## Slide 11 — Thuật toán: Bài toán & input/output (~1,5 phút)

**Tiêu đề:** Thuật toán đề xuất câu hỏi (retake test toàn khóa)

**Input:**
- Mentor config gốc (trần trên)
- Stat lần làm gần nhất: `wrongCount`, `totalCount` theo `(pathId, skillType, sectionId)`
- Question bank các chương đã chọn

**Output (không chọn câu trực tiếp):**
- `chapterSectionCounts` — Map phân bổ section Nghe/Đọc theo chương
- `vocabularyPlan` — danh sách section + số câu Từ vựng (khi Case 2/3)

**Hai tầng tách biệt:**
1. **Đề xuất** — điều chỉnh config (`testRecommendationService.js`)
2. **Random** — tạo đề thật (`testPaperRandomService.js`)

**Tài liệu gốc:** `Thuật toán đề xuất câu hỏi.docx` → mirror trong `testRecommendationDocx.js`

---

## Slide 12 — Công thức 1 & 2 (~1,5 phút)

**Công thức 1 — Trọng số theo chương:**
```
weight(chương i) = tổng sai chương i / tổng câu chương i
```

**Ví dụ Nghe/Đọc (docx):**
- Ch1: 7/20 = 0.35  
- Ch2: 7/10 = 0.70  
- Ch3: 12/20 = 0.60  

**Công thức 2 — Chia section (mentor config = 5 section Nghe):**
- Floor theo weight → phần dư cho chương weight cao nhất  
- **Kết quả:** `{ Ch1: 1, Ch2: 3, Ch3: 1 }`

**Hình gợi ý:** Bảng weight + bảng phân bổ (copy từ test case docx)

---

## Slide 13 — Case 1 / 2 / 3 & Exception (~2 phút)

**Tiêu đề:** Quy tắc quyết định (theo docx)

| Case | Điều kiện | Hành vi |
|------|-----------|---------|
| **Case 1** | Weight bằng nhau + đủ chương eligible trong stat + ≥ 2 chương | **Giữ nguyên mentor config** |
| **Case 2** | Weight khác nhau | `allocateByWeight` |
| **Case 3** | Weight = 0 | Loại chương khỏi phân bổ |
| **Exception** | Chỉ 1 chương weight > 0 | Giao hết section cho chương đó |
| **Fallback** | Mọi chương weight = 0 | Mentor config |

**BANK_RULE (Nghe/Đọc):** Chương thiếu section trong bank → bù sang chương weight cao; tổng ≤ mentor.

**Lưu ý trình bày (tránh bị hỏi vặn):**
- Retake **≠** luôn đổi section Từ vựng  
- TV chỉ random section mới khi sinh `vocabularyPlan`; Case 1 → vẫn section mentor đã chọn

---

## Slide 14 — Từ vựng & Random đề (~1,5 phút)

**Từ vựng — 4 bước docx:**
1. Tính weight theo chương (công thức 1)
2. Chia **số section** theo weight (ví dụ 12 section → `{1:5, 2:3, 3:4}`)
3. Chia **số câu** theo weight trong từng chương
4. `pickRandomSections` + `distributeQuestionsAcrossSections`

**Random đề (`testPaperRandomService`):**
- **Nghe/Đọc:** lấy **nguyên section** (không cắt từng câu)
- **Từ vựng:** section theo plan + slice đủ `questionCount`
- Lần 1: chia đều section Nghe/Đọc các chương
- Retake có Map: random theo phân bổ từng chương

---

## Slide 15 — Ánh xạ code (~1 phút)

**Tiêu đề:** Triển khai trong codebase

| Thành phần | File |
|------------|------|
| Spec docx | `backend/services/testRecommendationDocx.js` |
| Thuật toán | `backend/services/testRecommendationService.js` |
| Random đề | `backend/services/testPaperRandomService.js` |
| Start/submit | `backend/controllers/studentTestController.js` |
| Config mentor | `backend/services/chapterQuizConfigService.js` |
| Unit test | `backend/test/testRecommendationService.docx.test.js` |

**Luồng retake (1 dòng):**
```
start → buildRecommendedCourseTestPaper → recommendCourseTestFromStats → randomizeTestPaperFromConfig
```

---

## Slide 16 — Kiểm chứng (~1 phút)

**Tiêu đề:** Làm sao biết thuật toán đúng?

- **46 unit test** đối chiếu docx — chạy: `npm run test:recommendation` (trong `backend/`)
- Test cover: Công thức 1/2, Case 1/2/3, Exception, BANK_RULE, Từ vựng, edge `IsUseForTest`
- Demo live: lần 1 submit → query stat DB → lần 2 thấy phân bổ khác (xem script demo)

**Thành thật về hạn chế:**
- Chưa có A/B đo hiệu quả học tập
- Chưa có integration test full HTTP flow
- Heuristic, không ML

---

## Slide 17 — Demo (~30 giây — chuyển sang live)

**Tiêu đề:** Demo — Retake với thuật toán đề xuất

**Kịch bản 5 phút:** xem file `docs/DEMO_RETAKE_SCRIPT.md`

**Chuẩn bị trước:** data bank 3 chương, config Nghe 5 section, student account, SQL query stat sẵn.

---

## Slide 18 — Kết luận & hướng phát triển (~1 phút)

**Kết quả đạt được:**
- Nền tảng e-learning full-stack 3 role
- Question bank + config test + làm bài có API thật
- Thuật toán đề xuất retake có spec, code, unit test, tích hợp production path

**Hướng phát triển:**
- Integration/E2E test
- Dashboard mentor xem stat học viên theo chương
- Mở rộng đề xuất cho test chương (nếu cần)
- So sánh hiệu quả random thuần vs đề xuất

**Cảm ơn — Q&A**

---

## Phụ lục: Câu hỏi hội đồng thường gặp & gợi ý trả lời

### 1. “Thuật toán có phải AI không?”
> Không. Đây là thuật toán heuristic dựa trên tỷ lệ sai/tổng theo chương, có ràng buộc mentor config và rule rebalance khi thiếu bank. Phù hợp phạm vi SWP391 — minh bạch, test được.

### 2. “Vì sao lần 1 không đề xuất?”
> Lần 1 chưa có stat từ lần submit trước. Thuật toán cần input wrong/total theo section. Code: `attemptCount === 0` → `buildCourseTestPaper`.

### 3. “Case 1 giữ mentor config — còn gì cá nhân hóa?”
> Case 1 nghĩa là phân bố sai đều các chương — không cần điều chỉnh. Vẫn có random câu/section trong pool. Đó là quyết định theo spec docx.

### 4. “Làm sao đảm bảo không vượt config mentor?”
> Mọi nhánh allocate đều cap tại `sectionCount` / tổng câu mentor. `validatePaperAgainstConfig` kiểm tra sau random.

### 5. “Test chương có đề xuất không?”
> Không. Chỉ test toàn khóa retake. Test chương luôn `buildChapterTestPaper`.

### 6. “Stat lấy từ attempt nào?”
> Attempt mới nhất theo `AttemptId DESC`, mọi status. Stat chỉ có nếu đã submit. Nếu attempt mới nhất chưa submit → fallback mentor config.

---

## Gợi ý phân công trình bày (nhóm 5 người)

| Thành viên | Phần | Thời gian |
|------------|------|-----------|
| 1 | Slide 1–3: Mở đầu, bài toán | ~3 phút |
| 2 | Slide 4–7: Hệ thống, kiến trúc | ~4 phút |
| 3 | Slide 8–10: Luồng QB, config, student | ~3 phút |
| 4 | Slide 11–15: Thuật toán (trọng tâm) | ~6 phút |
| 5 | Slide 16–18 + Demo 5 phút | ~4 phút + demo |

*Điều chỉnh theo ai nắm thuật toán sâu nhất — nên để người đó slide 11–15 + demo.*
