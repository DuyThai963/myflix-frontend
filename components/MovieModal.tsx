"use client";

import { Movie } from "@/types/movie";
import VideoPlayer from "./VideoPlayer";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useMovieModalLogic, formatEpName, getBestStreamUrl } from "@/hooks/useMovieModalLogic";
import { socket } from "@/services/socket.service";

type Props = {
  movie: Movie | null;
  onClose: () => void;
  initialTime?: number;
  isWatchParty?: boolean;
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
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm select-none overflow-hidden"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} 
        className="bg-[#141414] w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-lg overflow-hidden flex flex-col relative shadow-2xl border border-zinc-800"
      >
        <button 
          onClick={onClose}
          className="absolute right-4 z-50 bg-black/70 hover:bg-zinc-800 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg transition duration-200 cursor-pointer"
          style={{ top: 'max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))' }}
        >
          ✕
        </button>

        {/* Khối Trình phát Video (Custom HLS Player hoặc IFrame Embed Dự Phòng) */}
        <div className="w-full bg-black relative shrink-0 overflow-hidden h-[38vh] sm:h-[42vh] md:h-[48vh] lg:h-[52vh]">
          {streamUrl ? (
            <VideoPlayer 
              key={`${movie.id}-${activeEpisode}`}
              src={streamUrl} 
              movieId={`${movie.id}-${activeEpisode}`} 
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

        {/* Khối hiển thị thông tin chi tiết phim */}
        <div 
          className="p-6 md:p-8 overflow-y-auto z-0 flex-1 overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold mb-3 text-white leading-tight">
                {movie.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm font-medium mb-6">
                <span className="text-green-500 font-bold">{movie.year}</span>
                <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{movie.duration}</span>
                <span className="text-zinc-400">{movie.genre}</span>
                <span className="text-zinc-400 border-l border-zinc-700 pl-4">{movie.country}</span>
              </div>

              {/* Bộ chọn Nguồn Phim (Vietsub / Lồng Tiếng) & Định dạng Trình phát (HLS / Embed) */}
              <div className="space-y-3 mb-6">
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

                {/* 2. Chọn Định Dạng Trình Phát (M3U8 HLS vs Embed Dự Phòng) */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 mr-1">Player:</span>
                  <button
                    onClick={() => {
                      setIsEmbedMode(false);
                      const currentEp = episodes.find((ep: any) => ep.slug === activeEpisode) || episodes[0];
                      if (currentEp && (currentEp.link_m3u8 || currentEp.link_embed)) {
                        setStreamUrl(currentEp.link_m3u8 || currentEp.link_embed);
                      }
                      // 💾 Lưu chế độ m3u8 lên DB (chỉ xém cá nhân)
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
                    M3U8 HLS (Server 1)
                  </button>

                  <button
                    onClick={() => {
                      setIsEmbedMode(true);
                      const currentEp = episodes.find((ep: any) => ep.slug === activeEpisode) || episodes[0];
                      if (currentEp && (currentEp.link_embed || currentEp.link_m3u8)) {
                        setStreamUrl(currentEp.link_embed || currentEp.link_m3u8);
                      }
                      // 💾 Lưu chế độ embed lên DB (chỉ xém cá nhân)
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
                    EMBED (Server 2)
                  </button>
                </div>
              </div>

              {/* Nút lưu phim cá nhân */}
              <div className="mb-6 flex items-center gap-4">
                <button
                  onClick={toggleMyList}
                  className="flex items-center justify-center gap-2 bg-zinc-800/80 hover:bg-zinc-700 text-white px-4 py-2 rounded-md font-bold transition border border-zinc-700 hover:border-white text-sm"
                >
                  {isInMyList ? (
                    <>
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Đã lưu vào danh sách</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">+</span>
                      <span>Thêm vào danh sách</span>
                    </>
                  )}
                </button>
              </div>

              <div
                className="text-zinc-400 leading-relaxed text-sm md:text-base prose-sm max-w-none [&_p]:mb-2"
                dangerouslySetInnerHTML={{
                  __html: (movie.description || "Chưa có mô tả cho bộ phim này.")
                    .replace(/<script[\s\S]*?<\/script>/gi, "") // strip scripts
                    .trim()
                }}
              />
            </div>

            {/* Khối hiển thị danh sách tập phim */}
            {episodes.length > 0 && (
              <div className="md:w-80 w-full shrink-0">
                <h3 className="text-xs font-bold mb-4 text-zinc-500 uppercase tracking-widest">
                  Danh sách tập ({episodes.length})
                </h3>
                <div 
                  className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar overscroll-contain"
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