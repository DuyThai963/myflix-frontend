import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export function useNavbarLogic(keyword: string, setKeyword: (value: string) => void) {
  const [showSearch, setShowSearch] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // 🔐 Quản lý Đăng nhập & Xác thực tài khoản
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // 🔄 Khởi tạo kiểm tra trạng thái Token danh tính dưới máy
  useEffect(() => {
    const token = localStorage.getItem("myflix_token");
    const userString = localStorage.getItem("myflix_user");
    if (token) {
      setIsLoggedIn(true);
      if (userString) {
        const user = JSON.parse(userString);
        setCurrentUsername(user.username);
      }
    }

    const saved = localStorage.getItem("dt_search_history");
    if (saved) setSearchHistory(JSON.parse(saved));
  }, []);

  // 🔐 XỬ LÝ ĐĂNG NHẬP & ĐỒNG BỘ ĐỒNG THỜI LÊN PRODUCTION RENDER
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!username.trim() || !password.trim()) {
      setLoginError("Vui lòng điền đủ tài khoản và mật khẩu!");
      return;
    }

    setIsLoading(true);
    try {
      // 🚀 CHUYỂN HƯỚNG ENDPOINT LÊN SERVER PRODUCTION RENDER XỊN
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Đăng nhập thất bại!");
      } else {
        localStorage.setItem("myflix_token", data.token);
        localStorage.setItem("myflix_user", JSON.stringify(data.user));

        // Luồng cứu hộ dữ liệu local cũ đẩy lên két DB
        const localHist = localStorage.getItem("myflix_history");
        if (localHist) {
          try {
            const parsedHist = JSON.parse(localHist);
            if (parsedHist.length > 0) {
              await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: data.user.id, localHistory: parsedHist })
              });
              localStorage.removeItem("myflix_history");
            }
          } catch (syncErr) {
            console.error("❌ Lỗi luồng sync mảng:", syncErr);
          }
        }

        window.dispatchEvent(new Event("myflix_history_updated"));
        setIsLoggedIn(true);
        setCurrentUsername(data.user.username);
        setShowLoginModal(false);
        setUsername("");
        setPassword("");
        router.refresh();
      }
    } catch (err) {
      setLoginError("Không thể kết nối đến Server Backend!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("myflix_token");
    localStorage.removeItem("myflix_user");
    window.dispatchEvent(new Event("myflix_history_updated"));
    setIsLoggedIn(false);
    setCurrentUsername("");
    setShowUserDropdown(false);
    router.refresh();
  };

  // 🔍 Xử lý tìm kiếm định thời Debounce Suggestions phim
  useEffect(() => {
    if (keyword.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/search?keyword=${encodeURIComponent(keyword.trim())}`, {
          signal: controller.signal
        });
        const data = await response.json();
        if (data?.data?.items) {
          setSuggestions(data.data.items.slice(0, 5));
        }
      } catch (error: any) {
        if (error.name !== "AbortError") console.error("Suggestions Error:", error);
      }
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [keyword]);

  const handleSearchSubmit = (searchKey: string) => {
    const cleanKey = searchKey.trim();
    if (!cleanKey) return;

    setSearchHistory((prev) => {
      const next = [cleanKey, ...prev.filter((item) => item !== cleanKey)].slice(0, 5);
      localStorage.setItem("dt_search_history", JSON.stringify(next));
      return next;
    });

    setShowSuggestions(false);
    router.push(`/search?q=${cleanKey}`);
  };

  const handleRemoveHistory = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const next = prev.filter((item) => item !== text);
      localStorage.setItem("dt_search_history", JSON.stringify(next));
      return next;
    });
  };

  // 🌍 Theo dõi cuộn trang và nhấp chuột ra ngoài để thu gọn Dropdown
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setShowDropdown(false);
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) setShowUserDropdown(false);
      if (showSearch && searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowSearch(false);
        setShowSuggestions(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearch]);

  return {
    showSearch, setShowSearch,
    isScrolled,
    showDropdown, setShowDropdown,
    isMobileMenuOpen, setIsMobileMenuOpen,
    searchHistory,
    suggestions,
    showSuggestions, setShowSuggestions,
    isLoggedIn,
    showLoginModal, setShowLoginModal,
    showUserDropdown, setShowUserDropdown,
    currentUsername,
    username, setUsername,
    password, setPassword,
    loginError, setLoginError,
    isLoading,
    searchContainerRef, dropdownRef, userDropdownRef,
    pathname,
    handleLoginSubmit, handleLogout, handleSearchSubmit, handleRemoveHistory
  };
}