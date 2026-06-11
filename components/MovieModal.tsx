"use client";

import { Movie } from "@/types/movie";
import VideoPlayer from "./VideoPlayer";
import { motion } from "framer-motion";
import { useMovieModalLogic, formatEpName } from "@/hooks/useMovieModalLogic";

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
    toggleMyList,
    handleProgress,
    handleNextEpisode
  } = useMovieModalLogic(movie, onClose);

  if (!movie) {
    const isRoom = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("room");
    if (isRoom) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm select-none"
        >
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-zinc-400 tracking-wide animate-pulse">
              📡 Đang kết nối hạ tầng và đồng bộ phòng xem chung...
            </p>
          </div>
        </motion.div>
      );
    }
    return null;
  }

  return (
    <motion.div
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm select-none"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-950 rounded-xl overflow-hidden w-full max-w-5xl max-h-[95vh] flex flex-col relative border border-zinc-800 shadow-2xl"
      >
        {!isPlayerFullscreen && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            style={{ zIndex: 2147483647 }} 
            className="absolute top-4 right-4 bg-black/70 hover:bg-white text-white hover:text-black w-10 h-10 rounded-full transition flex items-center justify-center text-xl shadow-2xl border border-zinc-700/50 cursor-pointer pointer-events-auto"
          >
            ✕
          </button>
        )}

        {/* Trình phát Video Player */}
        <div className="aspect-video bg-black w-full relative z-10">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-zinc-700 border-t-red-600 rounded-full animate-spin" />
            </div>
          ) : streamUrl ? (
            <VideoPlayer 
              key={`${movie.id}-${activeEpisode}`} // 🎯 BẢO HIỂM 1: Đập nhịp re-render component con từ lớp cha
              src={streamUrl} 
              movieId={`${movie.id}-${activeEpisode}`} 
              onProgress={handleProgress}
              isSeries={hasNextEpisode} 
              onNext={handleNextEpisode} 
              initialTime={typeof movie.currentTime === 'number' ? Math.floor(movie.currentTime) : initialTime}
              onFullscreenChange={(isFullscreenNow) => setIsPlayerFullscreen(isFullscreenNow)}
              movieData={fullMovieDetail || movie}
              isWatchParty={isWatchParty} 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/50">
              <span className="text-4xl mb-2">⚠️</span>
              <p className="text-sm px-4 text-center">Nguồn phát hiện tại chưa khả dụng hoặc chỉ có Trailer</p>
            </div>
          )}
        </div>

        {/* Khối hiển thị thông tin chi tiết phim */}
        <div className="p-6 md:p-8 overflow-y-auto z-0 flex-1">
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

              {/* Bộ chọn Server phát */}
              {episodeData.length > 1 && (
                <div className="flex gap-2 mb-6">
                  {episodeData.map((server) => (
                    <button 
                      key={server.server_name} 
                      onClick={() => {
                        setActiveServer(server.server_name);
                        setEpisodes(server.server_data);
                        const ep = server.server_data[0];
                        setStreamUrl(ep.link_m3u8 || ep.link_embed);
                        setActiveEpisode(ep.slug);
                        setActiveEpisodeName(formatEpName(ep.name));
                      }} 
                      className={`px-3 py-1 text-xs font-bold uppercase rounded border transition ${activeServer === server.server_name ? "bg-red-600 border-red-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                    >
                      {server.server_name}
                    </button>
                  ))}
                </div>
              )}

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

              <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                {movie.description || "Chưa có mô tả cho bộ phim này."}
              </p>
            </div>

            {/* Khối hiển thị danh sách tập phim */}
            {episodes.length > 0 && (
              <div className="md:w-80 w-full shrink-0">
                <h3 className="text-xs font-bold mb-4 text-zinc-500 uppercase tracking-widest">
                  Danh sách tập ({episodes.length})
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {episodes.map((ep, idx) => {
                    const isPlayable = ep.link_m3u8 && ep.link_m3u8.trim() !== "";
                    return (
                      <button
                        key={idx}
                        disabled={!isPlayable}
                        onClick={() => {
                          if (ep.link_m3u8 || ep.link_embed) {
                            if (movie) {
                              // ❌ KHÔNG GHI ĐÈ movie.episode_current Ở ĐÂY NỮA, BẢO TOÀN TRẠNG THÁI GỐC
                              movie.watchId_db = `${movie.id}-${ep.slug}`;
                              movie.currentTime = 0;
                            }
                            setStreamUrl(ep.link_m3u8 || ep.link_embed);
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