import { createContext, useContext, useState, useEffect } from 'react';
import { clearAllQuestionBankCreateDrafts } from '@/features/mentor/hooks/useQuestionBankCreateBootstrap';

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
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Hàm Đăng xuất: Quét sạch sành sanh
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    clearAllQuestionBankCreateDrafts();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}


// 3. Hook để các trang khác moi dữ liệu ra dùng
export const useAuth = () => useContext(AuthContext);