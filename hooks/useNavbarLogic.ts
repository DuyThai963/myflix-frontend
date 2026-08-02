import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function useNavbarLogic(keyword: string, setKeyword: (value: string) => void) {
  const [showSearch, setShowSearch] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // 🔐 Quản lý Đăng nhập & Xác thực từ AuthContext
  const { isLoggedIn, user, logout, login, authError, setAuthError } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const currentUsername = user?.username || "";

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // 🔄 Khởi tạo lịch sử tìm kiếm local
  useEffect(() => {
    const saved = localStorage.getItem("dt_search_history");
    if (saved) setSearchHistory(JSON.parse(saved));
  }, []);

  // 🔐 XỬ LÝ ĐĂNG NHẬP (dùng cho modal nếu cần)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await login(username, password);
      if (success) {
        setShowLoginModal(false);
        setUsername("");
        setPassword("");
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
    router.refresh();
  };

  // 🔍 Xử lý tìm kiếm định thời Debounce Suggestions phim
  useEffect(() => {
    const cleanKeyword = keyword.trim();
    
    // 🛡️ GIỚI HẠN KÝ TỰ: Gõ ít nhất 2 ký tự mới gọi API, tiết kiệm tài nguyên
    if (cleanKeyword.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/search?keyword=${encodeURIComponent(cleanKeyword)}`, {
          signal: controller.signal
        });
        const data = await response.json();
        if (data?.data?.items) {
          setSuggestions(data.data.items.slice(0, 5));
        } else {
          setSuggestions([]);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") console.error("Suggestions Error:", error);
        if (error.name !== "AbortError") {
          console.error("Suggestions Error:", error);
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
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
    isSearching,
    isLoggedIn,
    showLoginModal, setShowLoginModal,
    showUserDropdown, setShowUserDropdown,
    currentUsername,
    username, setUsername,
    password, setPassword,
    loginError: authError, setLoginError: setAuthError,
    isLoading,
    searchContainerRef, dropdownRef, userDropdownRef,
    pathname,
    handleLoginSubmit, handleLogout, handleSearchSubmit, handleRemoveHistory
  };
}