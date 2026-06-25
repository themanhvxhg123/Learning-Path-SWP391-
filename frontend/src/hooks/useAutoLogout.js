import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_TIME = 3 * 60 * 60 * 1000; // 3 tiếng 

export function useAutoLogout() {
    const navigate = useNavigate();

    useEffect(() => {
        let timeoutId;

        // Hàm thực hiện đăng xuất khi hết giờ hoặc quá hạn
        const logoutUser = () => {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('lastActivity');
            alert('Đã hết phiên đăng nhập do bạn không hoạt động trong thời gian dài.');
            navigate('/login');
        };

        // Hàm kiểm tra và cập nhật thời gian
        const resetTimer = () => {
            const now = Date.now();
            const lastActivity = localStorage.getItem('lastActivity');

            // Nếu đã quá 3 tiếng kể từ lần cuối tương tác thì đăng xuất luôn
            if (lastActivity && now - parseInt(lastActivity, 10) > INACTIVITY_TIME) {
                logoutUser();
                return;
            }

            // Cập nhật lại thời gian hoạt động mới nhất
            localStorage.setItem('lastActivity', now.toString());

            // Đặt lại đồng hồ đếm ngược cho tab hiện tại
            clearTimeout(timeoutId);
            timeoutId = setTimeout(logoutUser, INACTIVITY_TIME);
        };

        // Kiểm tra ngay khi vừa mở lại trang
        resetTimer();

        // Danh sách các hành động để nhận biết user đang tương tác
        const events = ['mousemove', 'keydown', 'click', 'scroll'];

        // Gán sự kiện lắng nghe vào toàn trang (window)
        const handleUserActivity = () => {
            // Dùng requestAnimationFrame hoặc throttle ở đây nếu cần tối ưu hiệu suất
            resetTimer();
        };

        events.forEach(event => {
            window.addEventListener(event, handleUserActivity);
        });

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, handleUserActivity);
            });
        };
    }, [navigate]);
}