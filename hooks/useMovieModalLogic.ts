"use client";

import { useState, useEffect, useRef } from "react";
import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";
import { socket } from "@/services/socket.service";

// 🛠️ HÀM HELPER: CHUẨN HÓA TÊN TẬP PHIM
export const formatEpName = (name: string) => {
  if (!name) return "";
  return /^\d+$/.test(name.trim()) ? `Tập ${name.trim()}` : name.trim();
};

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
  const hasInitRef = useRef<string | null>(null); // 🛡️ Cờ chống spam API 2 lần do StrictMode
  const isHostRef = useRef<boolean>((movie as any)?.isHost || false);
  const latestSyncTimeRef = useRef<number>(0);
  const activeEpisodeRef = useRef(activeEpisode);
  const activeEpisodeNameRef = useRef(activeEpisodeName);
  const previousEpisodeRef = useRef<string | null>(null);

  useEffect(() => {
    activeEpisodeRef.current = activeEpisode;
    activeEpisodeNameRef.current = activeEpisodeName;
  }, [activeEpisode, activeEpisodeName]);

  useEffect(() => {
    if (movie && (movie as any).isHost !== undefined) isHostRef.current = (movie as any).isHost;
  }, [movie]);

  // 📡 1. ĐỒNG BỘ MỐC THỜI GIAN CHO KHÁCH (LUỒNG WATCH PARTY HOST)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const currentRoomId = urlParams.get("room");
    if (!currentRoomId) return;

    const handleRoomState = (data: any) => {
      isHostRef.current = data.isHost;
    };
    const handlePromoted = () => {
      isHostRef.current = true;
    };

    const handleRequestCurrentTimeFromHost = ({ targetSocketId }: { targetSocketId: string }) => {
      socket.emit("host_submitted_time_for_newbie", {
        roomId: currentRoomId,
        targetSocketId,
        // 🎯 BÙ TRỪ LATENCY: Cộng thêm 1.5s để trừ hao thời gian truyền mạng và thời gian Player của Guest Buffer video tải lên
        currentTime: latestTimeRef.current + 1.5,
        isPlaying: isPlayingRef.current,
        episodeSlug: activeEpisodeRef.current,
        episodeName: activeEpisodeNameRef.current
      });
    };

    socket.on("room_state", handleRoomState);
    socket.on("you_are_promoted_to_host", handlePromoted);
    socket.on("request_current_time_from_host", handleRequestCurrentTimeFromHost);
    return () => {
      socket.off("room_state", handleRoomState);
      socket.off("you_are_promoted_to_host", handlePromoted);
      socket.off("request_current_time_from_host", handleRequestCurrentTimeFromHost);
    };
  }, []);

  // 📡 1.5. CHỐT NGAY TẬP MỚI VÀO REDIS KHI HOST VỪA VÀO PHÒNG HOẶC ĐỔI TẬP
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("room");
    if (roomId && activeEpisode) {
      if (previousEpisodeRef.current === activeEpisode) {
        return; // 🛡️ Chặn React Strict Mode hoặc re-render vô ích
      }
      if (previousEpisodeRef.current === null) {
        previousEpisodeRef.current = activeEpisode;
        return; // 🛡️ Bỏ qua lần render đầu tiên khi Host vừa vào phòng để KHÔNG GHI ĐÈ currentTime cũ thành 0
      }
      previousEpisodeRef.current = activeEpisode;

      if (isHostRef.current) {
        latestSyncTimeRef.current = 0; // Reset mốc đo 5s
        socket.emit("host_update_room_state", {
          roomId,
          currentTime: 0,
          isPlaying: isPlayingRef.current,
          episodeSlug: activeEpisode,
          episodeName: activeEpisodeName
        });
      }
    }
  }, [activeEpisode, activeEpisodeName]);

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
            let startEpisode = serverData[0]; // Tập đầu tiên mặc định

            // 🎯 1. LỤC SOÁT LỊCH SỬ XEM DỞ TỪ LOCAL & SESSION STORAGE (USER/GUEST)
            let foundHistorySlug: string | null = null;
            try {
              // Check Guest
              const localHist = localStorage.getItem("myflix_history");
              if (localHist) {
                const histArr = JSON.parse(localHist);
                const found = histArr.find((h: any) => String(h.movie?.id || h.watchId).startsWith(String(movie.id)));
                if (found) foundHistorySlug = found.episodeSlug || found.episodeslug;
              }
              // Check User Logged In
              if (!foundHistorySlug) {
                const dbHist = sessionStorage.getItem("myflix_db_history");
                if (dbHist) {
                  const histArr = JSON.parse(dbHist);
                  const found = histArr.find((h: any) => String(h.watchId).startsWith(String(movie.id)));
                  if (found) foundHistorySlug = found.episodeSlug || found.episodeslug;
                }
              }
            } catch (e) {}

            // 🎯 2. QUYẾT ĐỊNH TẬP NÀO ĐƯỢC CHỌN ĐỂ PHÁT
            let chosenEp = null;

            if (movie.watchId_db) {
              const parts = String(movie.watchId_db).split('-');
              if (parts.length > 1) {
                const targetSlug = parts.slice(1).join('-');
                chosenEp = serverData.find((ep: any) => String(ep.slug) === String(targetSlug));
              }
            }
            
            if (!chosenEp && foundHistorySlug) {
              chosenEp = serverData.find((ep: any) => String(ep.slug) === String(foundHistorySlug));
            }

            if (chosenEp) {
              startEpisode = chosenEp;
            }
            // Nhánh C: Phim hoàn toàn mới -> Giữ nguyên startEpisode = serverData[0]

            const targetUrl = startEpisode.link_m3u8 || startEpisode.link_embed;
            if (targetUrl?.trim()) {
              setStreamUrl(targetUrl);
              setActiveEpisode(startEpisode.slug);
              setActiveEpisodeName(formatEpName(startEpisode.name));
            }

            // --- KHỞI TẠO KHUNG PHIM TĨNH (THỜI ĐIỂM 1) ---
            if (!data.item || !data.item.name) {
              console.warn("⚠️ Chặn Init History: Thiếu dữ liệu phim gốc data.item hoặc data.item.name");
            } else {
              try {
                const token = localStorage.getItem("myflix_token");
                const userString = localStorage.getItem("myflix_user");
                if (token && userString) {
                  const user = JSON.parse(userString);
                  
                  // 🛡️ CHỐT CHẶN: Chỉ gọi API nếu chưa init cho ID phim này
                  if (hasInitRef.current !== String(movie.id)) {
                    hasInitRef.current = String(movie.id);
                    
                    const payload = {
                      userId: user.id,
                      movieId: movie.id,
                      episodeSlug: startEpisode.slug,
                      episodeName: formatEpName(startEpisode.name),
                      currentTime: 0,
                      movie: { ...data.item, title: data.item.name }
                    };
                    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/init`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload)
                    }).catch(err => console.error("Lỗi gọi INIT API:", err));
                  }
                }
              } catch (e) {
                console.error("Lỗi parse user data", e);
              }
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

    if (isWatchPartyActive) {
      // Nếu là Host, liên tục nã tiến trình và tập phim lên Redis để chốt sổ khi phòng trống
      if (isHostRef.current) {
        const roomId = urlParams.get("room");
        if (roomId && Math.abs(currentTime - latestSyncTimeRef.current) >= 5) {
          latestSyncTimeRef.current = currentTime;
          socket.emit("host_update_room_state", {
            roomId,
            currentTime: Math.floor(currentTime),
            isPlaying: true,
            episodeSlug: activeEpisodeRef.current,
            episodeName: activeEpisodeNameRef.current
          });
        }
      }
      return; 
    }
    if (!movie || !activeEpisode) return;

    const token = localStorage.getItem("myflix_token");
    const userString = localStorage.getItem("myflix_user");

    // 🛡️ CHỐT CHẶN: Đã đăng nhập thì RETURN luôn, cấm gọi API liên tục mỗi giây để chống spam DB!
    if (token && userString) {
      return; 
    }

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
        episode_current: movie.episode_current // 🛡️ Giữ nguyên mốc "Hoàn tất / Tập mới nhất" gốc của phim
      }
    };

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
          movie.watchId_db = `${movie.id}-${nextEp.slug}`;
          movie.currentTime = 0; // 🔥 ÉP CHẾT REFERENCE OBJECT VỀ CHỮA CHÁY TIME 0S TỨC THÌ
        }

        setStreamUrl(nextUrl);
        setActiveEpisode(nextEp.slug);
        setActiveEpisodeName(formatEpName(nextEp.name));
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
    handleNextEpisode,
    latestTimeRef
  };
}