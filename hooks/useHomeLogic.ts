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
  const [phimBo, setPhimBo] = useState<Movie[]>([]);
  const [phimLe, setPhimLe] = useState<Movie[]>([]);
  const [hoatHinh, setHoatHinh] = useState<Movie[]>([]);
  const [tvShows, setTvShows] = useState<Movie[]>([]);
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  const [mountIntro, setMountIntro] = useState(false);
  const [isMoviesLoading, setIsMoviesLoading] = useState(true);

  // 🎬 2. LUỒNG FETCH SONG SONG CÁC DANH MỤC PHIM TRANG CHỦ
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const [homeRes, boRes, leRes, hhRes, tvRes] = await Promise.allSettled([
          movieService.getMovies(),
          movieService.getMoviesByCategory("phim-bo"),
          movieService.getMoviesByCategory("phim-le"),
          movieService.getMoviesByCategory("hoat-hinh"),
          movieService.getMoviesByCategory("tv-shows")
        ]);

        if (homeRes.status === "fulfilled" && Array.isArray(homeRes.value)) setMovies(homeRes.value);
        if (boRes.status === "fulfilled" && Array.isArray(boRes.value)) setPhimBo(boRes.value);
        if (leRes.status === "fulfilled" && Array.isArray(leRes.value)) setPhimLe(leRes.value);
        if (hhRes.status === "fulfilled" && Array.isArray(hhRes.value)) setHoatHinh(hhRes.value);
        if (tvRes.status === "fulfilled" && Array.isArray(tvRes.value)) setTvShows(tvRes.value);
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
            console.log("📺 [FE Home History] User Logged In -> Raw DB history from Neon:", dbData);
            
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
              const movieId = movieObj ? (movieObj.id || movieObj._id || movieObj.slug || item.watchId || item.watch_id) : (item.watchId || item.watch_id);

              if (movieObj && movieId && !uniqueMoviesMap.has(movieId)) {
                movieObj.id = movieId;
                
                // 🎯 TÁI TẠO LẠI watchId_db CHỨA SỐ TẬP ĐỂ MODAL BIẾT ĐƯỜNG MỞ ĐÚNG TẬP XEM DỞ
                const baseId = item.watchId || item.watch_id || movieId;
                const epSlug = item.episodeSlug || item.episode_slug;
                movieObj.watchId_db = (epSlug && epSlug !== "full") ? `${baseId}-${epSlug}` : baseId;
                
                // Lấy watched_time từ DB map ngược vào biến currentTime cho Modal đọc
                movieObj.currentTime = typeof item.currentTime === "number" ? item.currentTime : parseFloat(item.watched_time || 0); 

                // 🛡️ Đồng bộ tên phim và trường ảnh để né lỗi "No Image" ngoài trang chủ
                movieObj.title = movieObj.title || movieObj.name;
                movieObj.poster = movieObj.poster || movieObj.poster_url || movieObj.thumb_url;
                movieObj.poster_url = movieObj.poster_url || movieObj.poster || movieObj.thumb_url;
                movieObj.thumb_url = movieObj.thumb_url || movieObj.banner || movieObj.poster;

                uniqueMoviesMap.set(movieId, movieObj);
              }
            });
            
            const finalHistoryList = Array.from(uniqueMoviesMap.values());
            console.log("✅ [FE Home History SUCCESS] Processed Continue Watching List:", finalHistoryList);
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
              const movieId = movieObj ? (movieObj.id || movieObj._id || movieObj.slug || item.watchId) : item.watchId;

              if (movieObj && movieId && !uniqueMoviesMap.has(movieId)) {
                movieObj.id = movieId;
                const baseId = item.watchId && item.watchId.includes("-") ? item.watchId.split("-")[0] : item.watchId;
                const epSlug = item.episodeSlug;
                movieObj.watchId_db = (epSlug && epSlug !== "full") ? `${baseId}-${epSlug}` : item.watchId;
                movieObj.currentTime = typeof item.currentTime === "number" ? item.currentTime : 0;

                // 🛡️ Đồng bộ tên phim và trường ảnh cho luồng Guest
                movieObj.title = movieObj.title || movieObj.name;
                movieObj.poster = movieObj.poster || movieObj.poster_url || movieObj.thumb_url;
                movieObj.poster_url = movieObj.poster_url || movieObj.poster || movieObj.thumb_url;
                movieObj.thumb_url = movieObj.thumb_url || movieObj.banner || movieObj.poster;

                uniqueMoviesMap.set(movieId, movieObj);
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

  // 🗂️ 6. LUỒNG PHÂN CHIA DANH MỤC PHIM PHONG PHÚ (DÙNG USEMEMO TỐI ƯU SẠCH RE-RENDER)
  const movieSections = useMemo(() => {
    const sections = [];

    if (movies.length > 0) {
      sections.push({ title: "Trending Now (Phim Mới Cập Nhật)", movies });
    }
    if (phimBo.length > 0) {
      sections.push({ title: "Phim Bộ Đặc Sắc", movies: phimBo });
    }
    if (phimLe.length > 0) {
      sections.push({ title: "Phim Lẻ Chiếu Rạp", movies: phimLe });
    }
    if (hoatHinh.length > 0) {
      sections.push({ title: "Hoạt Hình & Anime", movies: hoatHinh });
    }
    if (tvShows.length > 0) {
      sections.push({ title: "TV Shows & Truyền Hình", movies: tvShows });
    }

    return sections;
  }, [movies, phimBo, phimLe, hoatHinh, tvShows]);

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