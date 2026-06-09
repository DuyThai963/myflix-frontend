"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type HookProps = {
  src: string;
  movieId: string | number;
  movieTitle: string;
  isSeries: boolean;
  onNext?: () => void;
  onProgress?: (currentTime: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  initialTime: number;
  movieData: any;
  isWatchParty: boolean;
};

export function useVideoPlayerLogic({
  src, movieId, movieTitle, isSeries, onNext, onProgress, onFullscreenChange, initialTime, movieData, isWatchParty
}: HookProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showSkipIntroButton, setShowSkipIntroButton] = useState(false); 
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leftRippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rightRippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showLeftRipple, setShowLeftRipple] = useState(false);
  const [showRightRipple, setShowRightRipple] = useState(false);
  
  const hasSyncedInitialTimeRef = useRef<string>("");
  const currentTimeRef = useRef(0);
  const isWatchPartyRef = useRef(isWatchParty);
  const prevMovieIdRef = useRef<string | null>(null);

  useEffect(() => { isWatchPartyRef.current = isWatchParty; }, [isWatchParty]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  const handleUserInteraction = () => {
    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isPlaying && !isDragging) {
      timeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const saveWatchingProgress = async (timeToSave: number, isEnding = false) => {
    if (timeToSave <= 0 && !isEnding) return;
    if (isWatchPartyRef.current === true || isWatchParty === true) return;

    const token = localStorage.getItem("myflix_token");
    const userString = localStorage.getItem("myflix_user");
    const currentEpisodeSlug = isSeries ? movieId.toString().split('-').pop() || '1' : "full";
    const currentEpisodeName = isSeries ? `Tập ${currentEpisodeSlug}` : "Full";
    const cleanMovieId = String(movieId).split('-')[0];

    const historyItem = {
      watchId: String(movieId), 
      episodeSlug: currentEpisodeSlug,
      episodeName: currentEpisodeName,
      currentTime: isEnding ? 0 : Math.floor(timeToSave),
      updatedAt: new Date().toISOString(),
      movie: {
        id: movieData?.id || cleanMovieId,
        slug: movieData?.slug || cleanMovieId,
        title: movieData?.title || movieTitle,
        description: movieData?.description || "",
        poster: movieData?.poster || "",
        banner: movieData?.banner || movieData?.poster || "",
        year: movieData?.year || 2026,
        duration: movieData?.duration || "",
        country: movieData?.country || "",
        genre: movieData?.genre || "",
        episode_current: currentEpisodeName
      }
    };

    // 🌟 NHÁNH 1: ĐÃ ĐĂNG NHẬP ➔ CHỈ ĐẨY LÊN DATABASE, CẤM GHI VÀO LOCAL STORAGE
    if (token && userString) {
      const user = JSON.parse(userString);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, localHistory: [historyItem] })
        });
        if (res.ok) {
          window.dispatchEvent(new Event("myflix_history_updated"));
        }
      } catch (err) { 
        console.error("❌ Lỗi đẩy DB:", err); 
      }
    } 
    // 🌟 NHÁNH 2: CHƯA ĐĂNG NHẬP ➔ MỚI ĐƯỢC PHÉP GHI VÀO LOCAL STORAGE
    else {
      try {
        const localHist = localStorage.getItem("myflix_history");
        let historyArray = localHist ? JSON.parse(localHist) : [];
        
        // LỌC SẠCH BẤT KỲ TẬP CŨ NÀO CỦA PHIM NÀY TRƯỚC KHI CHÈN
        historyArray = historyArray.filter((item: any) => item.movie.id !== historyItem.movie.id);
        
        if (!isEnding) {
          historyArray.unshift(historyItem);
        }
        
        localStorage.setItem("myflix_history", JSON.stringify(historyArray.slice(0, 15)));
        window.dispatchEvent(new Event("myflix_history_updated"));
      } catch (e) {}
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      saveWatchingProgress(videoRef.current.currentTime);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      handleUserInteraction();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    handleUserInteraction();
  };

  const skipTime = (e: React.MouseEvent, amount: number) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + amount));
    handleUserInteraction();
  };

  const handleSkipIntro = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = 90;
    setCurrentTime(90);
    setShowSkipIntroButton(false);
    handleUserInteraction();
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = playerContainerRef.current;
    if (!container) return;

    const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
    const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIPhone || isIPad) {
      if (!isFullscreen) {
        const maxEdge = Math.max(window.innerWidth, window.innerHeight);
        const minEdge = Math.min(window.innerWidth, window.innerHeight);
        container.style.position = "fixed"; container.style.zIndex = "999999"; container.style.backgroundColor = "#000000";
        if (isIPad) {
          container.style.top = "0"; container.style.left = "0"; container.style.width = "100vw"; container.style.height = "100vh"; container.style.transform = "none";
        } else {
          if (window.innerHeight > window.innerWidth) {
            container.style.top = "53%"; container.style.left = "50%"; container.style.width = `${maxEdge}px`; container.style.height = `${minEdge}px`; container.style.transform = "translate(-50%, -50%) rotate(90deg)";
          } else {
            container.style.top = "0"; container.style.left = "0"; container.style.width = "100vw"; container.style.height = "100vh"; container.style.transform = "none";
          }
        }
        document.body.style.overflow = "hidden"; container.style.touchAction = "none"; setIsFullscreen(true);
        if (onFullscreenChange) onFullscreenChange(true);
      } else {
        container.style.position = ""; container.style.top = ""; container.style.left = ""; container.style.width = ""; container.style.height = ""; container.style.transform = ""; container.style.zIndex = ""; container.style.backgroundColor = ""; container.style.touchAction = ""; document.body.style.overflow = ""; setIsFullscreen(false);
        if (onFullscreenChange) onFullscreenChange(false);
      }
    } else {
      if (!document.fullscreenElement) container.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    }
    handleUserInteraction();
  };

  const handleTimelineUpdate = (clientX: number, clientY: number) => {
    const timeline = timelineRef.current;
    const video = videoRef.current;
    if (!timeline || !video || duration === 0) return;

    const rect = timeline.getBoundingClientRect();
    const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
    const isIPhonePortraitFull = isIPhone && isFullscreen && (window.innerHeight > window.innerWidth);
    
    let percentage = 0;
    if (isIPhonePortraitFull) percentage = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    else percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    video.currentTime = percentage * duration;
    setCurrentTime(video.currentTime);
    handleUserInteraction();
  };

  useEffect(() => {
    const handleFullscreenChangeGlobal = () => {
      const isFull = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isFull);
      if (onFullscreenChange) onFullscreenChange(isFull);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChangeGlobal);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChangeGlobal);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChangeGlobal);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChangeGlobal);
    };
  }, [onFullscreenChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (!videoRef.current) return;
      if (e.key === "ArrowRight" || e.keyCode === 39) {
        e.preventDefault(); handleUserInteraction();
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      } else if (e.key === "ArrowLeft" || e.keyCode === 37) {
        e.preventDefault(); handleUserInteraction();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      } else if (e.key === " " || e.keyCode === 32) {
        e.preventDefault(); handleUserInteraction(); togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  useEffect(() => {
    const handleSuddenClose = () => {
      const targetTime = currentTimeRef.current;
      if (targetTime <= 0) return;
      if (isWatchPartyRef.current === true || isWatchParty === true) return;

      const token = localStorage.getItem("myflix_token");
      const userString = localStorage.getItem("myflix_user");
      const currentEpisodeSlug = isSeries ? movieId.toString().split('-').pop() || '1' : "full";
      const currentEpisodeName = isSeries ? `Tập ${currentEpisodeSlug}` : "Full";
      const cleanMovieId = String(movieId).split('-')[0];

      const historyItem = {
        watchId: String(movieId),
        episodeSlug: currentEpisodeSlug,
        episodeName: currentEpisodeName,
        currentTime: Math.floor(targetTime),
        updatedAt: new Date().toISOString(),
        movie: {
          id: movieData?.id || cleanMovieId,
          slug: movieData?.slug || cleanMovieId,
          title: movieData?.title || movieTitle,
          description: movieData?.description || "",
          poster: movieData?.poster || "",
          banner: movieData?.banner || movieData?.poster || "",
          year: movieData?.year || 2026,
          duration: movieData?.duration || "",
          country: movieData?.country || "",
          genre: movieData?.genre || "",
          episode_current: currentEpisodeName
        }
      };

      if (token && userString) {
        const user = JSON.parse(userString);
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/history/sync`;
        const payload = JSON.stringify({ userId: user.id, localHistory: [historyItem] });

        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
        } else {
          fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
        }
        
        // 🔥 KHÓA CHẶT: Bắn xong lệnh lên DB thì return luôn, không cho code chạy xuống dòng xử lý mảng local dưới!
        return; 
      } 
      
      // CHỈ KHI CHƯA ĐĂNG NHẬP (GUEST MODE) THÌ MỚI LỌC VÀ LƯU VÀO LOCAL STORAGE
      try {
        const localHist = localStorage.getItem("myflix_history");
        let historyArray = localHist ? JSON.parse(localHist) : [];
        historyArray = historyArray.filter((item: any) => item.movie.id !== historyItem.movie.id);
        historyArray.unshift(historyItem);
        localStorage.setItem("myflix_history", JSON.stringify(historyArray.slice(0, 15)));
      } catch (e) {}
    };

    window.addEventListener("beforeunload", handleSuddenClose);
    window.addEventListener("pagehide", handleSuddenClose);
    return () => {
      window.removeEventListener("beforeunload", handleSuddenClose);
      window.removeEventListener("pagehide", handleSuddenClose);
      handleSuddenClose();
    };
  }, [movieId, movieTitle, isSeries, movieData, isWatchParty]);

  // 🎯 TÌM ĐÚNG EFFECT KHỞI CHẠY HLS TRONG FILE hooks/useVideoPlayerLogic.ts
  useEffect(() => {
    if (!videoRef.current || !src) return;

    setLoading(true); setShowNextButton(false); setShowSkipIntroButton(false);
    setIsPlaying(true); 
    
    setCurrentTime(0); 
    setDuration(0);
    
    const video = videoRef.current;
    let savedTime = 0; // Mặc định tập mới tinh chạy từ 0s
    
    const token = localStorage.getItem("myflix_token");
    
    if (token) {
      // 🎯 LUỒNG ĐÃ ĐĂNG NHẬP: ĐỐI CHIẾU THẲNG MÃ TẬP ĐANG PHÁT VỚI MÃ TẬP LƯU TRONG DB
      if (movieData) {
        const dbWatchId = movieData.watchId_db || (movieData as any).watchid || "";

        if (String(dbWatchId) === String(movieId) && typeof movieData.currentTime === "number") {
          savedTime = movieData.currentTime;
        } else {
          savedTime = 0;
        }
      }
    } else {
      // LUỒNG GUEST CHƯA LOGIN: Đối chiếu trực tiếp mã tập với két Local Storage
      try {
        const historyData = localStorage.getItem("myflix_history");
        if (historyData) {
          const found = JSON.parse(historyData).find((h: any) => String(h.watchId) === String(movieId));
          if (found) {
            savedTime = found.currentTime;
          } else {
            savedTime = 0;
          }
        }
      } catch(e) {}
    }

    video.currentTime = savedTime; 
    currentTimeRef.current = savedTime; 

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration);
        video.currentTime = savedTime; 
        video.play().catch(() => {});
        setLoading(false);
      }, { once: true });
      return () => { video.removeAttribute('src'); }
    } 
    else if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setDuration(video.duration);
        video.currentTime = savedTime; 
        video.play().catch(() => {});
      });
      
      // 🛡️ LÁ CHẮN BẢO HIỂM CUỐI: Khi mảnh buffer phân đoạn phim đầu tiên nạp vào thành công, ép dí kim video về 0s một lần nữa để tránh dính cache cũ
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (savedTime === 0 && video.currentTime > 5) {
          video.currentTime = 0;
        }
      }, { once: true });

      return () => hls.destroy();
    }
  }, [src, movieId, movieData]);

  // CORE HLS ENGINE KHỞI CHẠY (PHÂN NHÁNH ĐỌC SẠCH NGUỒN DATA ĐẦU VÀO)
  useEffect(() => {
    if (!videoRef.current || !src) return;
    setLoading(true); setShowNextButton(false); setShowSkipIntroButton(false);
    setIsPlaying(true); 
    
    // 🌟 BƯỚC 1: ÉP LÀM SẠCH STATE THỜI GIAN TRÊN UI VỀ 0 NGAY KHI ĐỔI SRC
    setCurrentTime(0); 
    setDuration(0);
    
    const video = videoRef.current;
    
    // 🎯 QUAN TRỌNG: Mặc định tập mới phải chạy từ 0 vĩnh viễn, trừ khi tìm thấy lịch sử lưu dở của ĐÚNG TẬP ĐÓ!
    let savedTime = 0; 
    
    const token = localStorage.getItem("myflix_token");
    // Khi ở chế độ GUEST (Không có token)
    if (!token) {
      try {
        const historyData = localStorage.getItem("myflix_history");
        if (historyData) {
          // 🌟 SỬA ĐOẠN NÀY: Phải đối chiếu chuẩn xác trúng ĐÚNG MÃ TẬP PHIM (watchId full có đuôi tập) 
          // chứ không được đối chiếu theo ID phim trơn nữa, để tránh việc tập này bốc nhầm thời gian tập kia!
          const found = JSON.parse(historyData).find((h: any) => String(h.watchId) === String(movieId));
          if (found) {
            savedTime = found.currentTime;
          }
        }
      } catch(e) {}
    }

    // 🌟 BƯỚC 2: ÉP KIM THỜI GIAN THỰC CỦA THẺ VIDEO VỀ ĐÚNG KHUÔN KHỔ
    video.currentTime = savedTime; 
    currentTimeRef.current = savedTime; // Cập nhật luôn biến Ref hốt xác khẩn cấp

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration);
        video.currentTime = savedTime; // Bảo hiểm nện lại phát nữa khi metadata nạp xong
        video.play().catch(() => {});
        setLoading(false);
      }, { once: true });
      return () => { video.removeAttribute('src'); }
    } 
    else if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setDuration(video.duration);
        video.currentTime = savedTime; // Bảo hiểm nện lại cho luồng PC/Android
        video.play().catch(() => {});
      });
      return () => hls.destroy();
    }
  }, [src, movieId]);

  // Luồng Polling Sync phòng xem chung
  useEffect(() => {
    if (initialTime <= 0 || !src) return;
    const sessionKey = `${movieId}-${initialTime}`;
    if (hasSyncedInitialTimeRef.current === sessionKey) return;

    const video = videoRef.current;
    let attempts = 0;
    const seekPolling = setInterval(() => {
      attempts++;
      if (video && video.readyState >= 1) {
        if (Math.abs(video.currentTime - initialTime) > 3 && attempts <= 20) {
          video.pause(); setIsPlaying(false);
          video.currentTime = initialTime; setCurrentTime(initialTime);
        } else {
          hasSyncedInitialTimeRef.current = sessionKey; clearInterval(seekPolling);
          video.play().then(() => setIsPlaying(true)).catch(() => {
            video.muted = true; setIsMuted(true);
            video.play().then(() => setIsPlaying(true));
          });
        }
      } else if (attempts > 20) clearInterval(seekPolling);
    }, 400);
    return () => clearInterval(seekPolling);
  }, [initialTime, src, movieId]);

  useEffect(() => {
    if (isPlaying) handleUserInteraction();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (leftRippleTimeoutRef.current) clearTimeout(leftRippleTimeoutRef.current);
      if (rightRippleTimeoutRef.current) clearTimeout(rightRippleTimeoutRef.current);
    };
  }, [isPlaying]);

  return {
    videoRef, playerContainerRef, timelineRef,
    loading, setLoading, isPlaying, setIsPlaying, isMuted, setIsMuted, isFullscreen,
    showControls, setShowControls, showNextButton, setShowNextButton, showSkipIntroButton, setShowSkipIntroButton,
    currentTime, setCurrentTime, duration, setDuration, isDragging, setIsDragging,
    showLeftRipple, setShowLeftRipple, showRightRipple, setShowRightRipple,
    clickTimeoutRef, leftRippleTimeoutRef, rightRippleTimeoutRef,
    handleUserInteraction, togglePlay, toggleMute, skipTime, handleSkipIntro, toggleFullscreen, handleTimelineUpdate, saveWatchingProgress
  };
}