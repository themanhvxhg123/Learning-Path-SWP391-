// frontend/src/pages/AdminCategoriesPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

function Modal({ title, children, onClose }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <button onClick={onClose} style={styles.btnClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');

  // Modal state
  const [showAdd,    setShowAdd]    = useState(false);
  const [showEdit,   setShowEdit]   = useState(null); // category object
  const [showDelete, setShowDelete] = useState(null); // category object
  const [form,       setForm]       = useState({ categoryName: '', displayName: '' });
  const [formError,  setFormError]  = useState('');
  const [saving,     setSaving]     = useState(false);

  const headers = () => {
    const user = JSON.parse(sessionStorage.getItem('user') ?? '{}');
    return { 'x-user-id': user.userId };
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchCategories = () => {
    setLoading(true);
    axios.get(`${API}/api/admin/categories`, { headers: headers() })
      .then((res) => setCategories(res.data.categories ?? []))
      .catch(() => setError('Không thể tải danh mục.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => {
    setForm({ categoryName: '', displayName: '' });
    setFormError('');
    setShowAdd(true);
  };

  const openEdit = (cat) => {
    setForm({ categoryName: cat.CategoryName, displayName: cat.DisplayName });
    setFormError('');
    setShowEdit(cat);
  };

  const handleSaveAdd = async () => {
    if (!form.categoryName.trim() || !form.displayName.trim()) {
      setFormError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/api/admin/categories`,
        { categoryName: form.categoryName.trim(), displayName: form.displayName.trim() },
        { headers: headers() }
      );
      showToast('✅ Đã thêm danh mục mới.');
      setShowAdd(false);
      fetchCategories();
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Lỗi server.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!form.displayName.trim()) {
      setFormError('Tên hiển thị không được trống.');
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/categories/${showEdit.CategoryId}`,
        { displayName: form.displayName.trim() },
        { headers: headers() }
      );
      showToast('✅ Đã cập nhật danh mục.');
      setShowEdit(null);
      fetchCategories();
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Lỗi server.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await axios.delete(`${API}/api/admin/categories/${showDelete.CategoryId}`, { headers: headers() });
      showToast(`✅ Đã xoá danh mục "${showDelete.DisplayName}"`);
      setShowDelete(null);
      fetchCategories();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message ?? 'Lỗi server'}`);
      setShowDelete(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Quản lý Danh mục</h1>
          <p style={styles.sub}>Tổng cộng {categories.length} danh mục</p>
        </div>
        <button style={styles.btnAdd} onClick={openAdd}>+ Thêm danh mục</button>
      </div>

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
                <th style={styles.th}>Tên hệ thống</th>
                <th style={styles.th}>Tên hiển thị</th>
                <th style={styles.th}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} style={styles.empty}>Chưa có danh mục nào.</td>
                </tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr key={cat.CategoryId} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <code style={styles.code}>{cat.CategoryName}</code>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600, color: '#1a1a2e' }}>
                      {cat.DisplayName}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={styles.btnEdit}   onClick={() => openEdit(cat)}>Sửa</button>
                        <button style={styles.btnDanger} onClick={() => setShowDelete(cat)}>Xoá</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal thêm */}
      {showAdd && (
        <Modal title="Thêm danh mục mới" onClose={() => setShowAdd(false)}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tên hệ thống <span style={styles.hint}>(slug, không dấu)</span></label>
            <input
              style={styles.input}
              placeholder="vd: technology"
              value={form.categoryName}
              onChange={(e) => setForm(p => ({ ...p, categoryName: e.target.value }))}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tên hiển thị</label>
            <input
              style={styles.input}
              placeholder="vd: Công nghệ thông tin"
              value={form.displayName}
              onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))}
            />
          </div>
          {formError && <p style={styles.formError}>{formError}</p>}
          <div style={styles.modalFooter}>
            <button onClick={() => setShowAdd(false)} style={styles.btnCancel}>Huỷ</button>
            <button onClick={handleSaveAdd} style={styles.btnSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Thêm'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal sửa */}
      {showEdit && (
        <Modal title="Chỉnh sửa danh mục" onClose={() => setShowEdit(null)}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tên hệ thống</label>
            <input style={{ ...styles.input, background: '#f8fafc', color: '#aaa' }}
              value={form.categoryName} disabled />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tên hiển thị</label>
            <input
              style={styles.input}
              value={form.displayName}
              onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))}
            />
          </div>
          {formError && <p style={styles.formError}>{formError}</p>}
          <div style={styles.modalFooter}>
            <button onClick={() => setShowEdit(null)} style={styles.btnCancel}>Huỷ</button>
            <button onClick={handleSaveEdit} style={styles.btnSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal xoá */}
      {showDelete && (
        <Modal title="Xác nhận xoá" onClose={() => setShowDelete(null)}>
          <p style={{ fontSize: 15, color: '#374151', marginBottom: 24 }}>
            Bạn có chắc muốn xoá danh mục <strong>"{showDelete.DisplayName}"</strong>?
            Hành động này không thể hoàn tác.
          </p>
          <div style={styles.modalFooter}>
            <button onClick={() => setShowDelete(null)} style={styles.btnCancel}>Huỷ</button>
            <button onClick={handleDelete} style={styles.btnDanger}>Xác nhận xoá</button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:       { fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  sub:         { color: '#888', fontSize: 14, marginTop: 4 },
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
  code:        { background: '#f1f5f9', color: '#6c63ff', padding: '2px 8px', borderRadius: 4, fontSize: 13, fontFamily: 'monospace' },
  btnAdd:      { background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnEdit:     { background: '#ede9fe', color: '#6c63ff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnDanger:   { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnCancel:   { background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, cursor: 'pointer' },
  btnSave:     { background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnClose:    { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa', lineHeight: 1 },
  overlay:     { position: 'fixed', inset: 0, background: '#0006', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:       { background: '#fff', borderRadius: 12, padding: '28px 32px', maxWidth: 460, width: '90%', boxShadow: '0 8px 32px #0002' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle:  { fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  formGroup:   { marginBottom: 16 },
  label:       { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  hint:        { color: '#aaa', fontWeight: 400 },
  input:       { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  formError:   { color: '#dc2626', fontSize: 13, marginTop: -8, marginBottom: 12 },
  toast:       { position: 'fixed', bottom: 32, right: 32, background: '#1a1a2e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, zIndex: 2000, boxShadow: '0 4px 16px #0003' },
};