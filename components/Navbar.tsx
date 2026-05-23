"use client";

import { FaSearch, FaBell, FaChevronDown, FaBars, FaTimes } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  keyword: string;
  setKeyword: (value: string) => void;
};

export default function Navbar({ keyword, setKeyword }: Props) {
  const [showSearch, setShowSearch] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Danh mục phim
  const categories = [
    { name: "Phim Mới", slug: "phim-moi" },
    { name: "Phim Bộ", slug: "phim-bo" },
    { name: "Phim Lẻ", slug: "phim-le" },
    { name: "Hoạt Hình", slug: "hoat-hinh" },
    { name: "Phim Chiếu Rạp", slug: "phim-chieu-rap" },
    { name: "Hành Động", slug: "hanh-dong" },
    { name: "Kinh Dị", slug: "kinh-di" },
  ];

  // Menu chính
  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Movies", href: "/movies" },
    { name: "TV Shows", href: "/tv-shows" },
    { name: "My List", href: "/my-list" },
  ];

  useEffect(() => {
    const saved = localStorage.getItem("dt_search_history");
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (keyword.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`https://dtmyflix.onrender.com/api/search?keyword=${encodeURIComponent(keyword.trim())}`, {
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

  useEffect(() => {
    // Xử lý đổi màu nền khi cuộn
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Xử lý click ra ngoài để đóng Categories (Cần thiết cho iPad/Máy chiếu)
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Nếu ô search đang mở VÀ vị trí click KHÔNG nằm trong cụm search container
      if (showSearch && searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setShowSuggestions(false);
      }
    };

    // Lắng nghe sự kiện click trên toàn bộ tài liệu trang web
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearch]);

  // Hàm chuyển đổi Categories an toàn (Chống nháy trên iPad)
  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDropdown(!showDropdown);
  };

  return (
    <div className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${
      isScrolled || isMobileMenuOpen ? "bg-black shadow-lg" : "bg-gradient-to-b from-black/90 via-black/40 to-transparent"
    }`}>
      <div className="flex items-center justify-between px-6 md:px-12 py-4">
        
        {/* LEFT SECTION */}
        <div className="flex items-center gap-4 md:gap-8">
          {/* Mobile Toggle */}
          <button 
            className="md:hidden text-white text-2xl active:scale-90 transition-transform" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>

          {/* Logo */}
          <Link href="/">
            <h1 className="text-red-600 text-2xl md:text-3xl font-extrabold cursor-pointer tracking-tighter">MYFLIX</h1>
          </Link>

          {/* Desktop/Tablet Menu (Hiện trên iPad/Máy chiếu) */}
          <div className="hidden md:flex gap-6 text-sm font-medium items-center text-gray-300">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className={`cursor-pointer transition-colors duration-200 ${
                  pathname === link.href ? "text-white font-bold" : "hover:text-white"
                }`}>
                  {link.name}
                </span>
              </Link>
            ))}

            {/* Dropdown Categories */}
            <div 
              className="relative" 
              ref={dropdownRef}
              onMouseEnter={() => {
                if (window.matchMedia('(pointer: fine)').matches) setShowDropdown(true);
              }}
              onMouseLeave={() => {
                if (window.matchMedia('(pointer: fine)').matches) setShowDropdown(false);
              }}
            >
              <div 
                onClick={toggleDropdown}
                className={`cursor-pointer flex items-center gap-1 transition-colors duration-200 ${
                  pathname.includes("/category") || showDropdown ? "text-white font-bold" : "hover:text-white"
                }`}
              >
                Categories 
                <FaChevronDown className={`text-[10px] transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
              </div>

              {/* Menu Sổ Xuống */}
              {showDropdown && (
                <div className="absolute top-full left-0 w-48 pt-4 z-[100] animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-black/95 border border-zinc-800 rounded-md py-2 shadow-2xl flex flex-col relative">
                    {/* Mũi tên chỉ lên */}
                    <div className="absolute -top-1.5 left-8 w-3 h-3 bg-black border-t border-l border-zinc-800 transform rotate-45"></div>
                    
                    {categories.map((cat) => (
                      <Link 
                        key={cat.slug} 
                        href={`/category/${cat.slug}`}
                        onClick={() => setShowDropdown(false)}
                      >
                        <span className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors">
                          {cat.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-4 md:gap-6">
          <div ref={searchContainerRef} className="flex items-center gap-3 relative">
            {showSearch && (
              <input
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => e.key === "Enter" && keyword.trim() !== "" && handleSearchSubmit(keyword)}
                placeholder="Search movies..."
                className="bg-black/60 border border-zinc-700 px-3 py-1 rounded-full outline-none text-xs text-white w-32 md:w-48 focus:border-red-600 transition-all animate-in fade-in slide-in-from-right-3 duration-200"
                autoFocus
              />
            )}
            <FaSearch 
              className="cursor-pointer text-gray-300 hover:text-white transition-colors text-lg active:scale-90" 
              onClick={(e) => {
                e.stopPropagation();
                setShowSearch(!showSearch);
                setShowSuggestions(!showSearch);
              }} 
            />

            {showSuggestions && showSearch && (searchHistory.length > 0 || (keyword.trim().length >= 2 && suggestions.length > 0)) && (
              <div className="absolute top-full right-0 w-64 md:w-80 bg-zinc-950/95 border border-zinc-800 rounded-lg mt-2 z-50 shadow-2xl p-2 flex flex-col gap-2 max-h-96 overflow-y-auto backdrop-blur-md">
                {keyword.trim().length < 2 && searchHistory.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 mb-1">Tìm kiếm gần đây</p>
                    {searchHistory.map((text, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setKeyword(text);
                          handleSearchSubmit(text);
                        }}
                        className="flex items-center justify-between text-xs text-zinc-300 hover:bg-zinc-900 px-2 py-1.5 rounded cursor-pointer group"
                      >
                        <span className="truncate">{text}</span>
                        <button 
                          onClick={(e) => handleRemoveHistory(e, text)}
                          className="text-zinc-500 hover:text-red-500 transition-colors px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {keyword.trim().length >= 2 && suggestions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 mb-1">Gợi ý phim</p>
                    {suggestions.map((movie: any) => (
                      <div
                        key={movie._id || movie.slug}
                        onClick={() => {
                          handleSearchSubmit(movie.name);
                          setShowSuggestions(false);
                        }}
                        className="flex items-center gap-2 p-1.5 hover:bg-zinc-900 rounded cursor-pointer transition-colors border-b border-zinc-900/50 last:border-0"
                      >
                        <img 
                          src={movie.thumb_url.startsWith('http') ? movie.thumb_url : `https://img.ophim.live/uploads/movies/${movie.thumb_url}`} 
                          alt={movie.name} 
                          className="w-7 aspect-[2/3] rounded object-cover flex-shrink-0" 
                        />
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-semibold text-white truncate">{movie.name}</span>
                          <span className="text-[10px] text-zinc-400">{movie.year} | {movie.episode_current || "Full"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <FaBell className="hidden lg:block cursor-pointer text-gray-300 hover:text-white transition-colors text-lg" />
          
          <div className="w-8 h-8 rounded overflow-hidden cursor-pointer border border-transparent hover:border-white transition-all">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png" 
              className="w-full h-full object-cover" 
              alt="Avatar" 
            />
          </div>
        </div>
      </div>

      {/* MOBILE OVERLAY MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/95 w-full border-t border-zinc-800 backdrop-blur-md animate-in slide-in-from-top duration-300">
          <div className="flex flex-col p-6 gap-5 text-gray-300 text-lg font-medium">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                <span className={pathname === link.href ? "text-red-500 font-bold" : ""}>{link.name}</span>
              </Link>
            ))}
            
            <p className="text-zinc-600 text-xs mt-4 tracking-widest uppercase border-t border-zinc-900 pt-4">Categories</p>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-base">
              {categories.map((cat) => (
                <Link key={cat.slug} href={`/category/${cat.slug}`} onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="hover:text-white active:text-red-500 transition-colors">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}