/**
 * Đồng bộ URL Cloudinary với state khóa học (paths → nodes → materials).
 *
 * uploadPendingMaterialsInPaths / uploadPendingMaterialInPath:
 *   Trước khi gọi API lưu nội dung khóa — upload TEXT (HTML) và DOC (File) chưa có MaterialUrl.
 *   VIDEO đã upload ngay khi chọn file trong MentorVideoMaterialEditor.
 *
 * hydrateTextMaterialsInPaths / hydrateSingleTextMaterial:
 *   Sau khi load từ API — TEXT chỉ có MaterialUrl → fetch HTML qua backend proxy.
 */
import { uploadDocMaterial, uploadTextMaterial, fetchTextMaterialHtml } from '@/features/mentor/services/materialUploadService';
import {
  DOC_SOURCE_LINK,
  DOC_SOURCE_UPLOAD,
  filterLearningMaterials,
  isHtmlContentEmpty,
  resolveDocSourceType,
  withNormalizedOrders,
} from './mentorCourseContentUtils';

function isBrowserFile(value) {
  return typeof File !== 'undefined' && value instanceof File;
}

/** Upload một học liệu TEXT/DOC nếu còn nội dung/file local chưa đẩy lên Cloudinary. */
async function uploadSingleMaterial(material) {
  if (material.MaterialType === 'TEXT') {
    const content = String(material.Content ?? '').trim();
    if (isHtmlContentEmpty(content)) {
      return material;
    }

    const uploaded = await uploadTextMaterial({
      html: content,
      title: material.Title || 'text-material',
    });

    return {
      ...material,
      MaterialUrl: uploaded.url ?? material.MaterialUrl ?? null,
      FileName: uploaded.fileName ?? null,
      FileSize: uploaded.fileSize ?? null,
      SourceType: 'UPLOAD',
      File: null,
    };
  }

  if (material.MaterialType === 'DOC') {
    const sourceType = resolveDocSourceType(material);
    if (sourceType === DOC_SOURCE_LINK) {
      return material;
    }

    if (!isBrowserFile(material.File)) {
      return material;
    }

    const uploaded = await uploadDocMaterial(material.File);
    return {
      ...material,
      MaterialUrl: uploaded.url ?? null,
      FileName: uploaded.fileName ?? material.File.name,
      FileSize: uploaded.fileSize ?? material.File.size,
      SourceType: DOC_SOURCE_UPLOAD,
      File: null,
    };
  }

  // VIDEO: đã upload Cloudinary ngay khi chọn file — lúc lưu chỉ cần URL.
  return material;
}

/** Nếu Content trống nhưng có MaterialUrl → tải HTML từ Cloudinary (qua /api/materials/text-content). */
async function hydrateTextMaterial(material) {
  if (material.MaterialType !== 'TEXT') return material;

  const content = String(material.Content ?? '').trim();
  if (!isHtmlContentEmpty(content)) return material;

  const materialUrl = String(material.MaterialUrl ?? '').trim();
  if (!materialUrl) return material;

  try {
    const html = await fetchTextMaterialHtml(materialUrl);
    if (!html || isHtmlContentEmpty(html)) return material;
    return { ...material, Content: html };
  } catch {
    return material;
  }
}

/** Hydrate Content cho một học liệu TEXT (dùng khi khôi phục từ API). */
export async function hydrateSingleTextMaterial(material) {
  return hydrateTextMaterial(material);
}

/** Tải HTML từ Cloudinary vào Content cho học liệu TEXT khi mở trang edit. */
export async function hydrateTextMaterialsInPaths(paths = []) {
  const normalized = withNormalizedOrders(paths);
  const nextPaths = [];

  for (const path of normalized) {
    const nextNodes = [];
    for (const node of path.nodes ?? []) {
      const nextMaterials = [];
      for (const material of node.materials ?? []) {
        nextMaterials.push(await hydrateTextMaterial(material));
      }
      nextNodes.push({ ...node, materials: nextMaterials });
    }
    nextPaths.push({ ...path, nodes: nextNodes });
  }

  return nextPaths;
}

/** Upload TEXT/DOC học liệu chưa có URL lên Cloudinary trước khi lưu khóa học. */
export async function uploadPendingMaterialsInPaths(paths = []) {
  const normalized = withNormalizedOrders(paths);
  const nextPaths = [];

  for (const path of normalized) {
    const nextNodes = [];
    for (const node of path.nodes ?? []) {
      const nextMaterials = [];
      for (const material of filterLearningMaterials(node.materials ?? [])) {
        nextMaterials.push(await uploadSingleMaterial(material));
      }
      nextNodes.push({ ...node, materials: nextMaterials });
    }
    nextPaths.push({ ...path, nodes: nextNodes });
  }

  return nextPaths;
}

/** Chỉ upload một học liệu đang lưu — tránh quét/upload cả path. */
export async function uploadPendingMaterialInPath(
  paths = [],
  pathTempId,
  nodeTempId,
  materialTempId,
) {
  const normalized = withNormalizedOrders(paths);
  let uploadedMaterial = null;

  const nextPaths = normalized.map((path) => {
    if (path.tempId !== pathTempId) return path;
    return {
      ...path,
      nodes: (path.nodes ?? []).map((node) => {
        if (node.tempId !== nodeTempId) return node;
        return {
          ...node,
          materials: filterLearningMaterials(node.materials ?? []).map((material) => {
            if (material.tempId !== materialTempId) return material;
            return material;
          }),
        };
      }),
    };
  });

  const targetPath = nextPaths.find((path) => path.tempId === pathTempId);
  const targetNode = (targetPath?.nodes ?? []).find((node) => node.tempId === nodeTempId);
  const targetMaterial = filterLearningMaterials(targetNode?.materials ?? [])
    .find((material) => material.tempId === materialTempId);

  if (targetMaterial) {
    uploadedMaterial = await uploadSingleMaterial(targetMaterial);
  }

  const resultPaths = nextPaths.map((path) => {
    if (path.tempId !== pathTempId) return path;
    return {
      ...path,
      nodes: (path.nodes ?? []).map((node) => {
        if (node.tempId !== nodeTempId) return node;
        return {
          ...node,
          materials: filterLearningMaterials(node.materials ?? []).map((material) => (
            material.tempId === materialTempId && uploadedMaterial
              ? uploadedMaterial
              : material
          )),
        };
      }),
    };
  });

  return [resultPaths.find((path) => path.tempId === pathTempId) ?? targetPath, uploadedMaterial];
}
