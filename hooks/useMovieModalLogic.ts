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

// 🛠️ HÀM HELPER: LẤY LINK STREAM MẶC ĐỊNH (ƯU TIÊN M3U8 ĐỂ DÙNG CUSTOM PLAYER ĐỦ TÍNH NĂNG)
export const getBestStreamUrl = (ep: any) => {
  if (!ep) return "";
  return (ep.link_m3u8 || ep.link_embed || "").trim();
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
  const [isEmbedMode, setIsEmbedMode] = useState<boolean>(false);

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
    let amIHost = (movie as any)?.isHost === true;
    if (!amIHost) {
      try {
        const userString = localStorage.getItem("myflix_user");
        if (userString) {
          const user = JSON.parse(userString);
          if (user?.id && (movie as any)?.hostUserId && String(user.id) === String((movie as any).hostUserId)) {
            amIHost = true;
          }
        }
      } catch (e) {}
    }
    isHostRef.current = amIHost;
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
    const handleDemoted = () => {
      isHostRef.current = false;
    };

    const handleRequestCurrentTimeFromHost = ({ targetSocketId }: { targetSocketId: string }) => {
      socket.emit("host_submitted_time_for_newbie", {
        roomId: currentRoomId,
        targetSocketId,
        // 🎯 BÙ TRỪ LATENCY: Cộng thêm 1.5s để trừ hao thời gian truyền mạng và thời gian Player của Guest Buffer video tải lên
        currentTime: latestTimeRef.current + 1.5,
        isPlaying: isPlayingRef.current,
        episodeSlug: activeEpisodeRef.current,
        episodeName: activeEpisodeNameRef.current,
        serverName: activeServer,
        isEmbedMode
      });
    };

    socket.on("room_state", handleRoomState);
    socket.on("you_are_promoted_to_host", handlePromoted);
    socket.on("you_are_demoted_to_guest", handleDemoted);
    socket.on("request_current_time_from_host", handleRequestCurrentTimeFromHost);
    return () => {
      socket.off("room_state", handleRoomState);
      socket.off("you_are_promoted_to_host", handlePromoted);
      socket.off("you_are_demoted_to_guest", handleDemoted);
      socket.off("request_current_time_from_host", handleRequestCurrentTimeFromHost);
    };
  }, [isEmbedMode, activeServer]);

  // 📡 1.5. CHỐT NGAY TẬP/SERVER/EMBED MỚI VÀO REDIS KHI HOST ĐỔI BẤT KỲ CẤU HÌNH NÀO
  const previousStateRef = useRef<{ episode: string; server: string; embed: boolean } | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("room");
    if (!roomId || !activeEpisode) return;

    if (previousStateRef.current === null) {
      previousStateRef.current = { episode: activeEpisode, server: activeServer, embed: isEmbedMode };
      return; // 🛡️ Bỏ qua lần render đầu tiên khi Host vừa vào phòng để KHÔNG GHI ĐÈ currentTime cũ thành 0
    }

    if (
      previousStateRef.current.episode === activeEpisode &&
      previousStateRef.current.server === activeServer &&
      previousStateRef.current.embed === isEmbedMode
    ) {
      return; // 🛡️ Không có thay đổi nào -> Bỏ qua
    }

    previousStateRef.current = { episode: activeEpisode, server: activeServer, embed: isEmbedMode };

    if (isHostRef.current) {
      const userString = localStorage.getItem("myflix_user");
      const user = userString ? JSON.parse(userString) : null;

      socket.emit("host_update_room_state", {
        roomId,
        hostUserId: user?.id,
        currentTime: latestTimeRef.current > 0 ? Math.floor(latestTimeRef.current) : 0,
        isPlaying: isPlayingRef.current,
        episodeSlug: activeEpisode,
        episodeName: activeEpisodeName,
        serverName: activeServer,
        isEmbedMode
      });
    }
  }, [activeEpisode, activeEpisodeName, activeServer, isEmbedMode]);

  // 📡 1.6. GUEST TỰ ĐỘNG CHUYỂN TẬP / SERVER / PLAYER MODE THEO TÍN HIỆU TỪ HOST REALTIME
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("room");
    if (!roomId) return;

    const handleHostChangedEpisode = ({ episodeSlug, episodeName, serverName, isEmbedMode: hostEmbed }: any) => {
      // Chỉ thực thi đối với Khách (Guest)
      if (!isHostRef.current) {
        if (typeof hostEmbed === "boolean") {
          setIsEmbedMode(hostEmbed);
        }

        if (serverName && episodeData.length > 0) {
          const matchedServer = episodeData.find((s: any) => s.server_name === serverName);
          if (matchedServer) {
            setActiveServer(matchedServer.server_name);
            setEpisodes(matchedServer.server_data);
            const targetEp = matchedServer.server_data.find((ep: any) => ep.slug === episodeSlug) || matchedServer.server_data[0];
            if (targetEp) {
              const urlToPlay = hostEmbed ? (targetEp.link_embed || targetEp.link_m3u8) : (targetEp.link_m3u8 || targetEp.link_embed);
              setStreamUrl(urlToPlay);
              setActiveEpisode(targetEp.slug);
              setActiveEpisodeName(formatEpName(targetEp.name));
              return;
            }
          }
        }
        
        // Fallback: Tìm tập trong server hiện tại của Guest
        if (episodes.length > 0) {
          const targetEp = episodes.find((ep: any) => ep.slug === episodeSlug);
          if (targetEp) {
            const urlToPlay = hostEmbed ? (targetEp.link_embed || targetEp.link_m3u8) : (targetEp.link_m3u8 || targetEp.link_embed);
            setStreamUrl(urlToPlay);
            setActiveEpisode(targetEp.slug);
            setActiveEpisodeName(formatEpName(targetEp.name));
          }
        }
      }
    };

    socket.on("host_changed_episode", handleHostChangedEpisode);
    return () => {
      socket.off("host_changed_episode", handleHostChangedEpisode);
    };
  }, [episodeData, episodes]);

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
    hasInitRef.current = null;
  }, [movie?.slug]);

  useEffect(() => {
    const fetchFullDetail = async () => {
      if (!movie?.slug) return;
      setLoading(true);

      const targetMovieId = String(movie.id || (movie as any)._id || movie.slug);

      try {
        const data = await movieService.getMovieDetail(movie.slug);
        if (data && data.episodes) {
          if (data.movie) setFullMovieDetail(data.movie);

          setEpisodeData(data.episodes);
          const targetServerName = (movie as any)?.serverName || (movie as any)?.server_name || "";
          let selectedServer = data.episodes[0];
          if (targetServerName) {
            const foundServer = data.episodes.find((s: any) => s.server_name === targetServerName);
            if (foundServer) selectedServer = foundServer;
          }
          setActiveServer(selectedServer.server_name);
          const serverData = selectedServer.server_data || [];
          setEpisodes(serverData);

          if (serverData.length > 0) {
            let startEpisode = serverData[0]; // Tập đầu tiên mặc định

            // 🎯 1. LỤC SOÁT LỊCH SỬ XEM DỞ TỪ LOCAL & SESSION STORAGE (CHỈ DÙNG KHI XEM CÁ NHÂN)
            const urlParams = new URLSearchParams(window.location.search);
            const isWatchPartyActive = urlParams.has("room");

            let foundHistorySlug: string | null = null;
            if (!isWatchPartyActive) {
              try {
                // Check Guest
                const localHist = localStorage.getItem("myflix_history");
                if (localHist) {
                  const histArr = JSON.parse(localHist);
                  const found = histArr.find((h: any) => String(h.movie?.id || h.movie?._id || h.watchId).startsWith(targetMovieId));
                  if (found) foundHistorySlug = found.episodeSlug || found.episodeslug;
                }
                // Check User Logged In
                if (!foundHistorySlug) {
                  const dbHist = sessionStorage.getItem("myflix_db_history");
                  if (dbHist) {
                    const histArr = JSON.parse(dbHist);
                    const found = histArr.find((h: any) => String(h.watchId).startsWith(targetMovieId));
                    if (found) foundHistorySlug = found.episodeSlug || found.episodeslug;
                  }
                }
              } catch (e) {}
            }

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

            const targetEmbedMode = Boolean((movie as any)?.isEmbedMode);
            setIsEmbedMode(targetEmbedMode);

            const targetUrl = targetEmbedMode 
              ? (startEpisode.link_embed || startEpisode.link_m3u8) 
              : (startEpisode.link_m3u8 || startEpisode.link_embed);

            if (targetUrl?.trim()) {
              setStreamUrl(targetUrl.trim());
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
                  if (hasInitRef.current !== targetMovieId) {
                    hasInitRef.current = targetMovieId;
                    
                    const rawItem = data.item || {};
                    const cleanMovieId = targetMovieId;
                    const moviePayload = {
                      id: cleanMovieId,
                      _id: cleanMovieId,
                      slug: rawItem.slug || movie.slug || cleanMovieId,
                      title: rawItem.name || rawItem.title || movie.title || "Phim MyFlix",
                      name: rawItem.name || rawItem.title || movie.title || "Phim MyFlix",
                      description: rawItem.content || rawItem.description || movie.description || "",
                      poster: rawItem.poster_url || rawItem.thumb_url || movie.poster || "",
                      poster_url: rawItem.poster_url || rawItem.thumb_url || movie.poster || "",
                      thumb_url: rawItem.thumb_url || rawItem.poster_url || movie.poster || "",
                      banner: rawItem.poster_url || rawItem.thumb_url || movie.poster || "",
                      year: rawItem.year || movie.year || 2026,
                      duration: rawItem.time || movie.duration || "",
                      country: Array.isArray(rawItem.country) ? (rawItem.country[0]?.name || "") : (rawItem.country || movie.country || ""),
                      genre: Array.isArray(rawItem.category) ? (rawItem.category[0]?.name || "") : (rawItem.genre || movie.genre || ""),
                      episode_current: movie.episode_current || rawItem.episode_current || "Full"
                    };

                    const urlParams = new URLSearchParams(window.location.search);
                    const isWatchPartyActive = urlParams.has("room");

                    if (isWatchPartyActive) {
                      // Bỏ qua lưu DB khi đang ở chế độ Xem Chung (Watch Party)
                    } else {
                      const payload = {
                        userId: user.id,
                        movieId: cleanMovieId,
                        episodeSlug: startEpisode.slug,
                        episodeName: formatEpName(startEpisode.name),
                        currentTime: 0,
                        movie: moviePayload
                      };
                      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/init`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                      }).then(r => r.json()).then(() => {
                        window.dispatchEvent(new Event("myflix_history_updated"));
                      }).catch(err => console.error("Lỗi gọi INIT API:", err));
                    }
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
          const userString = localStorage.getItem("myflix_user");
          const user = userString ? JSON.parse(userString) : null;
          socket.emit("host_update_room_state", {
            roomId,
            hostUserId: user?.id,
            currentTime: Math.floor(currentTime),
            isPlaying: true,
            episodeSlug: activeEpisodeRef.current,
            episodeName: activeEpisodeNameRef.current,
            serverName: activeServer,
            isEmbedMode
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
      const nextUrl = getBestStreamUrl(nextEp);

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
    isEmbedMode, setIsEmbedMode,
    isHost: isHostRef.current,
    toggleMyList,
    handleProgress,
    handleNextEpisode,
    latestTimeRef
  };
}