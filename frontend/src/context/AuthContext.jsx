import { createContext, useContext, useState, useEffect } from 'react';

// 1. Khởi tạo Nhà Kho
const AuthContext = createContext();

// 2. Component Bọc (Provider) để truyền dữ liệu đi toàn web
export function AuthProvider({ children }) {
  console.log("AuthContext: AuthProvider is rendering. children received:", !!children);
  const [user, setUser] = useState(null);

  // Lúc trang web vừa chạy lên, vào két sắt (localStorage) xem có ai đang đăng nhập không
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Dữ liệu trong localStorage bị hỏng:", error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Hàm Đăng nhập: Cất vào bộ nhớ React + Cất vào két sắt
  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('token', token); ////CẤT JWT VÀO KÉT SẮT TRÌNH DUYỆT
    }
  };

  // Hàm Đăng xuất: Quét sạch sành sanh
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('avatarUrl'); // Xóa luôn avatar cũ để không bị dính sang tài khoản khác
    localStorage.removeItem('rawAvatar'); // Xóa ảnh thô chưa crop
    localStorage.removeItem('rawFrame'); // Xóa khung viền cũ
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}


// 3. Hook để các trang khác moi dữ liệu ra dùng
export const useAuth = () => useContext(AuthContext);