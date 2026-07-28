# checkDuplicateQuestions

**File:** `frontend/src/features/mentor/utils/mentorTestContentUtils.js`

## Hàm

```javascript
checkDuplicateQuestions(questions)
```

### Đầu vào

Mảng câu hỏi, mỗi phần tử:

```javascript
{
  id: string,           // id câu (tempId)
  title: string,        // đề / QuestionText
  choices?: string[],   // nội dung các lựa chọn (theo thứ tự)
}
```

Helper từ section: `toDuplicateCheckQuestions(section.Questions)`.

### Đầu ra

Mảng lỗi (có thể rỗng):

```javascript
[
  {
    questionId: 'tmp-1',
    questionNumber: 1,
    kind: 'title',
    message: 'Câu 1 trùng đề với câu 3',
  },
  {
    questionId: 'tmp-2',
    questionNumber: 2,
    kind: 'choice',
    choiceIndexes: [0, 2],
    message: 'Câu 2: lựa chọn 1, 3 trùng nhau',
  },
]
```

### Quy tắc

- So sánh chuỗi: `trim` + `toLocaleLowerCase('vi-VN')` (`qbTextKey`).
- **Title:** trùng giữa hai câu khác nhau trong cùng list.
- **Choices:** trùng giữa hai lựa chọn trong **cùng một** câu.
- Chuỗi rỗng sau chuẩn hóa → không so trùng.

### Tích hợp lưu section

`validateQuestionBankSection` (forSave):

1. `checkDuplicateQuestions(toDuplicateCheckQuestions(questions))`
2. `mapDuplicateErrorsToQuestionFields(...)` → gộp vào `sErrors.Questions`

Trùng tên section (cả chương): `collectDuplicateSectionNameErrors` (riêng).

Backend không check trùng.

## Luồng « Lưu section » (frontend)

1. Mentor xác nhận dialog → `handleConfirmSaveSection` (`MentorQuestionBankManagePage.jsx`).
2. **`validateQuestionBankSectionBeforeBackendSave`** (`questionBankSectionSaveValidation.js`) — cổng duy nhất trước API:
   - Bỏ qua validate nội dung nếu payload chỉ xóa câu hỏi (`deleteQuestionsOnly`).
   - `validateQuestionBankSection(..., { forSave: true })` (đề, câu hỏi, nguồn Nghe/Đọc, trùng đề/đáp án, …).
   - Quota bài kiểm tra: Nghe/Đọc (`validateListeningReadingPublishedSectionQuota`), Từ vựng (`validateVocabularySectionQuestionQuota`).
3. Nếu `ok: false` → `setSectionErrors` + toast, **không** gọi backend.
4. Nếu `ok: true` → upload Reading HTML (nếu cần) → `saveQuestionBankSection` → cập nhật baseline/state.
