// frontend/src/pages/AdminCoursesPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <p style={{ fontSize: 15, color: '#1a1a2e', marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}  style={styles.btnCancel}>Huỷ</button>
          <button onClick={onConfirm} style={styles.btnDanger}>Xác nhận xoá</button>
        </div>
      </div>
    </div>
  );
}

const LEVEL_COLORS = {
  'Người mới bắt đầu': { bg: '#dcfce7', color: '#16a34a' },
  'Cơ bản':            { bg: '#dbeafe', color: '#2563eb' },
  'Trung cấp':         { bg: '#fef9c3', color: '#ca8a04' },
  'Cao cấp':           { bg: '#fee2e2', color: '#dc2626' },
};

function LevelBadge({ level }) {
  const s = LEVEL_COLORS[level] ?? { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
    }}>
      {level}
    </span>
  );
}

export default function AdminCoursesPage() {
  const [courses,  setCourses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [confirm,  setConfirm]  = useState(null);
  const [toast,    setToast]    = useState('');

  const headers = () => {
    const user = JSON.parse(sessionStorage.getItem('user') ?? '{}');
    return { 'x-user-id': user.userId };
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchCourses = () => {
    setLoading(true);
    axios.get(`${API}/api/admin/courses`, { headers: headers() })
      .then((res) => setCourses(res.data.courses ?? []))
      .catch(() => setError('Không thể tải danh sách khoá học.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await axios.delete(`${API}/api/admin/courses/${confirm.courseId}`, { headers: headers() });
      showToast(`✅ Đã xoá khoá học "${confirm.courseName}"`);
      setConfirm(null);
      fetchCourses();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message ?? 'Lỗi server'}`);
      setConfirm(null);
    }
  };

  const filtered = courses.filter((c) =>
    c.CourseName?.toLowerCase().includes(search.toLowerCase()) ||
    c.InstructorName?.toLowerCase().includes(search.toLowerCase()) ||
    c.Category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Quản lý Khoá học</h1>
          <p style={styles.sub}>Tổng cộng {courses.length} khoá học trong hệ thống</p>
        </div>
      </div>

      {/* Search */}
      <div style={styles.toolbar}>
        <input
          style={styles.search}
          placeholder="🔍 Tìm theo tên khoá học, giảng viên, danh mục..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Table */}
      {loading ? (
        <div style={styles.loading}>Đang tải...</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Khoá học</th>
                <th style={styles.th}>Danh mục</th>
                <th style={styles.th}>Cấp độ</th>
                <th style={styles.th}>Giảng viên</th>
                <th style={styles.th}>Lượt đăng ký</th>
                <th style={styles.th}>Ngày tạo</th>
                <th style={styles.th}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.empty}>Không tìm thấy khoá học nào.</td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr key={c.CourseId} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{idx + 1}</td>

                    {/* Tên + thumbnail */}
                    <td style={{ ...styles.td, maxWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {c.Thumbnail ? (
                          <img
                            src={c.Thumbnail}
                            alt=""
                            style={{ width: 56, height: 38, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : (
                          <div style={styles.thumbPlaceholder}>📚</div>
                        )}
                        <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 13 }}>
                          {c.CourseName}
                        </span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={styles.categoryBadge}>{c.Category}</span>
                    </td>

                    <td style={styles.td}>
                      <LevelBadge level={c.Level} />
                    </td>

                    <td style={{ ...styles.td, color: '#6c63ff', fontWeight: 500 }}>
                      {c.InstructorName}
                    </td>

                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={styles.enrollBadge}>{c.TotalEnrollments ?? 0}</span>
                    </td>

                    <td style={styles.td}>
                      {c.CreatedAt
                        ? new Date(c.CreatedAt).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>

                    <td style={styles.td}>
                      <button
                        style={styles.btnDanger}
                        onClick={() => setConfirm({ courseId: c.CourseId, courseName: c.CourseName })}
                      >
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          message={`Bạn có chắc muốn xoá khoá học "${confirm.courseName}"? Hành động này không thể hoàn tác.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  pageHeader:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title:           { fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  sub:             { color: '#888', fontSize: 14, marginTop: 4 },
  toolbar:         { marginBottom: 20 },
  search:          { padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, width: 380, outline: 'none' },
  error:           { background: '#fff0f0', color: '#c0392b', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
  loading:         { textAlign: 'center', padding: 40, color: '#888' },
  tableWrap:       { background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', overflow: 'hidden' },
  table:           { width: '100%', borderCollapse: 'collapse' },
  thead:           { background: '#f8fafc' },
  th:              { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  td:              { padding: '12px 16px', fontSize: 14, color: '#374151', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven:          { background: '#fff' },
  trOdd:           { background: '#fafbff' },
  empty:           { textAlign: 'center', padding: 40, color: '#aaa' },
  thumbPlaceholder:{ width: 56, height: 38, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  categoryBadge:   { background: '#ede9fe', color: '#6c63ff', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  enrollBadge:     { background: '#f0fdf4', color: '#16a34a', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  btnDanger:       { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnCancel:       { background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, cursor: 'pointer' },
  overlay:         { position: 'fixed', inset: 0, background: '#0006', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:           { background: '#fff', borderRadius: 12, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 8px 32px #0002' },
  toast:           { position: 'fixed', bottom: 32, right: 32, background: '#1a1a2e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, zIndex: 2000, boxShadow: '0 4px 16px #0003' },
};