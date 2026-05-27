// frontend/src/pages/admin/AdminDashboardPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
      <div style={styles.cardIcon}>{icon}</div>
      <div style={styles.cardValue}>{value ?? '...'}</div>
      <div style={styles.cardLabel}>{label}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats]   = useState(null);
  const [error, setError]   = useState('');

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user') ?? '{}');
    axios
      .get(`${API}/api/admin/dashboard`, {
        headers: { 'x-user-id': user.userId },
      })
      .then((res) => setStats(res.data.stats))
      .catch(() => setError('Không thể tải dữ liệu dashboard.'));
  }, []);

  return (
    <div>
      <h1 style={styles.title}>Dashboard</h1>
      <p style={styles.sub}>Tổng quan hệ thống S.T.A.R Learning Path</p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.grid}>
        <StatCard icon="👥" label="Người dùng"   value={stats?.totalUsers}        color="#6c63ff" />
        <StatCard icon="📚" label="Khoá học"     value={stats?.totalCourses}      color="#f6b93b" />
        <StatCard icon="🎓" label="Giảng viên"   value={stats?.totalInstructors}  color="#26de81" />
        <StatCard icon="📝" label="Lượt đăng ký" value={stats?.totalEnrollments}  color="#ff6b6b" />
      </div>
    </div>
  );
}

const styles = {
  title:      { fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  sub:        { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 32 },
  error:      { background: '#fff0f0', color: '#c0392b', padding: '12px 16px', borderRadius: 8, marginBottom: 24 },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 },
  card:       { background: '#fff', borderRadius: 12, padding: '24px 20px', boxShadow: '0 2px 8px #0001' },
  cardIcon:   { fontSize: 28, marginBottom: 12 },
  cardValue:  { fontSize: 32, fontWeight: 800, color: '#1a1a2e' },
  cardLabel:  { fontSize: 13, color: '#888', marginTop: 4 },
};