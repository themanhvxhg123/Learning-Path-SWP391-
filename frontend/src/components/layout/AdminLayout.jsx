// frontend/src/components/layout/AdminLayout.jsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
    { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/admin/users', icon: '👥', label: 'Người dùng' },
    { to: '/admin/courses', icon: '📚', label: 'Khoá học' },
    { to: '/admin/mentors', icon: '🎓', label: 'Mentor' },
    { to: '/admin/categories', icon: '🗂️', label: 'Danh mục' },
    { to: '/admin/report', icon: '📈', label: 'Báo cáo' },
];

export default function AdminLayout() {
    const navigate = useNavigate();
    const raw = sessionStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        navigate('/login', { replace: true });
    };

    return (
        <div style={styles.shell}>
            {/* ── Sidebar ── */}
            <aside style={styles.sidebar}>
                <div style={styles.brand}>⭐ STAR Admin</div>

                <nav style={styles.nav}>
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            style={({ isActive }) => ({
                                ...styles.navItem,
                                ...(isActive ? styles.navItemActive : {}),
                            })}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div style={styles.sidebarFooter}>
                    <div style={styles.userInfo}>
                        <div style={styles.avatar}>
                            {user?.fullName?.charAt(0).toUpperCase() ?? 'A'}
                        </div>
                        <div>
                            <div style={styles.userName}>{user?.fullName ?? 'Admin'}</div>
                            <div style={styles.userRole}>Administrator</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        🚪 Đăng xuất
                    </button>
                </div>
            </aside>

            {/* ── Main content ── */}
            <main style={styles.main}>
                <Outlet />
            </main>
        </div>
    );
}

const styles = {
    shell: {
        display: 'flex',
        minHeight: '100vh',
        background: '#f4f6fb',
        fontFamily: "'Segoe UI', Arial, sans-serif",
    },
    sidebar: {
        width: 240,
        minHeight: '100vh',
        background: '#0f0e17',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
    },
    brand: {
        padding: '28px 24px 20px',
        fontSize: 18,
        fontWeight: 700,
        color: '#a78bfa',
        letterSpacing: 1,
        borderBottom: '1px solid #1e1d2e',
    },
    nav: {
        flex: 1,
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 8,
        color: '#9090a0',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 500,
        transition: 'all 0.15s',
    },
    navItemActive: {
        background: 'linear-gradient(135deg,#6c63ff22,#a78bfa22)',
        color: '#a78bfa',
        fontWeight: 600,
    },
    sidebarFooter: {
        padding: '16px 12px',
        borderTop: '1px solid #1e1d2e',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'linear-gradient(135deg,#6c63ff,#a78bfa)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 15,
        flexShrink: 0,
    },
    userName: { color: '#e0e0f0', fontSize: 13, fontWeight: 600 },
    userRole: { color: '#6060a0', fontSize: 11 },
    logoutBtn: {
        background: 'none',
        border: '1px solid #2a2a3e',
        borderRadius: 8,
        color: '#9090a0',
        padding: '8px 12px',
        fontSize: 13,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
    },
    main: {
        marginLeft: 240,
        flex: 1,
        padding: '32px 36px',
        minHeight: '100vh',
    },
};