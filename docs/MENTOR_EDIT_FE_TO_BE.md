# Luồng chỉnh sửa khóa học (Mentor): Frontend → Backend

Tài liệu trace **từng bước** theo thứ tự thực thi. Đọc kèm comment trong:

- `frontend/src/features/mentor/services/mentorCourseService.js`
- `frontend/src/features/mentor/services/courseContentService.js`
- `backend/routes/mentorRoutes.js`
- `backend/routes/coursesRoutes.js`
- `backend/controllers/courseContentController.js`
- `backend/controllers/mentorController.js`

Header `x-user-id`: lấy từ `getUser()?.userId` sau đăng nhập (`authUtils`).

---

## A. Tải dữ liệu (mọi trang edit)

| # | Frontend | HTTP | Backend route | Controller | Model / DB |
|---|----------|------|---------------|------------|------------|
| A1 | `fetchMentorCourseDetail(courseId)` | `GET /api/courses/my-courses/:courseId?tab=course` | `coursesRoutes.js` | `coursesController.getInformationCourse` | `coursesModel` — Course, Paths, Nodes, Materials |
| A2 | (cùng hàm, song song) | `GET /api/mentor/courses/:courseId/students` | `mentorRoutes.js` | `mentorController.getStudentsInCourse` | đếm học viên → khóa Category/Level/Thumbnail |
| A3 | `MentorEditCourseContentPage` load quiz | `GET /api/mentor/courses/:courseId/chapter-quiz-configs` | `mentorRoutes.js` | `chapterQuizConfigController.list...` | chặn unpublish chương có test |
| A4 | `hydrateTextMaterialsInPaths` | `GET /api/materials/text-content?url=` | `materialsRoutes.js` | `materialUploadController.fetchTextMaterialContent` | fetch HTML từ Cloudinary |
| A5 | Upload học liệu trước lưu | `POST /api/materials/upload` hoặc Cloudinary direct | xem `materialUploadService.js` | `materialUploadController` + `cloudinaryService` | URL → `MaterialUrl` |

**Sau A1:** `courseDetailToEditCourse` / `mapDetailPathsToEditPaths` (`mentorCourseEditStorage.js`) — thêm `tempId` UI, giữ `PathId`/`NodeId`/`MaterialId`.

---

## B. Sửa thông tin cơ bản (tên, mô tả, …)

| # | Frontend | Ghi chú |
|---|----------|---------|
| B1 | `MentorEditCoursePage` — user submit form | Validate `validateMentorCourseForm` |
| B2 | `handleSave` | **Không gọi API** — `navigate` `/review` + `state.editDraft` + `meta.profileOnly: true` |
| B3 | `MentorEditCourseReviewPage` — `handleUpdate` | `updateCourseBasicInfo(courseId, courseForUpdate)` |
| B4 | HTTP | `PATCH /api/mentor/courses/:courseId` + JSON body từ `buildUpdateCourseBasicPayload` |
| B5 | `mentorRoutes` | `optionalAuth` → `req.user.userId` từ `x-user-id` |
| B6 | `mentorController.updateCourse` | `assertMentorOwnsCourse` → validate body → nếu có học viên: không đổi category/level |
| B7 | DB | `coursesModel.updateCourseById`; thumbnail base64 → lưu file local `public/assets` nếu chưa có học viên |
| B8 | FE sau OK | `navigate(/mentor/courses/:id)` — **không** gọi `updateCourseContent` khi `profileOnly` |

---

## C. Sửa nội dung — lưu từng phần (content builder)

| # | Frontend | Ghi chú |
|---|----------|---------|
| C1 | `MentorEditCourseContentPage` | User sửa → `dirtyKeys` (`path:`, `node:`, `material:`) |
| C2 | `handleUpdatePath/Node/Material` | `requestScopedSave` → `ConfirmDialog` |
| C3 | `executeScopedSave` (material) | `uploadPendingMaterialInPath` → Cloudinary nếu TEXT/DOC còn file local |
| C4 | | `buildCoursePathOnlySavePayload` / `Node` / `Material` — diff so với `pathSnapshotsRef` |
| C5 | | `saveCoursePath(payload)` trong `courseContentService.js` |
| C6 | HTTP (thứ tự trong `saveCoursePath`) | Xem bảng D bên dưới |
| C7 | | `applyCoursePathSaveResult` — gán `pathId`/`nodeId`/`materialId` trả về |
| C8 | (material TEXT) | `fetchMaterialById` + `hydrateSingleTextMaterial` đồng bộ lại editor |

---

## D. Bảng HTTP: `saveCoursePath` → `mentorRoutes`

| Thứ tự | FE `courseContentService` | Method + URL | Controller |
|--------|---------------------------|--------------|------------|
| 1 | `materialsDelete[]` | `DELETE /api/mentor/materials/:materialId` | `deleteMaterialById` |
| 2 | `nodesDelete[]` | `DELETE /api/mentor/nodes/:nodeId` | `deleteNodeById` |
| 3a | `pathInsert` | `POST /api/mentor/courses/:courseId/paths` | `createPath` |
| 3b | nodes trong insert | `POST /api/mentor/paths/:pathId/nodes` | `createNodeByPathId` |
| 3c | materials trong insert | `POST /api/mentor/nodes/:nodeId/materials` | `createMaterialByNodeId` |
| 4 | `pathUpdate` | `PUT /api/mentor/paths/:pathId` body `{ set }` | `updatePathById` |
| 5 | `nodesUpdate[]` | `PUT /api/mentor/nodes/:nodeId` | `updateNodeById` |
| 6 | `nodesInsert[]` | `POST /api/mentor/paths/:pathId/nodes` | `createNodeByPathId` |
| 7 | `materialsUpdate[]` | `PUT /api/mentor/materials/:materialId` | `updateMaterialById` |
| 8 | `materialsInsert[]` | `POST /api/mentor/nodes/:nodeId/materials` | `createMaterialByNodeId` |

Mỗi handler: `assert*Access` (mentor sở hữu khóa) → `courseContentSaveModel.*` (SQL) → JSON `{ success, data }`.

**Khôi phục từ server (không lưu):**

- `GET /api/mentor/paths/:pathId` → `getPathById`
- `GET /api/mentor/nodes/:nodeId` → `getNodeById`
- `GET /api/mentor/materials/:materialId` → `getMaterialById`

---

## E. Sửa nội dung — bulk từ trang review (ít dùng khi edit incremental)

| # | Frontend | HTTP | Backend |
|---|----------|------|---------|
| E1 | `updateCourseContent(courseId, paths)` | (nội bộ) `uploadPendingMaterialsInPaths` | Cloudinary |
| E2 | | `fetchMentorCourseDetail` lại → `mapDetailPathsToEditPaths` làm baseline | A1 |
| E3 | | `saveAllCoursePaths` — lặp từng path, `buildCoursePathSavePayload` full diff | D |
| E4 | (legacy) | `PUT /api/mentor/courses/:courseId/content` | `mentorController.updateCourseContent` — UI edit hiện tại **không** gọi trực tiếp khi dùng incremental |

---

## F. Mount Express

```
server.js
  app.use('/api/courses', coursesRoutes)   ← A1
  app.use('/api/mentor', mentorRoutes)     ← B4, C, D
  app.use('/api/materials', materialsRoutes) ← A4, upload
```

---

## G. Đọc code theo một lần bấm "Cập nhật học liệu"

1. `MentorEditCourseContentPage.jsx` → `executeScopedSave('material', …)`
2. `mentorMaterialUploadUtils.js` → `uploadPendingMaterialInPath`
3. `courseContentApiMappers.js` → `buildCourseMaterialSavePayload`
4. `courseContentService.js` → `saveCoursePath` → dòng `PUT .../materials/:id`
5. `mentorRoutes.js` → `router.put('/materials/:materialId', …)`
6. `courseContentController.js` → `updateMaterialById`
7. `courseContentSaveModel.js` → `UPDATE Node_Materials ...`
