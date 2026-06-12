"use client";

import { useState, useEffect, useMemo } from "react";
import { socket } from "@/services/socket.service";
import { movieService } from "@/services/movie.service";
import { Movie } from "@/types/movie";

export function useHomeLogic() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [keyword, setKeyword] = useState("");
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  const [mountIntro, setMountIntro] = useState(false);
  const [isMoviesLoading, setIsMoviesLoading] = useState(true);

  // 🔌 1. LUỒNG REALTIME SOCKET (WATCH PARTY)
  useEffect(() => {
    socket.connect();

    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("room");

    if (!roomId) {
      setSelectedMovie(null);
      return;
    }

    const userString = localStorage.getItem("myflix_user");
    const user = userString ? JSON.parse(userString) : null;
    const userName = user?.username || `ChiếnHữu_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const userId = user?.id || null;
    const hostToken = localStorage.getItem(`host_token_${roomId}`) || null;

    socket.emit("join_room", { roomId, userName, userId, hostToken });

    const handleRoomState = (data: any) => {
      if (data?.movieState?.slug) {
        setSelectedMovie({
          id: data.movieState.id || data.roomId,
          slug: data.movieState.slug,
          title: data.movieState.title,
          origin_name: "", thumb_url: "", poster_url: "",
          year: 2026, duration: "", genre: "", country: "", description: ""
        });
      }
    };

    const handleRoomError = (err: any) => {
      alert(`⚠️ Lỗi phòng: ${err.message}`);
      window.location.href = "/";
    };

    socket.on("room_state", handleRoomState);
    socket.on("room_error", handleRoomError);

    return () => {
      socket.off("room_state", handleRoomState);
      socket.off("room_error", handleRoomError);
    };
  }, []);

  // 🎬 2. LUỒNG FETCH DANH SÁCH PHIM TRANG CHỦ
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await movieService.getMovies();
        if (data && Array.isArray(data)) {
          setMovies(data);
        } else {
          console.warn("⚠️ [Home Logic API] Dữ liệu trả về không phải là mảng cấu trúc phim hợp lệ:", data);
        }
      } catch (error) {
        console.error("Lỗi fetch movies trang chủ:", error);
      } finally {
        setIsMoviesLoading(false);
      }
    };
    fetchMovies();
  }, []);

  // 🍿 3. LUỒNG KIỂM SOÁT INTRO SCREEN
  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem("myflix_has_seen_intro");
    if (!hasSeenIntro) {
      setMountIntro(true);
      const introTimer = setTimeout(() => {
        setIsIntroLoading(false);
        sessionStorage.setItem("myflix_has_seen_intro", "true");
      }, 2500);
      return () => clearTimeout(introTimer);
    } else {
      setIsIntroLoading(false);
      setMountIntro(false); 
    }
  }, []);

  useEffect(() => {
    if (isIntroLoading) {
      sessionStorage.setItem("myflix_has_seen_intro", "true");
      const introTimer = setTimeout(() => {
        setIsIntroLoading(false);
      }, 2500);
      return () => clearTimeout(introTimer);
    }
  }, [isIntroLoading]);

  // 📚 4. LUỒNG QUẢN LÝ LỊCH SỬ XEM (ĐÃ ĐỒNG BỘ MAPPING LÀM SẠCH ẢNH POSTER)
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const token = localStorage.getItem("myflix_token");
        const userString = localStorage.getItem("myflix_user");

        // Nhánh 1: Đã đăng nhập ➡️ Nã thẳng API Local bốc dữ liệu từ Cloud Neon
        if (token && userString) {
          const user = JSON.parse(userString);

          const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
          const res = await fetch(`${BACKEND_URL}/api/history/${user.id}`);
          
          if (res.ok) {
            const dbData = await res.json();
            
            if (!dbData || dbData.length === 0) {
              sessionStorage.removeItem("myflix_db_history");
              setContinueWatching([]);
              return;
            }

            // 👉 LƯU VÀO SESSION STORAGE ĐỂ MODAL ĐỌC ĐƯỢC KHI CLICK TỪ TRENDING
            sessionStorage.setItem("myflix_db_history", JSON.stringify(dbData));

            // 🚀 GIỮ NGUYÊN LOGIC DÙNG MAP LỌC TRÙNG CŨ CỦA ÔNG
            const uniqueMoviesMap = new Map();
            dbData.forEach((item: any) => {
              const movieObj = item.movie ? { ...item.movie } : null; 
              if (movieObj && movieObj.id && !uniqueMoviesMap.has(movieObj.id)) {
                
                // 🎯 TÁI TẠO LẠI watchId_db CHỨA SỐ TẬP ĐỂ MODAL BIẾT ĐƯỜNG MỞ ĐÚNG TẬP XEM DỞ
                const baseId = item.watchId || item.watch_id;
                const epSlug = item.episodeSlug || item.episode_slug;
                movieObj.watchId_db = (epSlug && epSlug !== "full") ? `${baseId}-${epSlug}` : baseId;
                
                // Lấy watched_time từ DB map ngược vào biến currentTime cho Modal đọc
                movieObj.currentTime = item.currentTime || item.watched_time; 

                // 🛡️ Đồng bộ tên phim và trường ảnh để né lỗi "No Image" ngoài trang chủ
                movieObj.title = movieObj.title || movieObj.name;
                movieObj.poster_url = movieObj.poster_url || movieObj.poster || movieObj.thumb_url;
                movieObj.thumb_url = movieObj.thumb_url || movieObj.banner || movieObj.poster;

                uniqueMoviesMap.set(movieObj.id, movieObj);
              }
            });
            
            const finalHistoryList = Array.from(uniqueMoviesMap.values());
            setContinueWatching(finalHistoryList);
            return;
          }
        } 
        // Nhánh 2: Khách vãng lai chưa đăng nhập ➡️ Mới được bốc từ Local Storage dưới máy
        else {
          const historyData = localStorage.getItem("myflix_history");
          if (historyData) {
            const parsedHistory = JSON.parse(historyData);
            const uniqueMoviesMap = new Map();
            
            parsedHistory.forEach((item: any) => {
              const movieObj = item.movie ? { ...item.movie } : null;
              if (movieObj && movieObj.id && !uniqueMoviesMap.has(movieObj.id)) {
                const baseId = item.watchId && item.watchId.includes("-") ? item.watchId.split("-")[0] : item.watchId;
                const epSlug = item.episodeSlug;
                movieObj.watchId_db = (epSlug && epSlug !== "full") ? `${baseId}-${epSlug}` : item.watchId;
                movieObj.currentTime = item.currentTime;

                // 🛡️ Đồng bộ tên phim và trường ảnh cho luồng Guest
                movieObj.title = movieObj.title || movieObj.name;
                movieObj.poster_url = movieObj.poster_url || movieObj.poster || movieObj.thumb_url;
                movieObj.thumb_url = movieObj.thumb_url || movieObj.banner || movieObj.poster;

                uniqueMoviesMap.set(movieObj.id, movieObj);
              }
            });
            const finalHistoryList = Array.from(uniqueMoviesMap.values());
            setContinueWatching(finalHistoryList);
          } else {
            setContinueWatching([]);
          }
        }
      } catch (e: any) { 
        console.error("💥 [FE LOG] Sập nguồn kết nối tới Backend Local! Lỗi:", e.message); 
      }
    };

    // Luồng kích hoạt delay thông minh đợi DB Neon ghi xong là tự động reload UI
    const handleHistoryUpdateWithDelay = () => {
      setTimeout(() => {
        loadHistory();
      }, 350);
    };

    loadHistory();
    window.addEventListener("myflix_history_updated", handleHistoryUpdateWithDelay);
    return () => window.removeEventListener("myflix_history_updated", handleHistoryUpdateWithDelay);
  }, []);

  // 🗑========= 5. LUỒNG THAO TÁC XÓA LỊCH SỬ XEM DỞ (ĐÃ CHUYỂN VỀ LOCAL API) =========
  const handleRemoveHistory = async (movieData: any) => {
    const targetId = movieData?.id || movieData;
    const token = localStorage.getItem("myflix_token");
    const userString = localStorage.getItem("myflix_user");

    if (token && userString) {
      const user = JSON.parse(userString);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/delete?userId=${user.id}&watchId=${targetId}`, { 
          method: "DELETE" 
        });
        if (res.ok) {
          window.dispatchEvent(new Event("myflix_history_updated"));
        }
      } catch (err) {
        console.error("💥 Lỗi xóa lịch sử qua API Local:", err);
      }
      return;
    }
    
    // Nếu chưa đăng nhập: Chỉ xử lý mảng cô đơn trong Local Storage máy mình
    const historyData = localStorage.getItem("myflix_history");
    if (historyData) {
      const history = JSON.parse(historyData).filter((h: any) => {
        const baseId = h.watchId?.includes("-") ? h.watchId.split('-')[0] : h.watchId;
        return String(baseId) !== String(targetId);
      });
      localStorage.setItem("myflix_history", JSON.stringify(history));
      window.dispatchEvent(new Event("myflix_history_updated"));
    }
  };

  // 🗂️ 6. LUỒNG PHÂN CHIA DANH MỤC PHIM (DÙNG USEMEMO TỐI ƯU SẠCH RE-RENDER)
  const movieSections = useMemo(() => {
    if (movies.length === 0) return [];

    return [
      { title: "Trending Now", movies: movies.slice(0, 10) },
      { title: "Phim Trung Quốc", movies: movies.filter((m) => m.country === "Trung Quốc") },
      { title: "Phim Hàn Quốc", movies: movies.filter((m) => m.country === "Hàn Quốc") },
      { title: "Hành động", movies: movies.filter((m) => m.genre === "Hành động") },
      { title: "Chính kịch", movies: movies.filter((m) => m.genre === "Chính kịch") },
      { title: "Âu Mỹ", movies: movies.filter((m) => m.country === "Âu Mỹ") },
    ].filter((section) => section.movies.length > 0);
  }, [movies]);

  return {
    selectedMovie, setSelectedMovie,
    keyword, setKeyword,
    continueWatching,
    movies,
    mountIntro, isIntroLoading,
    isMoviesLoading,
    movieSections,
    handleRemoveHistory
  };
}