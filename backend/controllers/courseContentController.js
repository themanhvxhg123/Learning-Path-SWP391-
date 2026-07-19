const coursesModel = require('../Models/coursesModel');
const courseContentSaveModel = require('../Models/courseContentSaveModel');
const chapterQuizConfigModel = require('../Models/chapterQuizConfigModel');
const {
  fetchCloudinaryAssetBuffer,
  isCloudinaryDeliveryUrl,
} = require('../services/cloudinaryService');
const { toPathIsActiveBit } = require('../utils/pathActiveUtils');

async function assertMentorOwnsCourse(courseId, instructorId) {
  const ownerId = await coursesModel.getCourseInstructorId(courseId);
  if (!ownerId) {
    return { ok: false, status: 404, message: 'Không tìm thấy khóa học.' };
  }
  if (instructorId && Number(ownerId) !== Number(instructorId)) {
    return { ok: false, status: 403, message: 'Bạn không có quyền cập nhật khóa học này.' };
  }
  return { ok: true, ownerId };
}

async function assertPathAccess(pathId, instructorId) {
  const courseId = await courseContentSaveModel.getCourseIdByPathId(pathId);
  if (!courseId) {
    return { ok: false, status: 404, message: 'Không tìm thấy path.' };
  }
  const ownership = await assertMentorOwnsCourse(courseId, instructorId);
  if (!ownership.ok) return ownership;
  return { ok: true, courseId };
}

async function assertNodeAccess(nodeId, instructorId) {
  const courseId = await courseContentSaveModel.getCourseIdByNodeId(nodeId);
  if (!courseId) {
    return { ok: false, status: 404, message: 'Không tìm thấy bài học.' };
  }
  const ownership = await assertMentorOwnsCourse(courseId, instructorId);
  if (!ownership.ok) return ownership;
  const node = await courseContentSaveModel.getNodeById(nodeId);
  return { ok: true, courseId, pathId: node?.PathId ?? null };
}

async function assertMaterialAccess(materialId, instructorId) {
  const courseId = await courseContentSaveModel.getCourseIdByMaterialId(materialId);
  if (!courseId) {
    return { ok: false, status: 404, message: 'Không tìm thấy học liệu.' };
  }
  const ownership = await assertMentorOwnsCourse(courseId, instructorId);
  if (!ownership.ok) return ownership;
  const material = await courseContentSaveModel.getMaterialById(materialId);
  return { ok: true, courseId, nodeId: material?.NodeId ?? null };
}

function parseId(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`${label} không hợp lệ.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

function handleError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  const statusCode = error.statusCode ?? (/thiếu|Cần ít nhất|Mỗi bài học|NodeName/i.test(String(error.message ?? '')) ? 400 : 500);
  return res.status(statusCode).json({
    success: false,
    message: error.message ?? fallbackMessage,
  });
}

const createPath = async (req, res) => {
  try {
    const courseId = parseId(req.params.courseId, 'courseId');
    const instructorId = req.user?.userId ?? null;
    const ownership = await assertMentorOwnsCourse(courseId, instructorId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ success: false, message: ownership.message });
    }

    const data = req.body?.data ?? req.body ?? {};
    const pathName = String(data.PathName ?? data.pathName ?? '').trim();
    if (!pathName) {
      return res.status(400).json({ success: false, message: 'PathName là bắt buộc.' });
    }

    const isActive = toPathIsActiveBit(data.IsActive, 0);
    if (isActive === 1) {
      return res.status(400).json({
        success: false,
        message: 'Chương cần ít nhất 1 bài học và 1 học liệu trước khi xuất bản.',
      });
    }

    const pathId = await courseContentSaveModel.insertPathRow(courseId, {
      PathName: pathName,
      Description: data.Description ?? data.description ?? null,
      Order: data.Order ?? data.PathOrder ?? 1,
      IsActive: isActive,
    });
    await courseContentSaveModel.recalculateCourseTotalLessons(courseId);

    return res.status(201).json({
      success: true,
      message: 'Đã tạo path.',
      data: { pathId, courseId },
    });
  } catch (error) {
    return handleError(res, error, 'createPath error:');
  }
};

const updatePathById = async (req, res) => {
  try {
    const pathId = parseId(req.params.pathId, 'pathId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertPathAccess(pathId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const set = req.body?.set ?? req.body ?? {};
    if (set.IsActive !== undefined && toPathIsActiveBit(set.IsActive, 1) === 1) {
      await courseContentSaveModel.assertPathCanPublish(pathId);
    }
    if (set.IsActive !== undefined && toPathIsActiveBit(set.IsActive, 1) === 0) {
      const existingTest = await chapterQuizConfigModel.getChapterTestByPathId(pathId);
      if (existingTest) {
        return res.status(400).json({
          success: false,
          message: 'Không thể ẩn chương đã có bài kiểm tra.',
        });
      }
    }
    await courseContentSaveModel.updatePathById(pathId, set);

    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật path.',
      data: { pathId, courseId: access.courseId },
    });
  } catch (error) {
    return handleError(res, error, 'updatePathById error:');
  }
};

const deletePathById = async (req, res) => {
  try {
    const pathId = parseId(req.params.pathId, 'pathId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertPathAccess(pathId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    await courseContentSaveModel.deletePathById(pathId);
    await courseContentSaveModel.recalculateCourseTotalLessons(access.courseId);

    return res.status(200).json({
      success: true,
      message: 'Đã xóa path.',
      data: { pathId, courseId: access.courseId },
    });
  } catch (error) {
    return handleError(res, error, 'deletePathById error:');
  }
};

const createNodeByPathId = async (req, res) => {
  try {
    const pathId = parseId(req.params.pathId, 'pathId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertPathAccess(pathId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const data = req.body?.data ?? req.body ?? {};
    const isActive = toPathIsActiveBit(data.IsActive, 0);
    if (isActive === 1) {
      return res.status(400).json({
        success: false,
        message: 'Bài học cần ít nhất 1 học liệu trước khi xuất bản.',
      });
    }

    const nodeId = await courseContentSaveModel.insertNodeRow(pathId, {
      ...data,
      IsActive: isActive,
    });
    await courseContentSaveModel.recalculateCourseTotalLessons(access.courseId);

    return res.status(201).json({
      success: true,
      message: 'Đã tạo bài học.',
      data: {
        nodeId,
        pathId,
        courseId: access.courseId,
        clientRef: req.body?.clientRef ?? null,
      },
    });
  } catch (error) {
    return handleError(res, error, 'createNodeByPathId error:');
  }
};

const updateNodeById = async (req, res) => {
  try {
    const nodeId = parseId(req.params.nodeId, 'nodeId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertNodeAccess(nodeId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const set = req.body?.set ?? req.body ?? {};
    if (req.body?.order != null || req.body?.NodeOrder != null) {
      set.NodeOrder = req.body.order ?? req.body.NodeOrder;
    }
    if (set.IsActive !== undefined && toPathIsActiveBit(set.IsActive, 1) === 1) {
      await courseContentSaveModel.assertNodeCanPublish(nodeId);
    }
    if (set.IsActive !== undefined && toPathIsActiveBit(set.IsActive, 1) === 0 && access.pathId) {
      const existingTest = await chapterQuizConfigModel.getChapterTestByPathId(access.pathId);
      if (existingTest) {
        const activeNodeCount = await courseContentSaveModel.countActiveNodesInPath(
          access.pathId,
          { excludeNodeId: nodeId },
        );
        if (activeNodeCount < 1) {
          return res.status(400).json({
            success: false,
            message: 'Chương có bài kiểm tra cần ít nhất 1 bài học được xuất bản.',
          });
        }
      }
    }
    await courseContentSaveModel.updateNodeById(nodeId, set);

    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật bài học.',
      data: { nodeId, pathId: access.pathId, courseId: access.courseId },
    });
  } catch (error) {
    return handleError(res, error, 'updateNodeById error:');
  }
};

const deleteNodeById = async (req, res) => {
  try {
    const nodeId = parseId(req.params.nodeId, 'nodeId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertNodeAccess(nodeId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    await courseContentSaveModel.deleteNodeById(nodeId);
    await courseContentSaveModel.recalculateCourseTotalLessons(access.courseId);

    return res.status(200).json({
      success: true,
      message: 'Đã xóa bài học.',
      data: { nodeId, pathId: access.pathId, courseId: access.courseId },
    });
  } catch (error) {
    return handleError(res, error, 'deleteNodeById error:');
  }
};

const createMaterialByNodeId = async (req, res) => {
  try {
    const nodeId = parseId(req.params.nodeId, 'nodeId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertNodeAccess(nodeId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const data = req.body?.data ?? req.body ?? {};
    const materialId = await courseContentSaveModel.insertMaterialRow(nodeId, data);

    return res.status(201).json({
      success: true,
      message: 'Đã tạo học liệu.',
      data: {
        materialId,
        nodeId,
        pathId: access.pathId,
        courseId: access.courseId,
        clientRef: req.body?.clientRef ?? null,
      },
    });
  } catch (error) {
    return handleError(res, error, 'createMaterialByNodeId error:');
  }
};

const updateMaterialById = async (req, res) => {
  try {
    const materialId = parseId(req.params.materialId, 'materialId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertMaterialAccess(materialId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const set = req.body?.set ?? req.body ?? {};
    if (req.body?.order != null || req.body?.MaterialOrder != null) {
      set.MaterialOrder = req.body.order ?? req.body.MaterialOrder;
    }
    await courseContentSaveModel.updateMaterialById(materialId, set);

    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật học liệu.',
      data: {
        materialId,
        nodeId: access.nodeId,
        courseId: access.courseId,
      },
    });
  } catch (error) {
    return handleError(res, error, 'updateMaterialById error:');
  }
};

const deleteMaterialById = async (req, res) => {
  try {
    const materialId = parseId(req.params.materialId, 'materialId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertMaterialAccess(materialId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    await courseContentSaveModel.deleteMaterialById(materialId);

    return res.status(200).json({
      success: true,
      message: 'Đã xóa học liệu.',
      data: {
        materialId,
        nodeId: access.nodeId,
        courseId: access.courseId,
      },
    });
  } catch (error) {
    return handleError(res, error, 'deleteMaterialById error:');
  }
};

const getPathById = async (req, res) => {
  try {
    const pathId = parseId(req.params.pathId, 'pathId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertPathAccess(pathId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const path = await courseContentSaveModel.getPathById(pathId);
    if (!path) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy path.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy path thành công.',
      data: {
        PathId: path.PathId,
        CourseId: path.CourseId,
        PathName: path.PathName,
        Description: path.Description,
        Order: path.Order,
        IsActive: path.IsActive,
        courseId: access.courseId,
      },
    });
  } catch (error) {
    return handleError(res, error, 'getPathById error:');
  }
};

const getNodeById = async (req, res) => {
  try {
    const nodeId = parseId(req.params.nodeId, 'nodeId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertNodeAccess(nodeId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const node = await courseContentSaveModel.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài học.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy bài học thành công.',
      data: {
        NodeId: node.NodeId,
        PathId: node.PathId,
        NodeName: node.NodeName,
        NodeOrder: node.NodeOrder,
        Description: node.Description,
        IsActive: node.IsActive,
        courseId: access.courseId,
        pathId: access.pathId,
      },
    });
  } catch (error) {
    return handleError(res, error, 'getNodeById error:');
  }
};

const getMaterialById = async (req, res) => {
  try {
    const materialId = parseId(req.params.materialId, 'materialId');
    const instructorId = req.user?.userId ?? null;
    const access = await assertMaterialAccess(materialId, instructorId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const material = await courseContentSaveModel.getMaterialById(materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học liệu.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy học liệu thành công.',
      data: {
        MaterialId: material.MaterialId,
        NodeId: material.NodeId,
        MaterialType: material.MaterialType,
        Title: material.Title,
        MaterialUrl: material.MaterialUrl,
        MaterialOrder: material.MaterialOrder,
        SourceType: material.SourceType,
        FileName: material.FileName,
        FileSize: material.FileSize,
        courseId: access.courseId,
        nodeId: access.nodeId,
      },
    });
  } catch (error) {
    return handleError(res, error, 'getMaterialById error:');
  }
};

const downloadMaterialFile = async (req, res) => {
  try {
    const rawUrl = String(req.query?.url ?? '').trim();
    const fileName = String(req.query?.fileName ?? 'tai-lieu').trim() || 'tai-lieu';

    if (!rawUrl) {
      return res.status(400).json({ success: false, message: 'Thiếu url.' });
    }

    if (!isCloudinaryDeliveryUrl(rawUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ hỗ trợ tải tài liệu từ Cloudinary.',
      });
    }

    const { buffer, contentType } = await fetchCloudinaryAssetBuffer(rawUrl, fileName);

    const safeFileName = fileName.replace(/[^\w.\-() ]+/g, '_').slice(0, 120) || 'tai-lieu';
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    return res.send(buffer);
  } catch (error) {
    const statusCode = error.statusCode === 400 ? 400 : error.statusCode === 502 ? 502 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Không thể tải tài liệu.',
    });
  }
};

module.exports = {
  createPath,
  updatePathById,
  deletePathById,
  getPathById,
  createNodeByPathId,
  updateNodeById,
  deleteNodeById,
  getNodeById,
  createMaterialByNodeId,
  updateMaterialById,
  deleteMaterialById,
  getMaterialById,
  downloadMaterialFile,
};
