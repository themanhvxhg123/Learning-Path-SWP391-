// frontend/src/pages/AdminMentorsPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export default function AdminMentorsPage() {
  const [mentors,  setMentors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [toast,    setToast]    = useState('');

  const headers = () => {
    const user = JSON.parse(sessionStorage.getItem('user') ?? '{}');
    return { 'x-user-id': user.userId };
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchMentors = () => {
    setLoading(true);
    axios.get(`${API}/api/admin/instructors`, { headers: headers() })
      .then((res) => setMentors(res.data.instructors ?? []))
      .catch(() => setError('Không thể tải danh sách mentor.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMentors(); }, []);

  const handleRemoveMentor = async (userId, fullName) => {
    try {
      await axios.post(`${API}/api/admin/roles/remove`,
        { userId, roleName: 'Mentor' },
        { headers: headers() }
      );
      showToast(`✅ Đã huỷ Mentor của ${fullName}`);
      fetchMentors();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message ?? 'Lỗi server'}`);
    }
  };

  const filtered = mentors.filter((m) =>
    m.FullName?.toLowerCase().includes(search.toLowerCase()) ||
    m.Email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Quản lý Mentor</h1>
          <p style={styles.sub}>Tổng cộng {mentors.length} mentor trong hệ thống</p>
        </div>
      </div>

      {/* Search */}
      <div style={styles.toolbar}>
        <input
          style={styles.search}
          placeholder="🔍 Tìm theo tên hoặc email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Grid */}
      {loading ? (
        <div style={styles.loading}>Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>Không tìm thấy mentor nào.</div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((m) => (
            <div key={m.InstructorId} style={styles.card}>
              {/* Avatar + tên */}
              <div style={styles.cardTop}>
                {m.AvatarUrl ? (
                  <img src={m.AvatarUrl} alt="" style={styles.avatar} />
                ) : (
                  <div style={styles.avatarFallback}>
                    {m.FullName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={styles.name}>{m.FullName}</div>
                  <div style={styles.email}>{m.Email}</div>
                </div>
              </div>

              {/* Divider */}
              <div style={styles.divider} />

              {/* Info */}
              <div style={styles.infoRow}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Điện thoại</span>
                  <span style={styles.infoValue}>{m.Phone ?? '—'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Khoá học</span>
                  <span style={{ ...styles.infoValue, color: '#6c63ff', fontWeight: 700 }}>
                    {m.TotalCourses ?? 0}
                  </span>
                </div>
              </div>

              {/* Bio */}
              {m.Bio && (
                <p style={styles.bio}>{m.Bio}</p>
              )}

              {/* Action */}
              <button
                style={styles.btnRemove}
                onClick={() => handleRemoveMentor(m.UserId, m.FullName)}
              >
                Huỷ vai trò Mentor
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  pageHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title:         { fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  sub:           { color: '#888', fontSize: 14, marginTop: 4 },
  toolbar:       { marginBottom: 20 },
  search:        { padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, width: 320, outline: 'none' },
  error:         { background: '#fff0f0', color: '#c0392b', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
  loading:       { textAlign: 'center', padding: 40, color: '#888' },
  empty:         { textAlign: 'center', padding: 40, color: '#aaa' },
  grid:          { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
  card:          { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px #0001', display: 'flex', flexDirection: 'column', gap: 0 },
  cardTop:       { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar:        { width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  avatarFallback:{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 },
  name:          { fontWeight: 700, fontSize: 15, color: '#1a1a2e' },
  email:         { fontSize: 13, color: '#888', marginTop: 2 },
  divider:       { height: 1, background: '#f1f5f9', marginBottom: 16 },
  infoRow:       { display: 'flex', gap: 24, marginBottom: 12 },
  infoItem:      { display: 'flex', flexDirection: 'column', gap: 2 },
  infoLabel:     { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:     { fontSize: 14, color: '#374151', fontWeight: 600 },
  bio:           { fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16, marginTop: 4 },
  btnRemove:     { marginTop: 'auto', background: '#fff0f0', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600, width: '100%' },
  toast:         { position: 'fixed', bottom: 32, right: 32, background: '#1a1a2e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, zIndex: 2000, boxShadow: '0 4px 16px #0003' },
};