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
          <div className="flex items-center gap-3">
            {showSearch && (
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && keyword.trim() !== "" && router.push(`/search?q=${keyword.trim()}`)}
                placeholder="Search movies..."
                className="bg-black/60 border border-zinc-700 px-3 py-1 rounded-full outline-none text-xs text-white w-32 md:w-48 focus:border-red-600 transition-all"
                autoFocus
              />
            )}
            <FaSearch 
              className="cursor-pointer text-gray-300 hover:text-white transition-colors text-lg" 
              onClick={() => setShowSearch(!showSearch)} 
            />
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