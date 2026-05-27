// frontend/src/pages/AdminUsersPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

const ROLE_COLORS = {
  Admin:   { bg: '#ede9fe', color: '#6c63ff' },
  Mentor:  { bg: '#fef9c3', color: '#ca8a04' },
  Student: { bg: '#dcfce7', color: '#16a34a' },
};

function RoleBadge({ role }) {
  const s = ROLE_COLORS[role] ?? { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
    }}>
      {role}
    </span>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <p style={{ fontSize: 15, color: '#1a1a2e', marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={styles.btnCancel}>Huỷ</button>
          <button onClick={onConfirm} style={styles.btnDanger}>Xác nhận xoá</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [confirm, setConfirm] = useState(null); // { userId, fullName }
  const [toast,   setToast]   = useState('');

  const headers = () => {
    const user = JSON.parse(sessionStorage.getItem('user') ?? '{}');
    return { 'x-user-id': user.userId };
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchUsers = () => {
    setLoading(true);
    axios.get(`${API}/api/admin/users`, { headers: headers() })
      .then((res) => setUsers(res.data.users ?? []))
      .catch(() => setError('Không thể tải danh sách người dùng.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAssignMentor = async (userId, fullName) => {
    try {
      await axios.post(`${API}/api/admin/roles/assign`,
        { userId, roleName: 'Mentor' },
        { headers: headers() }
      );
      showToast(`✅ Đã gán Mentor cho ${fullName}`);
      fetchUsers();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message ?? 'Lỗi server'}`);
    }
  };

  const handleRemoveMentor = async (userId, fullName) => {
    try {
      await axios.post(`${API}/api/admin/roles/remove`,
        { userId, roleName: 'Mentor' },
        { headers: headers() }
      );
      showToast(`✅ Đã huỷ Mentor của ${fullName}`);
      fetchUsers();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message ?? 'Lỗi server'}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await axios.delete(`${API}/api/admin/users/${confirm.userId}`, { headers: headers() });
      showToast(`✅ Đã xoá người dùng ${confirm.fullName}`);
      setConfirm(null);
      fetchUsers();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message ?? 'Lỗi server'}`);
      setConfirm(null);
    }
  };

  const filtered = users.filter((u) =>
    u.FullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.Email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Quản lý Người dùng</h1>
          <p style={styles.sub}>Tổng cộng {users.length} tài khoản trong hệ thống</p>
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

      {/* Table */}
      {loading ? (
        <div style={styles.loading}>Đang tải...</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Họ tên</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Điện thoại</th>
                <th style={styles.th}>Vai trò</th>
                <th style={styles.th}>Ngày tạo</th>
                <th style={styles.th}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.empty}>Không tìm thấy người dùng nào.</td>
                </tr>
              ) : (
                filtered.map((u, idx) => {
                  const roles     = u.Roles ? u.Roles.split(', ') : [];
                  const isMentor  = roles.includes('Mentor');
                  const isAdmin   = roles.includes('Admin');

                  return (
                    <tr key={u.UserId} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={{ ...styles.td, fontWeight: 600, color: '#1a1a2e' }}>
                        {u.FullName}
                      </td>
                      <td style={styles.td}>{u.Email}</td>
                      <td style={styles.td}>{u.Phone ?? '—'}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {roles.map((r) => <RoleBadge key={r} role={r} />)}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {u.CreatedAt
                          ? new Date(u.CreatedAt).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Không cho xoá/sửa Admin */}
                          {!isAdmin && (
                            <>
                              {isMentor ? (
                                <button
                                  style={styles.btnWarning}
                                  onClick={() => handleRemoveMentor(u.UserId, u.FullName)}
                                >
                                  Huỷ Mentor
                                </button>
                              ) : (
                                <button
                                  style={styles.btnPrimary}
                                  onClick={() => handleAssignMentor(u.UserId, u.FullName)}
                                >
                                  + Mentor
                                </button>
                              )}
                              <button
                                style={styles.btnDanger}
                                onClick={() => setConfirm({ userId: u.UserId, fullName: u.FullName })}
                              >
                                Xoá
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <span style={{ color: '#aaa', fontSize: 12 }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirm && (
        <ConfirmModal
          message={`Bạn có chắc muốn xoá tài khoản "${confirm.fullName}"? Hành động này không thể hoàn tác.`}
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
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title:       { fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  sub:         { color: '#888', fontSize: 14, marginTop: 4 },
  toolbar:     { marginBottom: 20 },
  search:      { padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, width: 320, outline: 'none' },
  error:       { background: '#fff0f0', color: '#c0392b', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
  loading:     { textAlign: 'center', padding: 40, color: '#888' },
  tableWrap:   { background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', overflow: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  thead:       { background: '#f8fafc' },
  th:          { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  td:          { padding: '12px 16px', fontSize: 14, color: '#374151', borderBottom: '1px solid #f1f5f9' },
  trEven:      { background: '#fff' },
  trOdd:       { background: '#fafbff' },
  empty:       { textAlign: 'center', padding: 40, color: '#aaa' },
  btnPrimary:  { background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnWarning:  { background: '#fef9c3', color: '#ca8a04', border: '1px solid #fde68a', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnDanger:   { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnCancel:   { background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, cursor: 'pointer' },
  overlay:     { position: 'fixed', inset: 0, background: '#0006', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:       { background: '#fff', borderRadius: 12, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 8px 32px #0002' },
  toast:       { position: 'fixed', bottom: 32, right: 32, background: '#1a1a2e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, zIndex: 2000, boxShadow: '0 4px 16px #0003' },
};