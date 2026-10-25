"use client";

import { Movie } from "@/types/movie";
import VideoPlayer from "./VideoPlayer";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useMovieModalLogic, formatEpName, getBestStreamUrl } from "@/hooks/useMovieModalLogic";
import { socket } from "@/services/socket.service";

type Props = {
  movie: Movie | null;
  onClose: () => void;
  initialTime?: number;
  isWatchParty?: boolean;
};

const safeText = (val: any) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) {
    return val.map((item: any) => (typeof item === "object" ? (item?.name || item?.title || "") : String(item))).filter(Boolean).join(", ");
  }
  if (typeof val === "object") return val.name || val.title || "";
  return String(val);
};

export default function MovieModal({ movie, onClose, initialTime = 0, isWatchParty = false }: Props) {
  const {
    streamUrl, setStreamUrl,
    loading,
    episodes, setEpisodes,
    episodeData,
    activeServer, setActiveServer,
    activeEpisode, setActiveEpisode,
    activeEpisodeName, setActiveEpisodeName,
    isInMyList,
    isPlayerFullscreen, setIsPlayerFullscreen,
    fullMovieDetail,
    hasNextEpisode,
    isEmbedMode, setIsEmbedMode,
    isHost,
    toggleMyList,
    handleProgress,
    handleNextEpisode,
    latestTimeRef
  } = useMovieModalLogic(movie, onClose);

  const [isRoom, setIsRoom] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showShareMenu]);

  const handleCopyLink = () => {
    if (!movie) return;
    const shareUrl = `${window.location.origin}/movie/${movie.slug || movie.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        prompt("Sao chép liên kết:", shareUrl);
      });
    } else {
      prompt("Sao chép liên kết:", shareUrl);
    }
  };

  const handleShareFacebook = () => {
    if (!movie) return;
    const shareUrl = `${window.location.origin}/movie/${movie.slug || movie.id}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "width=600,height=500,location=no,toolbar=no");
  };

  const handleShareMessenger = () => {
    if (!movie) return;
    const shareUrl = `${window.location.origin}/movie/${movie.slug || movie.id}`;
    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `fb-messenger://share?link=${encodeURIComponent(shareUrl)}`;
      setTimeout(() => {
        window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(shareUrl)}`, "_blank");
      }, 1000);
    } else {
      window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(shareUrl)}`, "_blank", "width=600,height=500,location=no,toolbar=no");
    }
  };

  const handleNativeShare = async () => {
    if (!movie) return;
    const shareUrl = `${window.location.origin}/movie/${movie.slug || movie.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: safeText(movie.title) || "MyFlix",
          text: `Xem phim ${safeText(movie.title)} trên MyFlix!`,
          url: shareUrl
        });
        setShowShareMenu(false);
      } catch (err) {}
    } else {
      handleCopyLink();
    }
  };

  useEffect(() => {
    setIsRoom(new URLSearchParams(window.location.search).has("room"));
  }, []);

  if (!movie) {
    if (isRoom) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm select-none"
        >
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-zinc-300 animate-pulse">Đang đồng bộ phòng xem chung...</p>
          </div>
        </motion.div>
      );
    }
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden transition-all duration-300 ${isMaximized ? "bg-black p-0" : "bg-black/90 p-0 md:p-6 backdrop-blur-md"}`}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} 
        className={`bg-[#141414] w-full h-full overflow-hidden flex flex-col relative shadow-[0_0_60px_rgba(0,0,0,0.95)] transition-all duration-300 ${isMaximized ? "rounded-none border-none max-w-none" : "md:h-[90vh] md:max-w-5xl md:rounded-xl border border-zinc-800/80"}`}
      >
        <div 
          className="absolute right-4 z-50 flex items-center gap-2"
          style={{ top: 'max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))' }}
        >
          <button 
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Thu nhỏ về cửa sổ" : "Mở rộng vừa khung hình (Chế độ rạp chiếu)"}
            className="bg-black/70 hover:bg-zinc-800 text-white w-9 h-9 rounded-full flex items-center justify-center transition duration-200 cursor-pointer border border-zinc-700/60 hover:border-zinc-400"
          >
            {isMaximized ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>

          <button 
            onClick={onClose}
            title="Đóng"
            className="bg-black/70 hover:bg-zinc-800 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg transition duration-200 cursor-pointer border border-zinc-700/60 hover:border-zinc-400"
          >
            ✕
          </button>
        </div>

        {/* Khối Trình phát Video (Custom HLS Player hoặc IFrame Embed Dự Phòng) */}
        <div className={`w-full bg-black relative shrink-0 overflow-hidden transition-all duration-300 ${isMaximized ? "h-[80vh] sm:h-[84vh] md:h-[88vh] lg:h-[90vh]" : "h-[38vh] sm:h-[42vh] md:h-[48vh] lg:h-[52vh]"}`}>
          {streamUrl ? (
            <VideoPlayer 
              key={`${movie.id}-${activeEpisode}`}
              src={streamUrl} 
              movieId={`${movie.id}-${activeEpisode}`} 
              movieTitle={fullMovieDetail?.title || fullMovieDetail?.name || movie.title || (movie as any).name || ""}
              onProgress={handleProgress}
              isSeries={hasNextEpisode} 
              onNext={handleNextEpisode} 
              initialTime={isWatchParty && typeof initialTime === "number" && initialTime > 0 ? Math.floor(initialTime) : (typeof movie.currentTime === 'number' ? Math.floor(movie.currentTime) : initialTime)}
              onFullscreenChange={(isFullscreenNow) => setIsPlayerFullscreen(isFullscreenNow)}
              movieData={fullMovieDetail || movie}
              isWatchParty={isWatchParty}
              serverName={activeServer}
              isEmbed={isEmbedMode}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/50">
              <span className="text-4xl mb-2">⚠️</span>
              <p className="text-sm px-4 text-center">Nguồn phát hiện tại chưa khả dụng hoặc chỉ có Trailer</p>
            </div>
          )}
        </div>

        {/* Khối hiển thị thông tin chi tiết phim (Thu gọn khi isMaximized) */}
        <div 
          className={`${isMaximized ? "p-4 md:p-6" : "p-6 md:p-8"} overflow-y-auto z-0 flex-1 overscroll-contain transition-all duration-300`}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8">
            <div className="flex-1">
              <h1 className={`${isMaximized ? "text-xl md:text-2xl mb-2" : "text-2xl md:text-4xl mb-3"} font-bold text-white leading-tight`}>
                {safeText(movie.title)}
              </h1>

              <div className={`flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm font-medium ${isMaximized ? "mb-3" : "mb-6"}`}>
                <span className="text-green-500 font-bold">{safeText(movie.year)}</span>
                <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{safeText(movie.duration)}</span>
                <span className="text-zinc-400">{safeText(movie.genre)}</span>
                <span className="text-zinc-400 border-l border-zinc-700 pl-3 md:pl-4">{safeText(movie.country)}</span>
              </div>

              {/* Bộ chọn Nguồn Phim (Vietsub / Lồng Tiếng) & Định dạng Trình phát (HLS / Embed) */}
              <div className={`space-y-2.5 ${isMaximized ? "mb-3" : "mb-6"}`}>
                {/* 1. Chọn Server Thuyết minh / Vietsub / Lồng tiếng */}
                {episodeData.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 mr-1">Nguồn:</span>
                    {episodeData.map((server) => (
                      <button 
                        key={server.server_name} 
                        onClick={() => {
                          if (movie && latestTimeRef.current > 0) {
                            movie.currentTime = latestTimeRef.current;
                          }

                          setActiveServer(server.server_name);
                          setEpisodes(server.server_data);
                          
                          let targetEp = server.server_data.find((ep: any) => ep.slug === activeEpisode);
                          if (!targetEp) {
                            targetEp = server.server_data[0];
                            if (movie) movie.currentTime = 0;
                          }

                          const urlToPlay = isEmbedMode ? (targetEp.link_embed || targetEp.link_m3u8) : (targetEp.link_m3u8 || targetEp.link_embed);
                          setStreamUrl(urlToPlay);
                          setActiveEpisode(targetEp.slug);
                          setActiveEpisodeName(formatEpName(targetEp.name));

                          // 💾 Lưu server mới lên DB (chỉ xém cá nhân)
                          const urlParamsCheck = new URLSearchParams(window.location.search);
                          if (!urlParamsCheck.has("room")) {
                            const tkn = localStorage.getItem("myflix_token");
                            const usrStr = localStorage.getItem("myflix_user");
                            if (tkn && usrStr) {
                              const usr = JSON.parse(usrStr);
                              fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/update-time`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: usr.id, movieId: movie.id, currentTime: Math.floor(latestTimeRef.current || 0), serverName: server.server_name, isEmbed: isEmbedMode })
                              }).catch(() => {});
                            }
                          }

                          const urlParams = new URLSearchParams(window.location.search);
                          const roomId = urlParams.get("room");
                          if (roomId && isHost) {
                            const userString = localStorage.getItem("myflix_user");
                            const user = userString ? JSON.parse(userString) : null;
                            socket.emit("host_update_room_state", {
                              roomId,
                              hostUserId: user?.id,
                              currentTime: latestTimeRef.current > 0 ? Math.floor(latestTimeRef.current) : 0,
                              isPlaying: true,
                              episodeSlug: targetEp.slug,
                              episodeName: formatEpName(targetEp.name),
                              serverName: server.server_name,
                              isEmbedMode
                            });
                          }
                        }} 
                        className={`px-3 py-1 text-xs font-bold uppercase rounded border transition cursor-pointer ${activeServer === server.server_name ? "bg-red-600 border-red-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                      >
                        {server.server_name}
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. Chọn Định Dạng Trình Phát (Embed Server 1 vs M3U8 Server 2) */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 mr-1">Player:</span>

                  {/* Server 1: Embed Player (Ưu tiên ổn định) */}
                  <button
                    onClick={() => {
                      setIsEmbedMode(true);
                      const currentEp = episodes.find((ep: any) => ep.slug === activeEpisode) || episodes[0];
                      if (currentEp && (currentEp.link_embed || currentEp.link_m3u8)) {
                        setStreamUrl(currentEp.link_embed || currentEp.link_m3u8);
                      }
                      // 💾 Lưu chế độ embed lên DB (chỉ xem cá nhân)
                      const urlParamsCheckE = new URLSearchParams(window.location.search);
                      if (!urlParamsCheckE.has("room")) {
                        const tkn = localStorage.getItem("myflix_token");
                        const usrStr = localStorage.getItem("myflix_user");
                        if (tkn && usrStr) {
                          const usr = JSON.parse(usrStr);
                          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/update-time`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: usr.id, movieId: movie.id, currentTime: Math.floor(latestTimeRef.current || 0), serverName: activeServer, isEmbed: true })
                          }).catch(() => {});
                        }
                      }
                      const urlParams = new URLSearchParams(window.location.search);
                      const roomId = urlParams.get("room");
                      if (roomId && isHost) {
                        const userString = localStorage.getItem("myflix_user");
                        const user = userString ? JSON.parse(userString) : null;
                        socket.emit("host_update_room_state", {
                          roomId,
                          hostUserId: user?.id,
                          currentTime: latestTimeRef.current,
                          isPlaying: true,
                          episodeSlug: activeEpisode,
                          episodeName: activeEpisodeName,
                          serverName: activeServer,
                          isEmbedMode: true
                        });
                      }
                    }}
                    className={`px-3 py-1 text-xs font-bold uppercase rounded border transition cursor-pointer ${isEmbedMode ? "bg-amber-600 border-amber-500 text-white font-black" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
                  >
                    EMBED
                  </button>

                  {/* Server 2: M3U8 HLS Player */}
                  <button
                    onClick={() => {
                      setIsEmbedMode(false);
                      const currentEp = episodes.find((ep: any) => ep.slug === activeEpisode) || episodes[0];
                      if (currentEp && (currentEp.link_m3u8 || currentEp.link_embed)) {
                        setStreamUrl(currentEp.link_m3u8 || currentEp.link_embed);
                      }
                      // 💾 Lưu chế độ m3u8 lên DB (chỉ xem cá nhân)
                      const urlParamsCheckM = new URLSearchParams(window.location.search);
                      if (!urlParamsCheckM.has("room")) {
                        const tkn = localStorage.getItem("myflix_token");
                        const usrStr = localStorage.getItem("myflix_user");
                        if (tkn && usrStr) {
                          const usr = JSON.parse(usrStr);
                          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/update-time`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: usr.id, movieId: movie.id, currentTime: Math.floor(latestTimeRef.current || 0), serverName: activeServer, isEmbed: false })
                          }).catch(() => {});
                        }
                      }
                      const urlParams = new URLSearchParams(window.location.search);
                      const roomId = urlParams.get("room");
                      if (roomId && isHost) {
                        const userString = localStorage.getItem("myflix_user");
                        const user = userString ? JSON.parse(userString) : null;
                        socket.emit("host_update_room_state", {
                          roomId,
                          hostUserId: user?.id,
                          currentTime: latestTimeRef.current,
                          isPlaying: true,
                          episodeSlug: activeEpisode,
                          episodeName: activeEpisodeName,
                          serverName: activeServer,
                          isEmbedMode: false
                        });
                      }
                    }}
                    className={`px-3 py-1 text-xs font-bold uppercase rounded border transition cursor-pointer ${!isEmbedMode ? "bg-red-600/90 border-red-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
                  >
                    M3U8 HLS
                  </button>
                </div>
              </div>

              {/* Nút lưu phim cá nhân & Chia sẻ */}
              <div className={`${isMaximized ? "mb-4" : "mb-6"} flex items-center gap-3 relative`}>
                <button
                  onClick={toggleMyList}
                  className={`flex items-center justify-center gap-2 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-md font-bold transition border border-zinc-700 hover:border-white ${isMaximized ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
                >
                  {isInMyList ? (
                    <>
                      <span className="text-green-500 text-base">✓</span>
                      <span>Đã lưu vào danh sách</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">+</span>
                      <span>Thêm vào danh sách</span>
                    </>
                  )}
                </button>

                {/* Nút chia sẻ hình tròn */}
                <div className="relative" ref={shareMenuRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowShareMenu((prev) => !prev);
                    }}
                    title="Chia sẻ phim"
                    className={`flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-full transition border border-zinc-700 hover:border-white cursor-pointer active:scale-95 ${isMaximized ? "w-7 h-7" : "w-9 h-9"}`}
                  >
                    <svg className={`${isMaximized ? "w-3.5 h-3.5" : "w-4 h-4"} text-zinc-200`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  </button>

                  {/* Menu chia sẻ thả xuống (Floating Dropdown) */}
                  {showShareMenu && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 bottom-full mb-2 w-56 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] p-2 z-[9999] animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1 border-b border-zinc-800 mb-1">
                        Chia sẻ phim
                      </div>

                      {/* 1. Sao chép liên kết */}
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition text-left cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <span className="text-green-500 font-bold text-sm">✓</span>
                            <span className="text-green-400 font-bold">Đã sao chép link!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            <span>Sao chép liên kết</span>
                          </>
                        )}
                      </button>

                      {/* 2. Chia sẻ Facebook */}
                      <button
                        type="button"
                        onClick={handleShareFacebook}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-blue-600/20 hover:text-blue-400 transition text-left cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-[#1877F2] fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span>Chia sẻ Facebook</span>
                      </button>

                      {/* 3. Gửi qua Messenger */}
                      <button
                        type="button"
                        onClick={handleShareMessenger}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-sky-600/20 hover:text-sky-400 transition text-left cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-[#00B2FF] fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.093.303 2.252.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.963 3.13 3.259 5.889-3.259-6.56 6.963z"/>
                        </svg>
                        <span>Gửi qua Messenger</span>
                      </button>

                      {/* 4. Chia sẻ khác (Native OS) */}
                      {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                        <button
                          type="button"
                          onClick={handleNativeShare}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition text-left cursor-pointer border-t border-zinc-800/80 mt-1"
                        >
                          <svg className="w-4 h-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" y1="2" x2="12" y2="15" />
                          </svg>
                          <span>Chia sẻ khác...</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`text-zinc-400 leading-relaxed prose-sm max-w-none [&_p]:mb-2 ${isMaximized ? "text-xs md:text-sm line-clamp-3 hover:line-clamp-none transition-all cursor-pointer" : "text-sm md:text-base"}`}
                title={isMaximized ? "Nhấn để đọc đầy đủ mô tả" : ""}
                dangerouslySetInnerHTML={{
                  __html: (movie.description || "Chưa có mô tả cho bộ phim này.")
                    .replace(/<script[\s\S]*?<\/script>/gi, "") // strip scripts
                    .trim()
                }}
              />
            </div>

            {/* Khối hiển thị danh sách tập phim */}
            {episodes.length > 0 && (
              <div className={`${isMaximized ? "md:w-72" : "md:w-80"} w-full shrink-0`}>
                <h3 className="text-xs font-bold mb-3 text-zinc-500 uppercase tracking-widest">
                  Danh sách tập ({episodes.length})
                </h3>
                <div 
                  className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 ${isMaximized ? "max-h-[160px]" : "max-h-[220px]"} overflow-y-auto pr-2 custom-scrollbar overscroll-contain`}
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {episodes.map((ep, idx) => {
                    const urlToPlay = isEmbedMode ? (ep.link_embed || ep.link_m3u8) : (ep.link_m3u8 || ep.link_embed);
                    const isPlayable = Boolean(urlToPlay);
                    return (
                      <button
                        key={idx}
                        disabled={!isPlayable}
                        onClick={() => {
                          if (urlToPlay) {
                            if (movie) {
                              movie.watchId_db = `${movie.id}-${ep.slug}`;
                              movie.currentTime = 0;
                            }
                            setStreamUrl(urlToPlay);
                            setActiveEpisode(ep.slug);
                            setActiveEpisodeName(formatEpName(ep.name));
                          } else {
                            alert("Tập này không có link stream!");
                          }
                        }}
                        className={`py-2 px-1 rounded text-xs font-bold transition truncate cursor-pointer ${
                          !isPlayable ? "opacity-20 cursor-not-allowed bg-zinc-900" :
                          activeEpisode === ep.slug
                            ? "bg-red-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                        }`}
                      >
                        {formatEpName(ep.name)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}