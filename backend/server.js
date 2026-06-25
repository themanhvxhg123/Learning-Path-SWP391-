// Node 21+ — ẩn DEP0040 punycode từ dependency (mssql/tedious, nodemailer…)
process.on('warning', (warning) => {
  if (warning.code === 'DEP0040') return;
  console.warn(warning);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/coursesRoutes');
const lookupRoutes = require('./routes/lookupRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const materialsRoutes = require('./routes/materialsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const questionBankRoutes = require('./routes/questionBankRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Middlewares ----
app.use(cors());
// Base64 ảnh 5MB (~6.7MB trong JSON) — limit phải lớn hơn ngưỡng validate thumbnail
app.use(express.json({ limit: '8mb' }));

// ---- Static: serve uploaded avatars ----
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Database ----
connectDB();

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api', lookupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/questionBank', questionBankRoutes)
// Link URL Courses's Avatar
// Static: serve course avatars
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
// ---- Health-check ----
app.use('/api/ping', (_req, res) => res.json({ status: 'ok', message: 'S.T.A.R Backend is running' }));

// ---- Start ----
const server = app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
});



server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} đang được dùng bởi process khác.`);
    console.error(`   Chạy: netstat -ano | findstr :${PORT}`);
    console.error('   Rồi:  taskkill /PID <PID> /F');
    process.exit(1);
  }
  throw err;
});
