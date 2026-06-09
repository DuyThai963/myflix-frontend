"use client";

import { useState, useEffect, useRef } from "react";
import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";
import { socket } from "@/services/socket.service";

export function useMovieModalLogic(movie: Movie | null, onClose: () => void) {
  const [streamUrl, setStreamUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [episodeData, setEpisodeData] = useState<any[]>([]);
  const [activeServer, setActiveServer] = useState<string>("");
  const [activeEpisode, setActiveEpisode] = useState("");
  const [activeEpisodeName, setActiveEpisodeName] = useState("");
  const [isInMyList, setIsInMyList] = useState(false);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const [fullMovieDetail, setFullMovieDetail] = useState<any>(null);

  const latestTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // 📡 1. ĐỒNG BỘ MỐC THỜI GIAN CHO KHÁCH (LUỒNG WATCH PARTY HOST)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const currentRoomId = urlParams.get("room");
    if (!currentRoomId) return;

    const handleRequestCurrentTimeFromHost = ({ targetSocketId }: { targetSocketId: string }) => {
      socket.emit("host_submitted_time_for_newbie", {
        roomId: currentRoomId,
        targetSocketId,
        currentTime: latestTimeRef.current,
        isPlaying: isPlayingRef.current
      });
    };

    socket.on("request_current_time_from_host", handleRequestCurrentTimeFromHost);
    return () => {
      socket.off("request_current_time_from_host", handleRequestCurrentTimeFromHost);
    };
  }, []);

  // ✕ 2. LẮNG NGHE SỰ KIỆN PHÍM ESC ĐỂ TẮT MODAL KHẨN CẤP
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 📦 3. KIỂM TRA PHIM TRONG DANH SÁCH YÊU THÍCH (MY LIST)
  useEffect(() => {
    if (!movie) return;
    try {
      const myListData = localStorage.getItem("myflix_mylist");
      if (myListData) {
        const myList = JSON.parse(myListData);
        setIsInMyList(myList.some((m: any) => m.id === movie.id));
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
        if (myList.length > 20) myList = myList.slice(0, 20);
      }
      localStorage.setItem("myflix_mylist", JSON.stringify(myList));
      window.dispatchEvent(new Event("myflix_mylist_updated"));
    } catch (e) {
      console.error("Lỗi cập nhật My List", e);
    }
  };

  // 🎬 4. LỘI CHI TIẾT TỪ PROXY API OPHIM & CHECK LỊCH SỬ TẬP COI DỞ (BẢN ĐỒNG BỘ HOÀN HẢO)
  useEffect(() => {
    const fetchFullDetail = async () => {
      if (!movie?.slug) return;
      setLoading(true);

      try {
        const data = await movieService.getMovieDetail(movie.slug);
        if (data && data.episodes) {
          if (data.movie) setFullMovieDetail(data.movie);

          setEpisodeData(data.episodes);
          const firstServer = data.episodes[0];
          setActiveServer(firstServer.server_name);
          const serverData = firstServer.server_data || [];
          setEpisodes(serverData);

          if (serverData.length > 0) {
            let startEpisode = serverData[0];
            const token = localStorage.getItem("myflix_token");

            // Nhánh Đã Login
            if (token && movie.episode_current) {
              const targetEpNumber = movie.episode_current.replace(/\D/g, "");
              const foundEp = serverData.find((ep: any) => ep.name.replace(/\D/g, "") === targetEpNumber);
              if (foundEp) startEpisode = foundEp;
            } 
            // Nhánh Chưa Login
            else {
              try {
                const historyData = localStorage.getItem("myflix_history");
                if (historyData) {
                  const history = JSON.parse(historyData);
                  const movieHistory = history.find((h: any) => String(h.movie.id) === String(movie.id));
                  if (movieHistory) {
                    const targetSlug = movieHistory.episodeSlug || movieHistory.episodeslug;
                    const foundEp = serverData.find((ep: any) => ep.slug === targetSlug);
                    if (foundEp) startEpisode = foundEp;
                  }
                }
              } catch (e) {}
            }

            const targetUrl = startEpisode.link_m3u8 || startEpisode.link_embed;
            if (targetUrl?.trim()) {
              setStreamUrl(targetUrl);
              setActiveEpisode(startEpisode.slug);
              setActiveEpisodeName(startEpisode.name);
            }
          }
        }
      } catch (error) {
        console.error("LỖI FETCH DETAIL MODAL:", error);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchFullDetail();
  }, [movie]);

  // 📊 5. XỬ LÝ TIẾN TRÌNH XEM PHIM ĐỊNH KỲ (BẬT LÁ CHẮN ROOM & ĐĂNG NHẬP)
  const handleProgress = async (currentTime: number) => {
    const urlParams = new URLSearchParams(window.location.search);
    const isWatchPartyActive = urlParams.has("room");

    latestTimeRef.current = currentTime;
    isPlayingRef.current = true;

    if (isWatchPartyActive) return; 
    if (!movie || !activeEpisode) return;

    const source = fullMovieDetail || movie;
    const currentWatch = {
      watchId: `${movie.id}-${activeEpisode}`,
      episodeSlug: activeEpisode,
      episodeName: activeEpisodeName,
      currentTime,
      updatedAt: new Date().toISOString(),
      movie: {
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        description: source.description || movie.description || "",
        poster: source.thumb_url || source.poster || movie.poster || "",
        banner: source.poster_url || source.banner || movie.banner || "",
        year: source.year || movie.year || 0,
        duration: source.duration || movie.duration || "0",
        country: source.country || movie.country || "",
        genre: source.genre || movie.genre || "",
        episode_current: activeEpisodeName ? `Tập ${activeEpisodeName}` : movie.episode_current
      }
    };

    const token = localStorage.getItem("myflix_token");
    const userString = localStorage.getItem("myflix_user");

    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, localHistory: [currentWatch] })
        });
      } catch (err) {
        console.error("❌ Lỗi đồng bộ real-time lên server:", err);
      }
      return; 
    }

    try {
      const historyData = localStorage.getItem("myflix_history");
      let history = historyData ? JSON.parse(historyData) : [];

      history = history.filter((h: any) => h.watchId !== currentWatch.watchId);
      history.unshift(currentWatch);
      if (history.length > 20) history = history.slice(0, 20);

      localStorage.setItem("myflix_history", JSON.stringify(history));
    } catch (e) {
      console.error("Lỗi lưu lịch sử local:", e);
    }
  };

  // ⏭️ 6. CHUYỂN TẬP TIẾP THEO TỰ ĐỘNG
  const handleNextEpisode = () => {
    if (episodes.length <= 1) return;
    const currentIdx = episodes.findIndex((ep) => ep.slug === activeEpisode);
    
    if (currentIdx !== -1 && currentIdx < episodes.length - 1) {
      const nextEp = episodes[currentIdx + 1];
      const nextUrl = nextEp.link_m3u8 || nextEp.link_embed;

      if (nextUrl?.trim()) {
        if (movie) {
          movie.episode_current = `Tập ${nextEp.name}`;
          movie.watchId_db = `${movie.id}-${nextEp.slug}`;
          movie.currentTime = 0; // 🔥 ÉP CHẾT REFERENCE OBJECT VỀ CHỮA CHÁY TIME 0S TỨC THÌ
        }

        setStreamUrl(nextUrl);
        setActiveEpisode(nextEp.slug);
        setActiveEpisodeName(nextEp.name);
      }
    }
  };

  const currentIdx = episodes.findIndex((ep) => ep.slug === activeEpisode);
  const hasNextEpisode = episodes.length > 1 && currentIdx !== -1 && currentIdx < episodes.length - 1;

  return {
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
  };
}