const sql = require('mssql');
// override: true — ưu tiên .env hơn biến môi trường Windows (tránh DB_USER=he180380 cũ)
require('dotenv').config({ override: true });

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'LearningPath_Base',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'sa123',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const connectDB = async () => {
  try {
    console.log(`Đang kết nối tới ${dbConfig.server}:${dbConfig.port}/${dbConfig.database} (user: ${dbConfig.user})...`);
    await sql.connect(dbConfig);
    console.log('✅ Kết nối SQL Server thành công!');
  } catch (err) {
    console.error('❌ Lỗi kết nối Database:', err.message);
    console.log('Mẹo: Kiểm tra SQL Server đã bật Mixed Mode Authentication và TCP/IP Port 1433 chưa.');
  }
};

module.exports = { sql, connectDB};