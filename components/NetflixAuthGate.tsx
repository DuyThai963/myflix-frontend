"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function NetflixAuthGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, login, authError } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 🔄 Cách 2: Chỉ lưu Tên tài khoản trong localStorage, còn Mật khẩu giao cho Trình duyệt Chrome/Safari lưu
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("myflix_remember_username");
      if (savedUser) {
        setUsername(savedUser);
        setRememberMe(true);
      }
      // Đảm bảo không lưu mật khẩu thô trong localStorage
      localStorage.removeItem("myflix_remember_password");
    } catch (err) {
      console.error("Lỗi đọc thông tin ghi nhớ tài khoản:", err);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

      // Kích hoạt Credential Management API cho trình duyệt Chrome/Safari/Edge
      if (typeof window !== "undefined" && "PasswordCredential" in window) {
        try {
          const cred = new (window as any).PasswordCredential({
            id: cleanUsername,
            password: cleanPassword,
            name: cleanUsername,
          });
          if (navigator.credentials && navigator.credentials.store) {
            await navigator.credentials.store(cred);
          }
        } catch (credErr) {
          // Bỏ qua nếu trình duyệt chặn
        }
      }

      const success = await login(cleanUsername, cleanPassword);
      if (success) {
        if (rememberMe) {
          localStorage.setItem("myflix_remember_username", cleanUsername);
        } else {
          localStorage.removeItem("myflix_remember_username");
        }
        localStorage.removeItem("myflix_remember_password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Trong lúc hydration đọc token ban đầu -> Hiển thị loader nhẹ
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-[#e50914] rounded-full animate-spin" />
      </div>
    );
  }

  // 2. Đã đăng nhập -> Mở khóa toàn bộ nội dung ứng dụng
  if (isLoggedIn) {
    return <>{children}</>;
  }

  // 3. Chưa đăng nhập -> Màn hình Giao diện Đăng nhập Netflix Full Screen (Fit 100vh)
  return (
    <div className="relative w-full bg-[#000000] text-white flex flex-col select-none overflow-x-hidden font-sans">
      
      {/* SECTION 1: HERO CONTAINER - FIT 100% CHIỀU CAO MÀN HÌNH (MIN-H-SCREEN) */}
      <div className="relative min-h-screen w-full bg-[linear-gradient(180deg,#3d060b_0%,#180305_25%,#0d0d0d_60%,#000000_100%)] flex flex-col justify-between">
        
        {/* HEADER: LOGO MYFLIX CHUẨN ĐỎ NETFLIX */}
        <header
          className="relative z-10 flex items-center justify-between px-8 sm:px-16 md:px-32 py-7 sm:py-9"
          style={{ paddingTop: 'max(1.75rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
        >
          <h1 className="text-[#e50914] text-4xl sm:text-5xl font-black tracking-tighter cursor-pointer drop-shadow-lg">
            MYFLIX
          </h1>
        </header>

        {/* MAIN FORM: CĂN GIỮA TUYỆT ĐỐI THEO CHIỀU DỌC TRONG KHÔNG GIAN 100VH */}
        <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-[440px] flex flex-col">
            
            {/* Tiêu đề chuẩn Netflix */}
            <h2 className="text-white text-3xl sm:text-[36px] font-extrabold leading-[1.25] tracking-tight mb-2">
              Nhập thông tin của bạn để đăng nhập
            </h2>
            <p className="text-[#a6a6a6] text-[15px] sm:text-[16px] mb-8 font-normal">
              Hoặc bắt đầu với một tài khoản mới.
            </p>

            {/* Form thông tin đăng nhập với method="post" để Chrome nhận diện chính xác luồng lưu mật khẩu */}
            <form method="post" action="#" onSubmit={handleSubmit} className="flex flex-col gap-4">
              {authError && (
                <div className="bg-[#e50914]/25 border border-[#e50914] text-red-200 text-xs px-4 py-3 rounded-[4px] animate-in fade-in duration-200">
                  {authError}
                </div>
              )}

              {/* Trường 1: Tài khoản / Email */}
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  id="username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Email hoặc số điện thoại di động"
                  className="w-full h-[56px] bg-[#0f0f0f]/90 border border-[#333333] text-white rounded-[4px] px-4 text-[16px] outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder-[#8c8c8c]"
                />
              </div>

              {/* Trường 2: Mật khẩu */}
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  id="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full h-[56px] bg-[#0f0f0f]/90 border border-[#333333] text-white rounded-[4px] px-4 text-[16px] outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder-[#8c8c8c]"
                />
              </div>

              {/* Nút Đăng Nhập Tiếp Tục */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-[52px] bg-[#e50914] hover:bg-[#c11119] text-white font-bold text-[17px] rounded-[4px] transition duration-200 mt-1 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </span>
                ) : (
                  "Tiếp tục"
                )}
              </button>

              {/* Ghi nhớ tài khoản (Remember Me) */}
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-[#b3b3b3] text-[14px] cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#0f0f0f] border border-[#444444] accent-[#e50914] cursor-pointer"
                  />
                  <span>Ghi nhớ tài khoản</span>
                </label>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* SECTION 2: FOOTER - ĐẶT NẰM PHÍA DƯỚI KHỦNG NỀN 100VH (SCROLL XUỐNG MỚI THẤY) */}
      <footer className="relative z-10 bg-[#000000] border-t border-[#222222]/80 px-8 sm:px-16 md:px-32 py-12 text-[#737373] text-[14px]">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <p className="hover:underline cursor-pointer">
            Bạn có câu hỏi? <span className="underline">Liên hệ với chúng tôi.</span>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6 text-[13px]">
            <span className="hover:underline cursor-pointer">Câu hỏi thường gặp</span>
            <span className="hover:underline cursor-pointer">Trung tâm trợ giúp</span>
            <span className="hover:underline cursor-pointer">Điều khoản sử dụng</span>
            <span className="hover:underline cursor-pointer">Quyền riêng tư</span>
            <span className="hover:underline cursor-pointer">Tùy chọn cookie</span>
            <span className="hover:underline cursor-pointer">Thông tin doanh nghiệp</span>
          </div>

          {/* Selector Ngôn ngữ dạng button */}
          <div className="mt-2">
            <div className="inline-flex items-center gap-2 border border-[#333333] bg-[#0f0f0f] px-4 py-2 rounded-[4px] text-xs text-white cursor-pointer hover:border-zinc-400 transition-colors">
              <span>🌐</span>
              <span>Tiếng Việt</span>
              <span className="text-[10px]">▼</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
