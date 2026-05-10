"use client";

import { FaSearch, FaBell, FaChevronDown, FaBars, FaTimes } from "react-icons/fa"; // Thêm FaBars, FaTimes
import { useEffect, useState } from "react";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State mới cho mobile menu

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const categories = [
    { name: "Phim Mới", slug: "phim-moi" },
    { name: "Phim Bộ", slug: "phim-bo" },
    { name: "Phim Lẻ", slug: "phim-le" },
    { name: "Hoạt Hình", slug: "hoat-hinh" },
    { name: "Phim Chiếu Rạp", slug: "phim-chieu-rap" },
    { name: "Hành Động", slug: "hanh-dong" },
    { name: "Kinh Dị", slug: "kinh-di" },
  ];

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Movies", href: "/movies" },
    { name: "TV Shows", href: "/tv-shows" },
    { name: "My List", href: "/my-list" },
  ];

  return (
    <div className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${isScrolled || isMobileMenuOpen ? "bg-black" : "bg-gradient-to-b from-black/90 to-transparent"}`}>
      <div className="flex items-center justify-between px-6 md:px-12 py-4">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Nút 3 gạch cho Mobile */}
          <button 
            className="md:hidden text-white text-2xl" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>

          <Link href="/">
            <h1 className="text-red-600 text-2xl md:text-3xl font-bold cursor-pointer">MYFLIX</h1>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-6 text-sm font-medium items-center text-gray-300">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className={`cursor-pointer transition-colors ${pathname === link.href ? "text-white font-bold" : "hover:text-white"}`}>
                  {link.name}
                </span>
              </Link>
            ))}

            <div className="relative group" onMouseEnter={() => setShowDropdown(true)} onMouseLeave={() => setShowDropdown(false)}>
              <div className={`cursor-pointer flex items-center gap-1 transition-colors ${pathname.includes("/category") ? "text-white font-bold" : "group-hover:text-white"}`}>
                Categories <FaChevronDown className={`text-[10px] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </div>
              {showDropdown && (
                <div className="absolute top-full left-0 w-48 pt-4 z-[100]">
                  <div className="bg-black/95 border border-zinc-800 rounded-md py-2 shadow-xl flex flex-col relative text-gray-300">
                    <div className="absolute -top-2 left-8 w-4 h-4 bg-black border-t border-l border-zinc-800 transform rotate-45"></div>
                    {categories.map((cat) => (
                      <Link key={cat.slug} href={`/category/${cat.slug}`}>
                        <span className="block px-4 py-2 hover:text-white hover:bg-zinc-800 transition-colors">{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 md:gap-5 text-xl">
          <FaSearch className="cursor-pointer text-gray-300 hover:text-white transition-colors" onClick={() => setShowSearch(!showSearch)} />
          {showSearch && (
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && keyword.trim() !== "" && router.push(`/search?q=${keyword.trim()}`)}
              placeholder="Search..."
              className="bg-black/80 border border-gray-600 px-3 py-1 rounded outline-none text-sm text-white w-32 md:w-48 focus:border-white transition-colors"
              autoFocus
            />
          )}
          <FaBell className="hidden sm:block cursor-pointer text-gray-300 hover:text-white transition-colors" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png" className="w-8 h-8 rounded" alt="Avatar" />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black w-full border-t border-zinc-800 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col p-6 gap-4 text-gray-300 text-lg font-medium">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                <span className={pathname === link.href ? "text-white font-bold" : ""}>{link.name}</span>
              </Link>
            ))}
            
            {/* Thu gọn Categories vào mobile menu */}
            <p className="text-zinc-600 text-sm mt-4 border-t border-zinc-800 pt-4">CATEGORIES</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {categories.map((cat) => (
                <Link key={cat.slug} href={`/category/${cat.slug}`} onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="hover:text-white">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}