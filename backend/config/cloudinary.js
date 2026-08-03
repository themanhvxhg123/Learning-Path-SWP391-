/**
 * Cấu hình SDK Cloudinary v2 cho BACKEND.
 *
 * Biến môi trường (.env): CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 * Dùng khi upload qua server (API secret) — TEXT/DOC/READING_DOC/AUDIO qua /api/materials/upload,
 * thumbnail tin tức, xóa asset, signed download.
 *
 * Upload VIDEO/AUDIO học liệu từ trình duyệt dùng unsigned preset (VITE_*), không qua file này.
 */
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;