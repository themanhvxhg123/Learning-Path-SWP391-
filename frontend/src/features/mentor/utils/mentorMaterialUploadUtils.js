import { uploadDocMaterial, uploadTextMaterial, fetchTextMaterialHtml } from '@/features/mentor/services/materialUploadService';
import {
  DOC_SOURCE_LINK,
  DOC_SOURCE_UPLOAD,
  filterLearningMaterials,
  isHtmlContentEmpty,
  withNormalizedOrders,
} from './mentorCourseContentUtils';
function isBrowserFile(value) {
  return typeof File !== 'undefined' && value instanceof File;
}

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
    const sourceType = material.SourceType === DOC_SOURCE_LINK ? DOC_SOURCE_LINK : DOC_SOURCE_UPLOAD;
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

  return material;
}

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
