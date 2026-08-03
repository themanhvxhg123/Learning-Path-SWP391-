/**
 * REST lưu nội dung khóa học từng phần (mentor content builder).
 *
 * saveCoursePath(body): thực thi tuần tự theo payload từ courseContentApiMappers:
 *   materialsDelete → nodesDelete → pathInsert/Update → nodes → materials
 * Mỗi bước gọi /api/mentor/... với x-user-id.
 *
 * saveEntireCoursePaths / saveAllCoursePaths (cuối file): dùng khi updateCourseContent
 * so sánh draft paths với serverPaths rồi sync toàn khóa.
 */
import axios from 'axios';
import { getUser } from '@/features/auth/utils/authUtils';
import {
  buildCoursePathSavePayload,
  hasCoursePathSaveOperations,
} from '@/features/mentor/utils/courseContentApiMappers';
import { serializePathSnapshot } from '@/features/mentor/utils/mentorCourseContentUtils';

const API_BASE = 'http://localhost:5000/api';

function getMentorAuthHeaders() {
  const userId = getUser()?.userId;
  const headers = { 'Content-Type': 'application/json' };
  if (userId) {
    headers['x-user-id'] = String(userId);
  }
  return headers;
}

function ensureSuccess(data, fallbackMessage) {
  if (data?.success === false) {
    return { ok: false, message: data.message ?? fallbackMessage };
  }
  return { ok: true, data: data?.data ?? data };
}

export async function deleteCoursePath(pathId) {
  try {
    const { data } = await axios.delete(
      `${API_BASE}/mentor/paths/${encodeURIComponent(pathId)}`,
      { headers: getMentorAuthHeaders() },
    );
    return ensureSuccess(data, 'Không thể xóa chương.');
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message ?? error.message ?? 'Không thể xóa chương.',
    };
  }
}

export async function fetchMaterialById(materialId) {
  try {
    const { data } = await axios.get(
      `${API_BASE}/mentor/materials/${encodeURIComponent(materialId)}`,
      { headers: getMentorAuthHeaders() },
    );
    return ensureSuccess(data, 'Không thể tải học liệu.');
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message ?? error.message ?? 'Không thể tải học liệu.',
    };
  }
}

export async function fetchPathById(pathId) {
  try {
    const { data } = await axios.get(
      `${API_BASE}/mentor/paths/${encodeURIComponent(pathId)}`,
      { headers: getMentorAuthHeaders() },
    );
    return ensureSuccess(data, 'Không thể tải chương.');
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message ?? error.message ?? 'Không thể tải chương.',
    };
  }
}

export async function fetchNodeById(nodeId) {
  try {
    const { data } = await axios.get(
      `${API_BASE}/mentor/nodes/${encodeURIComponent(nodeId)}`,
      { headers: getMentorAuthHeaders() },
    );
    return ensureSuccess(data, 'Không thể tải bài học.');
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message ?? error.message ?? 'Không thể tải bài học.',
    };
  }
}

/**
 * Thực thi một batch thay đổi cho MỘT chương (path).
 * Gọi từ MentorEditCourseContentPage.executeScopedSave hoặc saveAllCoursePaths.
 * Thứ tự HTTP khớp docs/MENTOR_EDIT_FE_TO_BE.md mục D.
 */
export async function saveCoursePath(body = {}) {
  const headers = getMentorAuthHeaders();
  const courseId = body.context?.courseId;
  let pathId = body.context?.pathId ?? null;
  const nodeIdMap = [];
  const materialIdMap = [];

  try {
    // --- BE: courseContentController.deleteMaterialById ---
    for (const item of body.materialsDelete ?? []) {
      const { data } = await axios.delete(
        `${API_BASE}/mentor/materials/${encodeURIComponent(item.materialId)}`,
        { headers },
      );
      const result = ensureSuccess(data, 'Không thể xóa học liệu.');
      if (!result.ok) return result;
    }

    // --- BE: courseContentController.deleteNodeById ---
    for (const item of body.nodesDelete ?? []) {
      const { data } = await axios.delete(
        `${API_BASE}/mentor/nodes/${encodeURIComponent(item.nodeId)}`,
        { headers },
      );
      const result = ensureSuccess(data, 'Không thể xóa bài học.');
      if (!result.ok) return result;
    }

    if (body.pathInsert) {
      // --- BE: createPath → createNodeByPathId → createMaterialByNodeId (chương mới hoàn toàn) ---
      const { data } = await axios.post(
        `${API_BASE}/mentor/courses/${encodeURIComponent(courseId)}/paths`,
        { data: body.pathInsert.data },
        { headers },
      );
      const result = ensureSuccess(data, 'Không thể tạo path.');
      if (!result.ok) return result;
      pathId = result.data?.pathId ?? null;
      if (!pathId) {
        return { ok: false, message: 'Không nhận được pathId sau khi tạo path.' };
      }

      for (const node of body.pathInsert.nodes ?? []) {
        const nodeRes = await axios.post(
          `${API_BASE}/mentor/paths/${encodeURIComponent(pathId)}/nodes`,
          {
            clientRef: node.clientRef ?? null,
            data: { ...node.data, NodeOrder: node.NodeOrder },
          },
          { headers },
        );
        const nodeResult = ensureSuccess(nodeRes.data, 'Không thể tạo bài học.');
        if (!nodeResult.ok) return nodeResult;
        const nodeId = nodeResult.data?.nodeId;
        if (node.clientRef && nodeId) {
          nodeIdMap.push({ clientRef: node.clientRef, nodeId });
        }

        for (const material of node.materialsInsert ?? []) {
          const materialRes = await axios.post(
            `${API_BASE}/mentor/nodes/${encodeURIComponent(nodeId)}/materials`,
            {
              clientRef: material.clientRef ?? null,
              data: material.data,
            },
            { headers },
          );
          const materialResult = ensureSuccess(materialRes.data, 'Không thể tạo học liệu.');
          if (!materialResult.ok) return materialResult;
          if (material.clientRef && materialResult.data?.materialId) {
            materialIdMap.push({
              clientRef: material.clientRef,
              materialId: materialResult.data.materialId,
              nodeId,
            });
          }
        }
      }
    } else {
      // --- Chương đã có PathId: cập nhật từng phần ---
      if (body.pathUpdate?.pathId) {
        // BE: updatePathById
        const { data } = await axios.put(
          `${API_BASE}/mentor/paths/${encodeURIComponent(body.pathUpdate.pathId)}`,
          { set: body.pathUpdate.set ?? {} },
          { headers },
        );
        const result = ensureSuccess(data, 'Không thể cập nhật path.');
        if (!result.ok) return result;
        pathId = body.pathUpdate.pathId;
      }

      // BE: updateNodeById
      for (const item of body.nodesUpdate ?? []) {
        const requestBody = {};
        if (Object.keys(item.set ?? {}).length > 0) {
          requestBody.set = item.set;
        }
        if (item.NodeOrder != null || item.order != null) {
          requestBody.order = item.NodeOrder ?? item.order;
        }
        if (Object.keys(requestBody).length === 0) continue;
        const { data } = await axios.put(
          `${API_BASE}/mentor/nodes/${encodeURIComponent(item.nodeId)}`,
          requestBody,
          { headers },
        );
        const result = ensureSuccess(data, 'Không thể cập nhật bài học.');
        if (!result.ok) return result;
      }

      // BE: createNodeByPathId (+ materialsInsert con)
      for (const item of body.nodesInsert ?? []) {
        const targetPathId = item.pathId ?? pathId;
        const { data } = await axios.post(
          `${API_BASE}/mentor/paths/${encodeURIComponent(targetPathId)}/nodes`,
          {
            clientRef: item.clientRef ?? null,
            data: { ...item.data, NodeOrder: item.NodeOrder },
          },
          { headers },
        );
        const result = ensureSuccess(data, 'Không thể tạo bài học.');
        if (!result.ok) return result;
        const nodeId = result.data?.nodeId;
        if (item.clientRef && nodeId) {
          nodeIdMap.push({ clientRef: item.clientRef, nodeId });
        }

        for (const material of item.materialsInsert ?? []) {
          const materialRes = await axios.post(
            `${API_BASE}/mentor/nodes/${encodeURIComponent(nodeId)}/materials`,
            {
              clientRef: material.clientRef ?? null,
              data: material.data,
            },
            { headers },
          );
          const materialResult = ensureSuccess(materialRes.data, 'Không thể tạo học liệu.');
          if (!materialResult.ok) return materialResult;
          if (material.clientRef && materialResult.data?.materialId) {
            materialIdMap.push({
              clientRef: material.clientRef,
              materialId: materialResult.data.materialId,
              nodeId,
            });
          }
        }
      }

      // BE: updateMaterialById
      for (const item of body.materialsUpdate ?? []) {
        const requestBody = {};
        if (Object.keys(item.set ?? {}).length > 0) {
          requestBody.set = item.set;
        }
        if (item.MaterialOrder != null || item.order != null) {
          requestBody.order = item.MaterialOrder ?? item.order;
        }
        if (Object.keys(requestBody).length === 0) continue;
        const { data } = await axios.put(
          `${API_BASE}/mentor/materials/${encodeURIComponent(item.materialId)}`,
          requestBody,
          { headers },
        );
        const result = ensureSuccess(data, 'Không thể cập nhật học liệu.');
        if (!result.ok) return result;
      }

      // BE: createMaterialByNodeId
      for (const item of body.materialsInsert ?? []) {
        const { data } = await axios.post(
          `${API_BASE}/mentor/nodes/${encodeURIComponent(item.nodeId)}/materials`,
          {
            clientRef: item.clientRef ?? null,
            data: item.data,
          },
          { headers },
        );
        const result = ensureSuccess(data, 'Không thể tạo học liệu.');
        if (!result.ok) return result;
        if (item.clientRef && result.data?.materialId) {
          materialIdMap.push({
            clientRef: item.clientRef,
            materialId: result.data.materialId,
            nodeId: item.nodeId,
          });
        }
      }
    }

    return {
      ok: true,
      message: 'Đã cập nhật path.',
      pathId,
      nodeIdMap,
      materialIdMap,
    };
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message ?? error.message ?? 'Không thể cập nhật path.',
    };
  }
}

/**
 * Lưu toàn bộ paths của khóa học theo diff REST (không xóa/insert lại bulk).
 * So sánh draftPaths với serverPaths (baseline từ DB) → chỉ gọi DELETE/PUT/POST cần thiết.
 */
export async function saveAllCoursePaths(courseId, draftPaths = [], serverPaths = []) {
  const serverByPathId = new Map(
    serverPaths.filter((path) => path.PathId).map((path) => [path.PathId, path]),
  );

  let savedAny = false;
  let lastResult = { ok: true };

  for (let index = 0; index < draftPaths.length; index += 1) {
    const draftPath = draftPaths[index];
    const serverPath = draftPath.PathId ? serverByPathId.get(draftPath.PathId) : null;
    const baselineSnapshot = serverPath ? serializePathSnapshot(serverPath) : null;

    const payload = buildCoursePathSavePayload(
      draftPath,
      { courseId: Number(courseId), pathOrder: index + 1 },
      baselineSnapshot,
    );

    if (!hasCoursePathSaveOperations(payload)) continue;

    savedAny = true;
    lastResult = await saveCoursePath({
      ...payload,
      context: {
        ...(payload.context ?? {}),
        courseId: Number(courseId),
        pathOrder: index + 1,
      },
    });

    if (!lastResult.ok) return lastResult;
  }

  return {
    ok: true,
    message: savedAny ? 'Nội dung đã được cập nhật.' : 'Không có thay đổi nội dung.',
  };
}
