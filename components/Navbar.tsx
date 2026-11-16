"use client";

import { FaSearch, FaBell, FaChevronDown, FaBars, FaTimes, FaUserAlt } from "react-icons/fa";
import Link from "next/link";
import { useNavbarLogic } from "@/hooks/useNavbarLogic";

type Props = {
  keyword: string;
  setKeyword: (value: string) => void;
};

export default function Navbar({ keyword, setKeyword }: Props) {
  const {
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
    loginError,
    isLoading,
    searchContainerRef, dropdownRef, userDropdownRef,
    showServerDropdown, setShowServerDropdown, serverDropdownRef,
    currentServerId, currentServer, serverList, switchServer,
    pathname,
    handleLoginSubmit, handleLogout, handleSearchSubmit, handleRemoveHistory
  } = useNavbarLogic(keyword, setKeyword);

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
    { name: "Watch Party", href: "/watch-party" },
  ];

  return (
    <div className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${isScrolled || isMobileMenuOpen ? "bg-black shadow-lg" : "bg-gradient-to-b from-black/90 via-black/40 to-transparent"
      }`}>
      <div className="flex items-center justify-between px-6 md:px-12 py-4">

        {/* LEFT SECTION */}
        <div className="flex items-center gap-4 md:gap-8">
          <button
            className="md:hidden text-white text-2xl active:scale-90 transition-transform"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>

          <Link href="/">
            <h1 className="text-red-600 text-2xl md:text-3xl font-extrabold cursor-pointer tracking-tighter">MYFLIX</h1>
          </Link>

          <div className="hidden md:flex gap-6 text-sm font-medium items-center text-gray-300">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-1.5 py-0.5">
                <span className={`cursor-pointer transition-colors duration-200 ${pathname === link.href ? "text-white font-bold" : "hover:text-white"
                  }`}>
                  {link.name}
                </span>
              </Link>
            ))}

            <div
              className="relative"
              ref={dropdownRef}
              onMouseEnter={() => { if (window.matchMedia('(pointer: fine)').matches) setShowDropdown(true); }}
              onMouseLeave={() => { if (window.matchMedia('(pointer: fine)').matches) setShowDropdown(false); }}
            >
              <div
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowDropdown(!showDropdown);
                  }
                }}
                onClick={(e) => { e.preventDefault(); setShowDropdown(!showDropdown); }}
                className={`cursor-pointer flex items-center gap-1 transition-colors duration-200 rounded px-1.5 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${pathname.includes("/category") || showDropdown ? "text-white font-bold" : "hover:text-white"
                  }`}
              >
                Categories
                <FaChevronDown className={`text-[10px] transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
              </div>

              {showDropdown && (
                <div className="absolute top-full left-0 w-48 pt-4 z-[100] animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-black/95 border border-zinc-800 rounded-md py-2 shadow-2xl flex flex-col relative">
                    <div className="absolute -top-1.5 left-8 w-3 h-3 bg-black border-t border-l border-zinc-800 transform rotate-45"></div>
                    {categories.map((cat) => (
                      <Link key={cat.slug} href={`/category/${cat.slug}`} onClick={() => setShowDropdown(false)} className="focus:outline-none focus-visible:bg-red-600">
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
                onChange={(e) => { setKeyword(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => e.key === "Enter" && keyword.trim() !== "" && handleSearchSubmit(keyword)}
                placeholder="Search movies..."
                className="bg-black/60 border border-zinc-700 px-3 py-1 rounded-full outline-none text-xs text-white w-32 md:w-48 focus:border-red-600 transition-all animate-in fade-in slide-in-from-right-3 duration-200"
                autoFocus
              />
            )}
            <button
              type="button"
              tabIndex={0}
              className="cursor-pointer text-gray-300 hover:text-white transition-colors text-lg active:scale-90 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              onClick={(e) => {
                e.stopPropagation();
                setShowSearch(!showSearch);
                setShowSuggestions(!showSearch);
              }}
            >
              <FaSearch />
            </button>

            {showSuggestions && (keyword.trim().length >= 2 || searchHistory.length > 0) && (
              <div className="absolute top-full right-0 mt-2 w-[280px] sm:w-[350px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50">

                {keyword.trim().length >= 2 ? (
                  isSearching ? (
                    /* TRẠNG THÁI 1: ĐANG FETCH API */
                    <div className="p-4 text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-zinc-600 border-t-red-600 rounded-full animate-spin" />
                      Đang tìm kiếm...
                    </div>
                  ) : suggestions.length > 0 ? (
                    /* TRẠNG THÁI 2: CÓ KẾT QUẢ */
                    <ul>
                      {suggestions.map((movie) => (
                        <div
                          key={movie._id || movie.slug}
                          tabIndex={0}
                          role="button"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSearchSubmit(movie.name);
                              setShowSuggestions(false);
                            }
                          }}
                          onClick={() => { handleSearchSubmit(movie.name); setShowSuggestions(false); }}
                          className="flex items-center gap-2 p-1.5 hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none rounded cursor-pointer transition-colors border-b border-zinc-900/50 last:border-0"
                        >
                          <img
                            src={movie.thumb_url || "https://placehold.co/600x400/18181b/ffffff?text=No+Image"}
                            alt={movie.name}
                            className="w-7 aspect-[2/3] rounded object-cover flex-shrink-0"
                          />
                          <div className="flex flex-col truncate flex-1 min-w-0">
                            <span className="text-xs font-semibold text-white truncate">{movie.name}</span>
                            <span className="text-[10px] text-zinc-400">{movie.year} | {movie.episode_current || "Full"}</span>
                          </div>
                        </div>
                      ))}
                    </ul>
                  ) : (
                    /* TRẠNG THÁI 3: KHÔNG TÌM THẤY */
                    <div className="p-4 text-center text-zinc-400 text-sm">
                      Không tìm thấy phim nào khớp với "{keyword}"
                    </div>
                  )
                ) : (
                  /* TRẠNG THÁI 4: LỊCH SỬ TÌM KIẾM */
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2 mt-1">Lịch sử tìm kiếm</p>
                    <ul>
                      {searchHistory.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => { handleSearchSubmit(item); setShowSuggestions(false); }}
                          className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded cursor-pointer transition-colors group gap-2"
                        >
                          <div className="flex items-center gap-2 text-sm text-zinc-300 flex-1 min-w-0">
                            <FaSearch className="text-zinc-500 text-xs shrink-0" />
                            <span className="truncate">{item}</span>
                          </div>
                          <button
                            onClick={(e) => handleRemoveHistory(e, item)}
                            className="text-zinc-500 hover:text-white p-1 text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-90 shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}
          </div>

          <FaBell className="hidden lg:block cursor-pointer text-gray-300 hover:text-white transition-colors text-lg" />

          {/* [Design Read] Precision Netflix dark HUD pill with subtle status dot, tactile borders, WCAG AA contrast, and zero-flicker server switching. */}
          {/* SERVER SOURCE SELECTOR (5 NGUỒN PHÁT TOÀN CỤC) */}
          <div className="relative" ref={serverDropdownRef}>
            <button
              type="button"
              onClick={() => setShowServerDropdown(!showServerDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 transition-all duration-200 active:scale-95 text-xs text-zinc-200 group shadow-sm"
              title="Chọn nguồn máy chủ"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-semibold text-zinc-100 hidden sm:inline">{currentServer.name}</span>
              <span className="font-semibold text-zinc-100 sm:hidden">{currentServer.shortName}</span>
              <FaChevronDown className={`text-[9px] text-zinc-400 transition-transform duration-200 ${showServerDropdown ? 'rotate-180 text-red-500' : 'group-hover:text-white'}`} />
            </button>

            {showServerDropdown && (
              <div className="absolute top-full right-0 mt-2 w-64 pt-1 z-[110] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-zinc-950/95 border border-zinc-800/90 rounded-xl py-2 shadow-2xl backdrop-blur-md flex flex-col relative divide-y divide-zinc-900">
                  <div className="px-3.5 py-2 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <span>Nguồn máy chủ</span>
                    <span className="text-[10px] text-red-500 font-mono font-normal">Active: {currentServer.shortName}</span>
                  </div>

                  <div className="py-1">
                    {serverList.map((server) => {
                      const isSelected = server.id === currentServerId;
                      return (
                        <button
                          key={server.id}
                          type="button"
                          onClick={() => {
                            switchServer(server.id);
                            setShowServerDropdown(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-2 transition-colors ${isSelected
                            ? "bg-red-600/15 text-white font-semibold"
                            : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-red-500" : "bg-zinc-600"}`} />
                            <span className="text-xs truncate">{server.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PROFILE AVATAR DROPDOWN */}
          {isLoggedIn ? (
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                tabIndex={0}
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="w-8 h-8 rounded overflow-hidden cursor-pointer border border-transparent hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-all active:scale-90 flex-shrink-0"
              >
                <img src="/avatar.png" className="w-full h-full object-cover" alt="Avatar" />
              </button>

              {showUserDropdown && (
                <div className="absolute top-full right-0 w-40 pt-3 z-[100] animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-black/95 border border-zinc-800 rounded-md py-2 shadow-2xl flex flex-col relative">
                    <div className="absolute -top-1.5 right-2.5 w-3 h-3 bg-black border-t border-l border-zinc-800 transform rotate-45"></div>
                    <div className="px-4 py-2 border-b border-zinc-900 text-xs font-semibold text-zinc-400 truncate">
                      Hi, <span className="text-white font-bold">{currentUsername}</span>
                    </div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-red-600/20 hover:font-semibold transition-colors mt-1 focus:outline-none focus-visible:bg-red-600">
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              tabIndex={0}
              onClick={() => setShowLoginModal(true)}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center cursor-pointer text-gray-400 hover:text-white border border-zinc-700 transition-all active:scale-90 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <FaUserAlt className="text-xs" />
            </button>
          )}
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