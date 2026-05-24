"use client";

import { Movie } from "@/types/movie";
import VideoPlayer from "./VideoPlayer";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { movieService } from "@/services/movie.service";

type Props = {
  movie: Movie | null;
  onClose: () => void;
};

export default function MovieModal({ movie, onClose }: Props) {
  const [streamUrl, setStreamUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [episodeData, setEpisodeData] = useState<any[]>([]);
  const [activeServer, setActiveServer] = useState<string>("");
  const [activeEpisode, setActiveEpisode] = useState("");
  const [activeEpisodeName, setActiveEpisodeName] = useState("");
  const [isInMyList, setIsInMyList] = useState(false);

  // DÙNG STATE NÀY ĐỂ QUẢN LÝ ẨN NÚT X KHI PHÓNG TO
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);

  useEffect(() => {
    if (!movie) return;
    try {
      const myListData = localStorage.getItem("myflix_mylist");
      if (myListData) {
        const myList = JSON.parse(myListData);
        const isExist = myList.some((m: any) => m.id === movie.id);
        setIsInMyList(isExist);
      }
    } catch (e) {}
  }, [movie]);

  const toggleMyList = () => {
    if (!movie) return;
    try {
      const myListData = localStorage.getItem("myflix_mylist");
      let myList = myListData ? JSON.parse(myListData) : [];

      if (isInMyList) {
        myList = myList.filter((m: any) => m.id !== movie.id);
        setIsInMyList(false);
      } else {
        myList.unshift(movie);
        setIsInMyList(true);
        if (myList.length > 20) {
          myList = myList.slice(0, 20); 
        }
      }
      localStorage.setItem("myflix_mylist", JSON.stringify(myList));
      window.dispatchEvent(new Event("myflix_mylist_updated"));
    } catch (e) {
      console.error("Lỗi cập nhật My List", e);
    }
  };

  useEffect(() => {
    const fetchFullDetail = async () => {
      if (!movie?.slug) return;
      setLoading(true);
      try {
        const data = await movieService.getMovieDetail(movie.slug);
        if (data && data.episodes) {
          setEpisodeData(data.episodes);
          const firstServer = data.episodes[0];
          setActiveServer(firstServer.server_name);
          const serverData = firstServer.server_data || [];
          setEpisodes(serverData);

          if (serverData.length > 0) {
            let startEpisode = serverData[0];
            try {
               const historyData = localStorage.getItem("myflix_history");
               if(historyData){
                   const history = JSON.parse(historyData);
                   const movieHistory = history.find((h: any) => h.movie.id === movie.id);
                   if(movieHistory) {
                       const foundEp = serverData.find((ep: any) => ep.slug === movieHistory.episodeSlug);
                       if(foundEp) startEpisode = foundEp;
                   }
               }
            } catch(e) {}

            const targetUrl = startEpisode.link_m3u8 || startEpisode.link_embed;
            if (targetUrl && targetUrl.trim() !== "") {
              setStreamUrl(targetUrl);
              setActiveEpisode(startEpisode.slug);
              setActiveEpisodeName(startEpisode.name);
            } else {
              setStreamUrl("");
            }
          } else {
            setStreamUrl("");
          }
        } else {
          setStreamUrl("");
        }
      } catch (error) {
        console.error("LỖI KHI FETCH:", error);
        setStreamUrl("");
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchFullDetail();
  }, [movie]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleProgress = (currentTime: number) => {
    if (!movie || !activeEpisode) return;

    try {
      const historyData = localStorage.getItem("myflix_history");
      let history = historyData ? JSON.parse(historyData) : [];

      const currentWatch = {
        watchId: `${movie.id}-${activeEpisode}`,
        movie: movie,
        episodeSlug: activeEpisode,
        episodeName: activeEpisodeName,
        currentTime: currentTime,
        updatedAt: new Date().toISOString()
      };

      history = history.filter((h: any) => h.watchId !== currentWatch.watchId);
      history.unshift(currentWatch);
      if (history.length > 20) {
        history = history.slice(0, 20); 
      }

      localStorage.setItem("myflix_history", JSON.stringify(history));
    } catch (e) {
      console.error("Lỗi lưu lịch sử", e);
    }
  };

  const handleNextEpisode = () => {
    if (episodes.length <= 1) return;

    const currentIdx = episodes.findIndex((ep) => ep.slug === activeEpisode);
    
    if (currentIdx !== -1 && currentIdx < episodes.length - 1) {
      const nextEp = episodes[currentIdx + 1];
      const nextUrl = nextEp.link_m3u8 || nextEp.link_embed;

      if (nextUrl && nextUrl.trim() !== "") {
        setStreamUrl(nextUrl);
        setActiveEpisode(nextEp.slug);
        setActiveEpisodeName(nextEp.name);
      }
    }
  };

  const currentIdx = episodes.findIndex((ep) => ep.slug === activeEpisode);
  const hasNextEpisode = episodes.length > 1 && currentIdx !== -1 && currentIdx < episodes.length - 1;

  if (!movie) return null;

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

        {/* Player Section */}
        <div className="aspect-video bg-black w-full relative z-10">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-zinc-700 border-t-red-600 rounded-full animate-spin" />
            </div>
          ) : streamUrl ? (
            <VideoPlayer 
               src={streamUrl} 
               movieId={`${movie.id}-${activeEpisode}`} 
               onProgress={handleProgress}
               isSeries={hasNextEpisode} 
               onNext={handleNextEpisode} 
               /* ĐỒNG BỘ NGƯỢC STATE FULLSCREEN LÊN MODAL MẸ */
               onFullscreenChange={(isFullscreenNow) => setIsPlayerFullscreen(isFullscreenNow)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/50">
              <span className="text-4xl mb-2">⚠️</span>
              <p className="text-sm px-4 text-center">Nguồn phát hiện tại chưa khả dụng hoặc chỉ có Trailer</p>
            </div>
          )}
        </div>

        {/* Content Section */}
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

              {/* CHÈN ĐÚNG THANH CHỌN SERVER Ở ĐÂY */}
              {episodeData.length > 1 && (
                <div className="flex gap-2 mb-6">
                  {episodeData.map((server) => (
                    <button key={server.server_name} onClick={() => {
                        setActiveServer(server.server_name);
                        setEpisodes(server.server_data);
                        const ep = server.server_data[0];
                        setStreamUrl(ep.link_m3u8 || ep.link_embed);
                        setActiveEpisode(ep.slug);
                        setActiveEpisodeName(ep.name);
                    }} className={`px-3 py-1 text-xs font-bold uppercase rounded border transition ${activeServer === server.server_name ? "bg-red-600 border-red-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                      {server.server_name}
                    </button>
                  ))}
                </div>
              )}

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

            {/* Episode Selector */}
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
                          setStreamUrl(ep.link_m3u8 || ep.link_embed);
                          setActiveEpisode(ep.slug);
                          setActiveEpisodeName(ep.name);
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
                      Tập {ep.name}
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