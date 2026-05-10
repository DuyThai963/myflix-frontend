"use client";

import { FaSearch, FaBell, FaChevronDown } from "react-icons/fa"; // Thêm FaChevronDown
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
  const [showDropdown, setShowDropdown] = useState(false); // State cho menu thể loại

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Danh sách thể loại mẫu (bạn có thể thêm bớt tùy ý dựa theo API OPhim)
  const categories = [
    { name: "Phim Mới", slug: "phim-moi" },
    { name: "Phim Bộ", slug: "phim-bo" },
    { name: "Phim Lẻ", slug: "phim-le" },
    { name: "Hoạt Hình", slug: "hoat-hinh" },
    { name: "Phim Chiếu Rạp", slug: "phim-chieu-rap" },
    { name: "Hành Động", slug: "hanh-dong" },
    { name: "Kinh Dị", slug: "kinh-di" },
  ];

  return (
    <div
      className={`
        fixed
        top-0
        left-0
        w-full
        z-50
        transition-all
        duration-300
        ${
          isScrolled
            ? "bg-black"
            : "bg-gradient-to-b from-black/90 to-transparent"
        }
      `}
    >
      <div className="flex items-center justify-between px-6 md:px-12 py-4">
        <div className="flex items-center gap-8">
          <Link href="/">
            <h1 className="text-red-600 text-3xl font-bold cursor-pointer">
              MYFLIX
            </h1>
          </Link>

          <div className="hidden md:flex gap-6 text-sm font-medium items-center">
            <Link href="/">
              <span className={`cursor-pointer transition-colors ${pathname === "/" ? "text-white font-bold" : "text-gray-300 hover:text-white"}`}>
                Home
              </span>
            </Link>

            <Link href="/movies">
              <span className={`cursor-pointer transition-colors ${pathname === "/movies" ? "text-white font-bold" : "text-gray-300 hover:text-white"}`}>
                Movies
              </span>
            </Link>

            <Link href="/tv-shows">
              <span className={`cursor-pointer transition-colors ${pathname === "/tv-shows" ? "text-white font-bold" : "text-gray-300 hover:text-white"}`}>
                TV Shows
              </span>
            </Link>

            {/* BẮT ĐẦU: Dropdown Thể loại */}
            <div 
              className="relative group"
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              <div className={`cursor-pointer flex items-center gap-1 transition-colors ${pathname.includes("/category") ? "text-white font-bold" : "text-gray-300 group-hover:text-white"}`}>
                Categories <FaChevronDown className={`text-[10px] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </div>

              {/* Menu xổ xuống */}
              {showDropdown && (
                <div 
                  className="absolute top-full left-0 w-48 pt-4 z-[100]" // Tạo một vùng đệm (padding-top) thay vì margin
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  {/* Bọc nội dung menu thật vào trong một div con */}
                  <div className="bg-black/95 border border-zinc-800 rounded-md py-2 shadow-xl flex flex-col relative">
                    {/* Mũi tên nhỏ chỉ lên */}
                    <div className="absolute -top-2 left-8 w-4 h-4 bg-black border-t border-l border-zinc-800 transform rotate-45"></div>
                    
                    {categories.map((cat) => (
                      <Link key={cat.slug} href={`/category/${cat.slug}`}>
                        <span className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors">
                          {cat.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* KẾT THÚC: Dropdown Thể loại */}

            <Link href="/my-list">
              <span className={`cursor-pointer transition-colors ${pathname === "/my-list" ? "text-white font-bold" : "text-gray-300 hover:text-white"}`}>
                My List
              </span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-5 text-xl">
          <FaSearch
            className="cursor-pointer text-gray-300 hover:text-white transition-colors"
            onClick={() => setShowSearch(!showSearch)}
          />

          {showSearch && (
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && keyword.trim() !== "") {
                  router.push(`/search?q=${keyword.trim()}`);
                }
              }}
              placeholder="Search movie..."
              className="
                bg-black/80 border border-gray-600 px-3 py-1 rounded outline-none text-sm text-white w-48 focus:border-white transition-colors
              "
              autoFocus
            />
          )}

          <FaBell className="cursor-pointer text-gray-300 hover:text-white transition-colors" />

          <img
            src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
            className="w-8 h-8 rounded"
            alt="Avatar"
          />
        </div>
      </div>
    </div>
  );
}