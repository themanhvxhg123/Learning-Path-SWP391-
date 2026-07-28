# Kịch bản demo retake — 5 phút

**Mục tiêu demo:** Chứng minh trước hội đồng luồng  
`Mentor config → Student lần 1 → Submit stat → Student lần 2 → Config/đề thay đổi theo thuật toán`

**Thời lượng:** ~5 phút (có thể rút 3 phút nếu chỉ demo Nghe + 1 query SQL)

---

## Checklist chuẩn bị (trước ngày bảo vệ)

### Môi trường

- [ ] Backend chạy: `cd backend && npm start` → `GET http://localhost:5000/api/ping`
- [ ] Frontend chạy: `cd frontend && npm run dev` → `http://localhost:5173`
- [ ] SQL Server có database `LearningPath_Base`, migrations test đã chạy
- [ ] Tài khoản **Mentor** + **Student** (student đã ghi danh khóa demo)
- [ ] Trình duyệt ẩn danh thứ 2 (Mentor tab 1, Student tab 2) — hoặc 2 máy

### Dữ liệu demo (khuyến nghị)

Tạo **1 khóa demo** tên rõ ràng, ví dụ: `SWP391 Demo — Adaptive Test`

| Chương | Nghe (inTest) | Ghi chú |
|--------|---------------|---------|
| Chương 1 | ≥ 3 section | Mỗi section ≥ 5 câu usable |
| Chương 2 | ≥ 3 section | — |
| Chương 3 | ≥ 3 section | — |

**Config test toàn khóa (mentor):**
- Bật test toàn khóa
- Chọn chương: 1, 2, 3
- **Nghe: 5 section** (Đọc/TV có thể tắt để demo gọn)
- `maxAttempts` ≥ 3
- Thời gian đủ (vd. 30 phút)

### Script SQL mở sẵn (SSMS / Azure Data Studio)

Lưu file `.sql` và thay `@courseId`, `@userId` bằng ID thật:

```sql
-- 1) Tìm TestId bài toàn khóa
SELECT t.TestId, t.CourseId, t.IsCourseTest
FROM dbo.Tests t
WHERE t.CourseId = @courseId AND t.IsCourseTest = 1;

-- 2) Lịch sử attempt của student
SELECT AttemptId, UserId, TestId, Status, Point, ScorePercentage, StartedAt, SubmittedAt
FROM dbo.Test_Attempts
WHERE UserId = @userId AND TestId = @testId
ORDER BY AttemptId DESC;

-- 3) Stat section sau submit (input thuật toán)
SELECT s.AttemptId, s.PathId, s.SkillType, s.SectionId,
       s.WrongCount, s.CorrectCount,
       s.WrongCount + s.CorrectCount AS TotalCount
FROM dbo.Test_Attempt_Section_Stats s
INNER JOIN dbo.Test_Attempts a ON a.AttemptId = s.AttemptId
WHERE a.UserId = @userId AND a.TestId = @testId
ORDER BY s.AttemptId DESC, s.SkillType, s.PathId;

-- 4) Mentor config Nghe (sectionCount)
SELECT tc.TestId, tcs.TypeId, tcs.QuestionQuantity AS SectionCount
FROM dbo.Test_Config tc
JOIN dbo.Test_Config_Section tcs ON tcs.TestConfigId = tc.TestConfigId
JOIN dbo.Tests t ON t.TestId = tc.TestId
WHERE t.CourseId = @courseId AND t.IsCourseTest = 1 AND tcs.TypeId = 1;
```

### Backup nếu demo live lỗi

Chạy unit test trước hội đồng (30 giây):

```bash
cd backend
npm run test:recommendation
```

Kết quả mong đợi: **46 PASS, 0 FAIL**

Chiếu slide ví dụ docx: Nghe stat `{7/20, 7/10, 12/20}` → phân bổ `{1:1, 2:3, 3:1}`

---

## Timeline 5 phút

| Phút | Việc làm | Ai nói |
|------|----------|--------|
| 0:00–0:30 | Giới thiệu mục tiêu demo | MC |
| 0:30–1:30 | (Tuỳ chọn) Flash config mentor + bank | Mentor role |
| 1:30–3:00 | Student lần 1: làm bài, cố tình sai lệch chương | Student role |
| 3:00–3:30 | Submit + mở SQL xem stat | MC |
| 3:30–4:30 | Student lần 2: start, chỉ ra section Nghe theo chương | Student role |
| 4:30–5:00 | Tóm tắt + nối về Case 2 / công thức 1 | MC |

---

## Kịch bản chi tiết từng bước

### Bước 0 — Mở demo (30 giây)

**Lời nói:**
> Em demo luồng retake test toàn khóa. Mentor đã cấu hình 5 section Nghe từ 3 chương. Lần 1 học viên làm bài và nộp — hệ thống lưu stat sai theo section. Lần 2 thuật toán đọc stat và phân bổ lại số section Nghe theo chương yếu hơn, rồi random đề mới.

---

### Bước 1 — Mentor: Question bank + config (60 giây, có thể bỏ qua nếu đã setup)

**Đường dẫn UI:**
- Mentor: `/mentor/question-banks/:courseId/:pathId`
- Config toàn khóa: `/mentor/courses/:courseId/content` → mở dialog **Thiết lập bài kiểm tra toàn khóa**

**Thao tác nhanh (nếu cần show):**
1. Vào 1 chương → section Nghe có `IsUseForTest = Bật`
2. Mở config toàn khóa → tick 3 chương → **Nghe = 5 section** → Lưu

**Lời nói:**
> Mentor validate số section không vượt quá bank. Config lưu vào `Test_Config_Section`, đây là trần trên mọi lần đề xuất sau này.

---

### Bước 2 — Student lần 1: Start test (90 giây)

**Đường dẫn UI:**
- `/my-courses/:courseId/learn` → nút bài kiểm tra toàn khóa  
- Hoặc trực tiếp: `/my-courses/:courseId/test/final`

**Thao tác:**
1. Đăng nhập **Student**
2. Vào khóa demo → **Bắt đầu bài kiểm tra toàn khóa**
3. Ghi nhận (hoặc chụp màn hình): **section Nghe thuộc chương nào** — lần 1 thường **chia đều** (~2-2-1 hoặc tương tự tùy random)

**Chiến lược làm bài (quan trọng):**
- Ở **Chương 2**: cố tình trả lời **sai nhiều**
- Ở **Chương 1**: trả lời **đúng nhiều hơn**
- Ở **Chương 3**: sai vừa phải

→ Mục tiêu stat gần docx: Ch2 tỷ lệ sai **cao nhất** → lần 2 Ch2 được **nhiều section Nghe hơn**

**Lời nói:**
> Lần đầu hệ thống chưa có stat nên chỉ random theo config mentor — chia section Nghe đều các chương, không chạy thuật toán đề xuất.

---

### Bước 3 — Submit & kiểm tra stat (30 giây)

**Thao tác:**
1. **Nộp bài** → xác nhận điểm hiển thị
2. Chuyển sang **SQL** (chiếu màn hình) → chạy query (3) ở trên

**Lời nói:**
> Sau submit, backend ghi `Test_Attempt_Section_Stats` — wrong và total theo từng section. Đây chính là input của thuật toán ở lần start tiếp theo.

**Chỉ tay vào SQL — ví dụ giải thích:**
```
Ch1: wrong/total thấp  → weight thấp
Ch2: wrong/total cao   → weight cao  → lần 2 nhiều section hơn
Ch3: ở giữa
```

**Công thức nói miệng:**
> weight = số sai / tổng câu; 5 section Nghe được chia theo weight → ví dụ docx {1:1, 2:3, 3:1}.

---

### Bước 4 — Student lần 2: Retake (60 giày)

**Thao tác:**
1. Quay lại UI student → **Làm lại** bài test toàn khóa
2. Quan sát phần **Nghe** trong đề mới:
   - Đếm section theo chương (UI có `pathName` / metadata chương nếu hiển thị)
   - **Kỳ vọng:** Chương 2 nhiều section hơn lần 1; tổng vẫn ≤ 5

**Lời nói:**
> Lần này `attemptCount > 0` nên backend gọi `buildRecommendedCourseTestPaper`: đọc stat → `recommendCourseTestFromStats` → random đề theo Map phân bổ. Đây là Case 2 trong tài liệu thuật toán.

**Nếu UI không hiện rõ chương:**
- Mở DevTools → Network → request `POST .../tests/final/start` → xem `paper.sections[]` field `pathId`, `pathName`, `skillType`

---

### Bước 5 — Đóng demo (30 giày)

**Lời nói:**
> Tóm lại: thuật toán không chọn từng câu hỏi mà **điều chỉnh cấu hình phân bổ section** theo chương yếu, luôn nằm trong giới hạn mentor config; sau đó tầng random tạo đề thực tế. Em có 46 unit test đối chiếu tài liệu docx; demo vừa rồi là minh chứng tích hợp end-to-end.

---

## Bảng minh chứng trên slide (điền số sau demo thật)

In sẵn bảng, điền khi rehearsal:

| | Lần 1 | Stat (weight) | Lần 2 (đề xuất) |
|--|-------|---------------|-----------------|
| Chương 1 — section Nghe | | wrong/total = → w₁ = | |
| Chương 2 — section Nghe | | wrong/total = → w₂ = | |
| Chương 3 — section Nghe | | wrong/total = → w₃ = | |
| **Tổng section Nghe** | ≤ 5 (mentor) | — | ≤ 5 (mentor) |

**Ví dụ lý tưởng (khớp test docx — Nghe/Đọc):**

| Chương | Stat | Weight | Section lần 2 |
|--------|------|--------|---------------|
| 1 | 7/20 | 0.35 | 1 |
| 2 | 7/10 | 0.70 | 3 |
| 3 | 12/20 | 0.60 | 1 |

---

## Demo mở rộng (nếu hội đồng hỏi thêm Từ vựng)

**Config:** 12 section TV tổng (4+4+4 section mentor, câu đã validate)

**Stat mẫu docx:**
- Ch1: 7/13, Ch2: 8/17, Ch3: 10/19

**Kỳ vọng `vocabularyPlan`:** `{ Ch1: 5 section, Ch2: 3 section, Ch3: 4 section }` — section **random mới** từ pool inTest (không phải section cố định mentor).

**Lưu ý nói thêm:**
> Từ vựng chỉ random section khi có `vocabularyPlan` từ đề xuất. Case 1 vẫn giữ section mentor đã chọn.

---

## Xử lý sự cố khi demo

| Triệu chứng | Nguyên nhân có thể | Cách xử lý |
|-------------|-------------------|------------|
| Không mở được test | Chưa ghi danh / prerequisite chương | Ghi danh; hoàn thành quiz chương trước |
| `INSUFFICIENT_TEST_QUESTIONS` | Bank thiếu section inTest | Tăng section Nghe inTest; giảm sectionCount config |
| Lần 2 giống lần 1 | Chưa submit / stat rỗng / Case 1 | Kiểm tra SQL stat; làm sai **lệch** giữa các chương |
| Lần 2 lỗi 400 | Validate đề | Xem message; kiểm tra bank |
| Hết `maxAttempts` | Config maxAttempts thấp | Mentor tăng maxAttempts hoặc xóa attempt test (môi trường demo) |
| API lỗi auth | Thiếu `x-user-id` | Đăng nhập lại student |

**Câu thoại cứu demo:**
> Nếu môi trường mạng chậm, em xin chuyển sang kết quả unit test 46 case và bảng phân bổ docx — logic đã được kiểm chứng độc lập với UI.

---

## Rehearsal — 3 lần chạy thử

1. **Dry run đầy đủ** — ghi lại `@courseId`, `@userId`, `@testId`, thời gian mỗi bước
2. **Dry run chỉ student** — mentor/config đã setup sẵn
3. **Dry run backup** — chỉ chạy `npm run test:recommendation` + slide bảng số

**Tiêu chí pass rehearsal:**
- [ ] Lần 2 có **ít nhất 1 chương** thay đổi số section Nghe so với lần 1
- [ ] SQL stat có dòng `LISTENING` sau submit lần 1
- [ ] Tổng section Nghe lần 2 ≤ mentor config
- [ ] Backup test chạy 46/46 PASS

---

## Liên kết tài liệu

- Outline slide: [`BAO_VE_SLIDE_OUTLINE.md`](./BAO_VE_SLIDE_OUTLINE.md)
- Unit test: `backend/test/testRecommendationService.docx.test.js`
- Spec trong code: `backend/services/testRecommendationDocx.js`
