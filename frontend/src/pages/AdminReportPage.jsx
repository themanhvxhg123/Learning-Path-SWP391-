// frontend/src/pages/AdminReportPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export default function AdminReportPage() {
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const headers = () => {
    const user = JSON.parse(sessionStorage.getItem('user') ?? '{}');
    return { 'x-user-id': user.userId };
  };

  useEffect(() => {
    axios.get(`${API}/api/admin/report/activity`, { headers: headers() })
      .then((res) => setReport(res.data.report))
      .catch(() => setError('Không thể tải dữ liệu báo cáo.'))
      .finally(() => setLoading(false));
  }, []);

  const maxEnroll = report?.topCourses?.length
    ? Math.max(...report.topCourses.map((c) => c.Enrollments))
    : 1;

  const maxUsers = report?.usersByMonth?.length
    ? Math.max(...report.usersByMonth.map((m) => m.NewUsers))
    : 1;

  return (
    <div>
      <h1 style={styles.title}>Báo cáo hoạt động</h1>
      <p style={styles.sub}>Thống kê chi tiết hoạt động hệ thống S.T.A.R Learning Path</p>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Đang tải...</div>
      ) : (
        <div style={styles.row}>
          {/* Top khoá học */}
          <div style={styles.chartBox}>
            <h2 style={styles.chartTitle}>🏆 Top 5 khoá học được đăng ký nhiều nhất</h2>
            {!report?.topCourses?.length ? (
              <p style={styles.noData}>Chưa có dữ liệu.</p>
            ) : (
              <div style={styles.barList}>
                {report.topCourses.map((c, i) => (
                  <div key={i} style={styles.barItem}>
                    <div style={styles.barLabel}>
                      <span style={styles.barRank}>{i + 1}</span>
                      <span style={styles.barName}>{c.CourseName}</span>
                      <span style={styles.barCount}>{c.Enrollments}</span>
                    </div>
                    <div style={styles.barTrack}>
                      <div style={{
                        ...styles.barFill,
                        width: `${(c.Enrollments / maxEnroll) * 100}%`,
                        background: ['#6c63ff','#f6b93b','#26de81','#ff6b6b','#38bdf8'][i],
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User mới theo tháng */}
          <div style={styles.chartBox}>
            <h2 style={styles.chartTitle}>📅 Người dùng mới theo tháng</h2>
            {!report?.usersByMonth?.length ? (
              <p style={styles.noData}>Chưa có dữ liệu.</p>
            ) : (
              <div style={styles.monthChart}>
                {report.usersByMonth.map((m, i) => (
                  <div key={i} style={styles.monthCol}>
                    <div style={styles.monthCount}>{m.NewUsers}</div>
                    <div style={styles.monthBarWrap}>
                      <div style={{
                        ...styles.monthBar,
                        height: `${Math.max(8, (m.NewUsers / maxUsers) * 140)}px`,
                      }} />
                    </div>
                    <div style={styles.monthLabel}>{m.Month?.slice(5)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  title:        { fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  sub:          { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 28 },
  error:        { background: '#fff0f0', color: '#c0392b', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
  loading:      { textAlign: 'center', padding: 40, color: '#888' },
  row:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  chartBox:     { background: '#fff', borderRadius: 12, padding: '24px 20px', boxShadow: '0 2px 8px #0001' },
  chartTitle:   { fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 20, marginTop: 0 },
  noData:       { color: '#aaa', fontSize: 14 },
  barList:      { display: 'flex', flexDirection: 'column', gap: 14 },
  barItem:      { display: 'flex', flexDirection: 'column', gap: 6 },
  barLabel:     { display: 'flex', alignItems: 'center', gap: 8 },
  barRank:      { width: 22, height: 22, borderRadius: '50%', background: '#ede9fe', color: '#6c63ff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  barName:      { fontSize: 13, color: '#374151', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  barCount:     { fontSize: 13, fontWeight: 700, color: '#6c63ff' },
  barTrack:     { height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4, transition: 'width 0.4s' },
  monthChart:   { display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, paddingTop: 20 },
  monthCol:     { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  monthCount:   { fontSize: 12, fontWeight: 700, color: '#6c63ff' },
  monthBarWrap: { flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' },
  monthBar:     { width: '100%', background: 'linear-gradient(180deg,#6c63ff,#a78bfa)', borderRadius: '4px 4px 0 0', minHeight: 8 },
  monthLabel:   { fontSize: 11, color: '#888', marginTop: 4 },
};