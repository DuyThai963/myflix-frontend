"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: number | string;
  username: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  login: (usernameInput: string, passwordInput: string) => Promise<boolean>;
  register: (usernameInput: string, passwordInput: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // 🛡️ Hàm kiểm tra tính hợp lệ và thời hạn của JWT Token (Chống fake token bằng console)
  const isValidJwt = (tokenStr: string): boolean => {
    try {
      const parts = tokenStr.split(".");
      if (parts.length !== 3) return false;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const parsed = JSON.parse(jsonPayload);
      if (parsed.exp && parsed.exp * 1000 < Date.now()) {
        return false; // Token đã hết hạn 7 ngày
      }
      return true;
    } catch (err) {
      return false; // Token rác / Fake từ Console
    }
  };

  // 🔄 Kiểm tra token khởi tạo từ localStorage khi client mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("myflix_token");
      const savedUser = localStorage.getItem("myflix_user");
      if (savedToken && savedUser && isValidJwt(savedToken)) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setIsLoggedIn(true);
      } else if (savedToken) {
        // Xóa token giả/hết hạn
        localStorage.removeItem("myflix_token");
        localStorage.removeItem("myflix_user");
      }
    } catch (err) {
      console.error("Lỗi đọc thông tin xác thực từ localStorage:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 🔐 Hàm Xử lý Đăng Nhập
  const login = async (usernameInput: string, passwordInput: string): Promise<boolean> => {
    setAuthError(null);
    const cleanUsername = usernameInput.trim();
    const cleanPassword = passwordInput.trim();

    if (!cleanUsername || !cleanPassword) {
      setAuthError("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");
      return false;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Tài khoản hoặc mật khẩu không chính xác!");
        return false;
      }

      // Lưu hộ chiếu danh tính
      localStorage.setItem("myflix_token", data.token);
      localStorage.setItem("myflix_user", JSON.stringify(data.user));

      // Luồng cứu hộ dữ liệu lịch sử xem local cũ đẩy lên DB
      const localHist = localStorage.getItem("myflix_history");
      if (localHist) {
        try {
          const parsedHist = JSON.parse(localHist);
          if (parsedHist.length > 0) {
            await fetch(`${backendUrl}/api/history/sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: data.user.id, localHistory: parsedHist })
            });
            localStorage.removeItem("myflix_history");
          }
        } catch (syncErr) {
          console.error("❌ Lỗi sync mảng lịch sử:", syncErr);
        }
      }

      window.dispatchEvent(new Event("myflix_history_updated"));
      setToken(data.token);
      setUser(data.user);
      setIsLoggedIn(true);
      return true;
    } catch (err) {
      setAuthError("Không thể kết nối tới Server Backend!");
      return false;
    }
  };

  // 📝 Hàm Xử lý Đăng Ký Tài Khoản Mới
  const register = async (usernameInput: string, passwordInput: string): Promise<boolean> => {
    setAuthError(null);
    const cleanUsername = usernameInput.trim();
    const cleanPassword = passwordInput.trim();

    if (!cleanUsername || !cleanPassword) {
      setAuthError("Vui lòng điền đầy đủ thông tin đăng ký!");
      return false;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Đăng ký thất bại!");
        return false;
      }

      // Đăng ký thành công -> Tự động đăng nhập
      return await login(cleanUsername, cleanPassword);
    } catch (err) {
      setAuthError("Không thể kết nối tới Server Backend!");
      return false;
    }
  };

  // 🚪 Hàm Xử lý Đăng Xuất
  const logout = () => {
    localStorage.removeItem("myflix_token");
    localStorage.removeItem("myflix_user");
    window.dispatchEvent(new Event("myflix_history_updated"));
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn,
        isLoading,
        authError,
        setAuthError,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
