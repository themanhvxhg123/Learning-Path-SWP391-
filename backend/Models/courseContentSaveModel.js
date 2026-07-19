const { sql } = require('../config/db');
const { toPathIsActiveBit } = require('../utils/pathActiveUtils');

async function getPathById(pathId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('pathId', sql.Int, Number(pathId));
  const result = await request.query(`
    SELECT PathId, CourseId, PathName, Description, [Order], IsActive
    FROM dbo.Paths
    WHERE PathId = @pathId
  `);
  return result.recordset[0] ?? null;
}

async function getNodeById(nodeId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('nodeId', sql.Int, Number(nodeId));
  const result = await request.query(`
    SELECT NodeId, PathId, NodeName, NodeOrder, Description, IsActive
    FROM dbo.Path_Nodes
    WHERE NodeId = @nodeId
  `);
  return result.recordset[0] ?? null;
}

async function getMaterialById(materialId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('materialId', sql.Int, Number(materialId));
  const result = await request.query(`
    SELECT MaterialId, NodeId, MaterialType, Title, MaterialUrl, MaterialOrder,
           SourceType, FileName, FileSize
    FROM dbo.Node_Materials
    WHERE MaterialId = @materialId
  `);
  return result.recordset[0] ?? null;
}

async function getCourseIdByPathId(pathId) {
  const path = await getPathById(pathId);
  return path?.CourseId ?? null;
}

async function getCourseIdByNodeId(nodeId) {
  const node = await getNodeById(nodeId);
  if (!node?.PathId) return null;
  return getCourseIdByPathId(node.PathId);
}

async function getCourseIdByMaterialId(materialId) {
  const material = await getMaterialById(materialId);
  if (!material?.NodeId) return null;
  return getCourseIdByNodeId(material.NodeId);
}

async function recalculateCourseTotalLessons(courseId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('courseId', sql.Int, Number(courseId));
  await request.query(`
    UPDATE dbo.Courses
    SET TotalLessons = (
      SELECT COUNT(*)
      FROM dbo.Path_Nodes pn
      INNER JOIN dbo.Paths p ON p.PathId = pn.PathId
      WHERE p.CourseId = @courseId
    ),
    UpdatedAt = GETDATE()
    WHERE CourseId = @courseId
  `);
}

async function insertPathRow(courseId, data = {}, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('CourseId', sql.Int, Number(courseId));
  request.input('PathName', sql.NVarChar(100), data.PathName);
  request.input('Description', sql.NVarChar(sql.MAX), data.Description ?? null);
  request.input('Order', sql.Int, Number(data.Order ?? data.PathOrder ?? 1));
  request.input('IsActive', sql.Bit, toPathIsActiveBit(data.IsActive, 1));

  const result = await request.query(`
    INSERT INTO dbo.Paths (CourseId, PathName, Description, CreatedAt, [Order], IsActive)
    OUTPUT INSERTED.PathId AS PathId
    VALUES (@CourseId, @PathName, @Description, GETDATE(), @Order, @IsActive)
  `);
  return result.recordset[0]?.PathId ?? null;
}

async function updatePathById(pathId, set = {}, transaction = null) {
  const fields = [];
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('pathId', sql.Int, Number(pathId));

  if (set.PathName != null) {
    request.input('PathName', sql.NVarChar(100), set.PathName);
    fields.push('PathName = @PathName');
  }
  if (set.Description !== undefined) {
    request.input('Description', sql.NVarChar(sql.MAX), set.Description ?? null);
    fields.push('Description = @Description');
  }
  if (set.Order != null || set.PathOrder != null) {
    request.input('Order', sql.Int, Number(set.Order ?? set.PathOrder));
    fields.push('[Order] = @Order');
  }
  if (set.IsActive !== undefined) {
    request.input('IsActive', sql.Bit, toPathIsActiveBit(set.IsActive, 1));
    fields.push('IsActive = @IsActive');
  }

  if (fields.length === 0) return pathId;

  await request.query(`
    UPDATE dbo.Paths
    SET ${fields.join(', ')}
    WHERE PathId = @pathId
  `);
  return pathId;
}

async function assertPathCanPublish(pathId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('pathId', sql.Int, Number(pathId));
  const result = await request.query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Path_Nodes WHERE PathId = @pathId) AS NodeCount,
      (SELECT COUNT(*)
       FROM dbo.Path_Nodes
       WHERE PathId = @pathId
         AND ISNULL(IsActive, 1) = 1
      ) AS ActiveNodeCount,
      (SELECT COUNT(*)
       FROM dbo.Node_Materials nm
       INNER JOIN dbo.Path_Nodes pn ON pn.NodeId = nm.NodeId
       WHERE pn.PathId = @pathId
         AND nm.MaterialType IN ('VIDEO', 'TEXT', 'DOC')
      ) AS MaterialCount
  `);
  const nodeCount = Number(result.recordset[0]?.NodeCount ?? 0);
  const activeNodeCount = Number(result.recordset[0]?.ActiveNodeCount ?? 0);
  const materialCount = Number(result.recordset[0]?.MaterialCount ?? 0);
  if (nodeCount < 1) {
    const error = new Error('Chương cần ít nhất 1 bài học trước khi xuất bản.');
    error.statusCode = 400;
    throw error;
  }
  if (materialCount < 1) {
    const error = new Error('Chương cần ít nhất 1 học liệu trước khi xuất bản.');
    error.statusCode = 400;
    throw error;
  }
  if (activeNodeCount < 1) {
    const error = new Error('Chương cần ít nhất 1 bài học được xuất bản trước khi xuất bản chương.');
    error.statusCode = 400;
    throw error;
  }
}

async function assertNodeCanPublish(nodeId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('nodeId', sql.Int, Number(nodeId));
  const result = await request.query(`
    SELECT COUNT(*) AS MaterialCount
    FROM dbo.Node_Materials
    WHERE NodeId = @nodeId
      AND MaterialType IN ('VIDEO', 'TEXT', 'DOC')
  `);
  const materialCount = Number(result.recordset[0]?.MaterialCount ?? 0);
  if (materialCount < 1) {
    const error = new Error('Bài học cần ít nhất 1 học liệu trước khi xuất bản.');
    error.statusCode = 400;
    throw error;
  }
}

async function countActiveNodesInPath(pathId, { excludeNodeId = null } = {}, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('pathId', sql.Int, Number(pathId));
  const excludeClause = excludeNodeId != null ? 'AND NodeId <> @excludeNodeId' : '';
  if (excludeNodeId != null) {
    request.input('excludeNodeId', sql.Int, Number(excludeNodeId));
  }
  const result = await request.query(`
    SELECT COUNT(*) AS ActiveNodeCount
    FROM dbo.Path_Nodes
    WHERE PathId = @pathId
      AND ISNULL(IsActive, 1) = 1
      ${excludeClause}
  `);
  return Number(result.recordset[0]?.ActiveNodeCount ?? 0);
}

async function unpublishPathIfNoActiveNodes(pathId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('pathId', sql.Int, Number(pathId));
  await request.query(`
    UPDATE dbo.Paths
    SET IsActive = 0
    WHERE PathId = @pathId
      AND ISNULL(IsActive, 1) = 1
      AND NOT EXISTS (
        SELECT 1
        FROM dbo.Path_Nodes pn
        WHERE pn.PathId = @pathId
          AND ISNULL(pn.IsActive, 1) = 1
      )
  `);
}

async function deletePathById(pathId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('pathId', sql.Int, Number(pathId));

  await request.query(`
    DELETE un
    FROM dbo.User_Nodes un
    INNER JOIN dbo.Path_Nodes pn ON pn.NodeId = un.NodeId
    WHERE pn.PathId = @pathId;

    DELETE nm
    FROM dbo.Node_Materials nm
    INNER JOIN dbo.Path_Nodes pn ON pn.NodeId = nm.NodeId
    WHERE pn.PathId = @pathId;

    DELETE FROM dbo.Path_Nodes WHERE PathId = @pathId;
    DELETE FROM dbo.Paths WHERE PathId = @pathId;
  `);
}

async function insertNodeRow(pathId, data = {}, transaction = null) {
  const nodeName = String(data.NodeName ?? data.nodeName ?? '').trim();
  if (!nodeName) {
    throw new Error('Mỗi bài học (Path_Nodes) phải có NodeName.');
  }

  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('PathId', sql.Int, Number(pathId));
  request.input('NodeName', sql.NVarChar(255), nodeName);
  request.input('NodeOrder', sql.Int, Number(data.NodeOrder ?? data.Order ?? 1));
  request.input('Description', sql.NVarChar(sql.MAX), data.Description ?? null);
  request.input('IsActive', sql.Bit, toPathIsActiveBit(data.IsActive, 0));

  const result = await request.query(`
    INSERT INTO dbo.Path_Nodes (PathId, NodeName, NodeOrder, Description, IsActive)
    OUTPUT INSERTED.NodeId AS NodeId
    VALUES (@PathId, @NodeName, @NodeOrder, @Description, @IsActive)
  `);
  return result.recordset[0]?.NodeId ?? null;
}

async function updateNodeById(nodeId, set = {}, transaction = null) {
  const fields = [];
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('nodeId', sql.Int, Number(nodeId));

  if (set.NodeName != null) {
    const nodeName = String(set.NodeName).trim();
    if (!nodeName) throw new Error('NodeName không được để trống.');
    request.input('NodeName', sql.NVarChar(255), nodeName);
    fields.push('NodeName = @NodeName');
  }
  if (set.Description !== undefined) {
    request.input('Description', sql.NVarChar(sql.MAX), set.Description ?? null);
    fields.push('Description = @Description');
  }
  if (set.NodeOrder != null || set.Order != null) {
    request.input('NodeOrder', sql.Int, Number(set.NodeOrder ?? set.Order));
    fields.push('NodeOrder = @NodeOrder');
  }
  if (set.IsActive !== undefined) {
    request.input('IsActive', sql.Bit, toPathIsActiveBit(set.IsActive, 1));
    fields.push('IsActive = @IsActive');
  }

  if (fields.length === 0) return nodeId;

  await request.query(`
    UPDATE dbo.Path_Nodes
    SET ${fields.join(', ')}
    WHERE NodeId = @nodeId
  `);
  return nodeId;
}

async function deleteNodeById(nodeId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('nodeId', sql.Int, Number(nodeId));

  await request.query(`
    DELETE FROM dbo.User_Nodes WHERE NodeId = @nodeId;
    DELETE FROM dbo.Node_Materials WHERE NodeId = @nodeId;
    DELETE FROM dbo.Path_Nodes WHERE NodeId = @nodeId;
  `);
}

async function insertMaterialRow(nodeId, data = {}, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  const materialUrl = data.MaterialUrl ?? data.Content ?? null;
  const requestedOrder = Number(data.MaterialOrder ?? data.Order);
  const hasRequestedOrder = Number.isInteger(requestedOrder) && requestedOrder > 0;

  request.input('NodeId', sql.Int, Number(nodeId));
  request.input('MaterialType', sql.NVarChar(20), data.MaterialType);
  request.input('Title', sql.NVarChar(255), data.Title ?? '');
  request.input('MaterialUrl', sql.NVarChar(sql.MAX), materialUrl);
  request.input('RequestedOrder', sql.Int, hasRequestedOrder ? requestedOrder : null);
  request.input('SourceType', sql.NVarChar(20), data.SourceType ?? null);
  request.input('FileName', sql.NVarChar(255), data.FileName ?? null);
  request.input(
    'FileSize',
    sql.BigInt,
    data.FileSize != null ? Number(data.FileSize) : null,
  );

  // Tránh trùng UQ_NodeMaterials_Order (NodeId, MaterialOrder):
  // dùng order client nếu còn trống, không thì MAX+1.
  const result = await request.query(`
    DECLARE @nextOrder INT;
    DECLARE @maxOrder INT;

    SELECT @maxOrder = ISNULL(MAX(MaterialOrder), 0)
    FROM dbo.Node_Materials
    WHERE NodeId = @NodeId;

    IF @RequestedOrder IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM dbo.Node_Materials
        WHERE NodeId = @NodeId AND MaterialOrder = @RequestedOrder
      )
    BEGIN
      SET @nextOrder = @RequestedOrder;
    END
    ELSE
    BEGIN
      SET @nextOrder = @maxOrder + 1;
    END

    INSERT INTO dbo.Node_Materials
      (NodeId, MaterialType, Title, MaterialUrl, MaterialOrder, SourceType, FileName, FileSize)
    OUTPUT INSERTED.MaterialId AS MaterialId, INSERTED.MaterialOrder AS MaterialOrder
    VALUES (@NodeId, @MaterialType, @Title, @MaterialUrl, @nextOrder, @SourceType, @FileName, @FileSize)
  `);
  return result.recordset[0]?.MaterialId ?? null;
}

async function updateMaterialById(materialId, set = {}, transaction = null) {
  const fields = [];
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('materialId', sql.Int, Number(materialId));

  if (set.MaterialType != null) {
    request.input('MaterialType', sql.NVarChar(20), set.MaterialType);
    fields.push('MaterialType = @MaterialType');
  }
  if (set.Title != null) {
    request.input('Title', sql.NVarChar(255), set.Title);
    fields.push('Title = @Title');
  }
  if (set.MaterialUrl !== undefined || set.Content !== undefined) {
    request.input('MaterialUrl', sql.NVarChar(sql.MAX), set.MaterialUrl ?? set.Content ?? null);
    fields.push('MaterialUrl = @MaterialUrl');
  }
  if (set.MaterialOrder != null || set.Order != null) {
    request.input('MaterialOrder', sql.Int, Number(set.MaterialOrder ?? set.Order));
    fields.push('MaterialOrder = @MaterialOrder');
  }
  if (set.SourceType !== undefined) {
    request.input('SourceType', sql.NVarChar(20), set.SourceType ?? null);
    fields.push('SourceType = @SourceType');
  }
  if (set.FileName !== undefined) {
    request.input('FileName', sql.NVarChar(255), set.FileName ?? null);
    fields.push('FileName = @FileName');
  }
  if (set.FileSize !== undefined) {
    request.input('FileSize', sql.BigInt, set.FileSize != null ? Number(set.FileSize) : null);
    fields.push('FileSize = @FileSize');
  }

  if (fields.length === 0) return materialId;

  await request.query(`
    UPDATE dbo.Node_Materials
    SET ${fields.join(', ')}
    WHERE MaterialId = @materialId
  `);
  return materialId;
}

async function deleteMaterialById(materialId, transaction = null) {
  const request = transaction ? new sql.Request(transaction) : new sql.Request();
  request.input('materialId', sql.Int, Number(materialId));
  await request.query(`DELETE FROM dbo.Node_Materials WHERE MaterialId = @materialId`);
}

module.exports = {
  getPathById,
  getNodeById,
  getMaterialById,
  getCourseIdByPathId,
  getCourseIdByNodeId,
  getCourseIdByMaterialId,
  recalculateCourseTotalLessons,
  insertPathRow,
  updatePathById,
  assertPathCanPublish,
  assertNodeCanPublish,
  countActiveNodesInPath,
  unpublishPathIfNoActiveNodes,
  deletePathById,
  insertNodeRow,
  updateNodeById,
  deleteNodeById,
  insertMaterialRow,
  updateMaterialById,
  deleteMaterialById,
};
