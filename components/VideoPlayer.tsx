"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  movieId: string | number;
  isSeries?: boolean;
  onNext?: () => void;
  onProgress?: (currentTime: number) => void;
};

export default function VideoPlayer({ src, movieId, isSeries = false, onNext, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tự động ẩn controls sau 3 giây không di chuột
  const handleUserInteraction = () => {
    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (isPlaying && !isDragging && !showMoreMenu) setShowControls(false);
    }, 3000);
  };

  // Toggle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Toggle Mute loa
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  // Tua phim 10s
  const skipTime = (e: React.MouseEvent, amount: number) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + amount));
  };

  // Toggle Fullscreen
  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = playerContainerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;
  
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      // TRƯỜNG HỢP 1: Chữa cháy riêng cho iPhone/Safari (iOS không cho div full màn hình)
      if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      } 
      // TRƯỜNG HỢP 2: Android và PC (Phóng to cả hộp bọc để giữ nút Tập kế tiếp)
      else if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
    } else {
      // Thoát Fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
  
      if (!videoRef.current) return;
  
      // Chấp nhận cả tên phím chuẩn PC và mã phím điều hướng đặc thù của Android TV / Remote máy chiếu
      const isRight = e.key === "ArrowRight" || e.keyCode === 39;
      const isLeft = e.key === "ArrowLeft" || e.keyCode === 37;
      const isSpace = e.key === " " || e.key === "Spacebar" || e.keyCode === 32;
  
      if (isRight) {
        e.preventDefault();
        handleUserInteraction();
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      } else if (isLeft) {
        e.preventDefault();
        handleUserInteraction();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      } else if (isSpace) {
        e.preventDefault();
        handleUserInteraction();
        togglePlay();
      }
    };
  
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const paddedMinutes = String(minutes).padStart(2, "0");
    const paddedSeconds = String(seconds).padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  const handleTimelineUpdate = (clientX: number) => {
    const timeline = timelineRef.current;
    const video = videoRef.current;
    if (!timeline || !video || duration === 0) return;

    const rect = timeline.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    
    const newTime = percentage * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Khởi tạo nguồn phát HLS / MP4
  useEffect(() => {
    if (!videoRef.current || !src) return;
    setLoading(true);
    setShowNextButton(false);
    setIsPlaying(true);
    setShowMoreMenu(false);
    setCurrentTime(0);
    setDuration(0);
    
    const video = videoRef.current;
    let savedTime = 0;
    
    try {
      const historyData = localStorage.getItem("myflix_history");
      if (historyData) {
        const history = JSON.parse(historyData);
        const found = history.find((h: any) => h.watchId === String(movieId));
        if (found) savedTime = found.currentTime;
      }
    } catch(e) {}

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration);
        if (savedTime > 0) video.currentTime = savedTime;
        video.play().catch(() => {});
        setLoading(false);
      }, { once: true });
      return () => { video.src = ""; }
    } 
    else if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setDuration(video.duration);
        if (savedTime > 0) video.currentTime = savedTime;
        video.play().catch(() => {});
      });
      return () => hls.destroy();
    }
  }, [src, movieId]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={playerContainerRef}
      onMouseMove={handleUserInteraction}
      onMouseLeave={() => !isDragging && setShowControls(false)}
      className="relative w-full h-full bg-black overflow-hidden group flex items-center justify-center select-none font-sans cursor-default"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 pointer-events-none">
          <div className="w-14 h-14 border-4 border-zinc-700 border-t-red-600 rounded-full animate-spin" />
        </div>
      )}

      {/* 1. CLICK CHÍNH DIỆN VÀO VIDEO ĐỂ PLAY/PAUSE */}
      <video
        ref={videoRef}
        controls={false} 
        autoPlay
        playsInline={true}
        webkit-playsinline="true"
        onClick={togglePlay} // Ăn lệnh trực tiếp khi click chuột vào màn hình phim
        className="w-full h-full object-contain cursor-pointer relative z-10"
        onLoadedData={() => setLoading(false)}
        onDurationChange={(e) => setDuration((e.target as HTMLVideoElement).duration)}
        onError={() => setLoading(false)}
        
        onTimeUpdate={(e) => {
          const video = e.target as HTMLVideoElement;
          const current = video.currentTime;
          const dur = video.duration;
          
          setCurrentTime(current);
          if (onProgress) onProgress(current);

          if (isSeries && dur > 0) {
            const timeLeft = dur - current;
            let skipTime = 45; 
            if (dur > 3000) skipTime = 75; 
            else if (dur > 1800) skipTime = 60; 

            if (timeLeft <= skipTime && timeLeft > 2) {
              setShowNextButton(true);
            } else {
              setShowNextButton(false);
            }
          }
        }}
        onEnded={() => {
          if (isSeries && onNext) onNext();
        }}
      />

      {/* 2. KHUNG PANEL ĐIỀU KHIỂN - CLICK VÀO PHẦN TRỐNG CỦA PANEL CŨNG PHÁT/DỪNG ĐƯỢC PHIM */}
      <div 
        onClick={togglePlay} // Click vào vùng trống của panel điều khiển (lớp đen mờ) vẫn nhận lệnh Play/Pause
        className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-black/40 z-30 flex flex-col justify-between p-6 transition-opacity duration-300 ${showControls ? "opacity-100 animate-in fade-in duration-200" : "opacity-0 pointer-events-none"} cursor-pointer`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between w-full">
          {isFullscreen ? (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(e); }}
              className="hidden md:flex text-white/80 hover:text-white items-center gap-2 font-medium text-base transition duration-200 cursor-pointer"
            >
              ✕ Thoát xem phim
            </button>
          ) : <div />}
          <div />
        </div>

        {/* Bottom bar */}
        <div 
          onClick={(e) => e.stopPropagation()} // QUAN TRỌNG: Chỉ chặn nổi bọt ở riêng cụm bọc Timeline + Nút để khi bấm nút không bị dừng phim
          className="w-full space-y-4 cursor-default"
        >
          {/* TIMELINE */}
          <div className="flex items-center gap-3 w-full group/timeline">
            <span className="text-zinc-400 text-xs font-medium tabular-nums min-w-[40px]">
              {formatTime(currentTime)}
            </span>
            
            <div 
              ref={timelineRef}
              onClick={(e) => handleTimelineUpdate(e.clientX)}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              className="relative flex-1 h-1.5 bg-zinc-600/60 rounded-full cursor-pointer hover:h-2 transition-all duration-150 flex items-center"
            >
              <div 
                className="h-full bg-red-600 rounded-full relative flex items-center justify-end"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-[-6px] w-3.5 h-3.5 bg-red-600 border border-white rounded-full scale-0 group-hover/timeline:scale-100 transition-transform duration-100 shadow-lg" />
              </div>
            </div>

            <span className="text-zinc-400 text-xs font-medium tabular-nums min-w-[40px] text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* BỘ NÚT CHỨC NĂNG */}
          <div className="flex items-center justify-between w-full relative">
            <div className="flex items-center gap-6">
              {/* Play/Pause SVG */}
              <button onClick={togglePlay} className="text-white hover:text-red-500 transition transform active:scale-90 cursor-pointer">
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Tua lùi 10s */}
              <button onClick={(e) => skipTime(e, -10)} className="text-zinc-300 hover:text-white transition relative flex items-center justify-center w-7 h-7 active:scale-90 cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span className="absolute text-[9px] font-extrabold tracking-tighter select-none pt-0.5">10</span>
              </button>

              {/* Tua nhanh 10s */}
              <button onClick={(e) => skipTime(e, 10)} className="text-zinc-300 hover:text-white transition relative flex items-center justify-center w-7 h-7 active:scale-90 cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                <span className="absolute text-[9px] font-extrabold tracking-tighter select-none pt-0.5">10</span>
              </button>

              {/* NÚT LOA BẬT TẮT ÂM THANH */}
              <button onClick={toggleMute} className="text-zinc-300 hover:text-white transition active:scale-90 pl-1 cursor-pointer">
                {isMuted ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.874c0 1.141.922 2.063 2.063 2.063h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 0 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 0 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.874c0 1.141.922 2.063 2.063 2.063h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06Zm4.44 5.642a.75.75 0 0 1 1.06-.043 7.5 7.5 0 0 1 0 10.683.75.75 0 0 1-1.06-1.061 6 6 0 0 0 0-8.519.75.75 0 0 1 .043-1.06ZM15.3 11.47a.75.75 0 0 1 1.06-.043 4 4 0 0 1 0 5.706.75.75 0 0 1-1.06-1.06 2.5 2.5 0 0 0 0-3.585.75.75 0 0 1 .043-1.061Z" />
                  </svg>
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-5">

              {/* NÚT PHÓNG TO / THU NHỎ HOÀN TOÀN BẰNG SVG */}
              <button 
                onClick={(e) => toggleFullscreen(e)}
                className="text-zinc-300 hover:text-white transition active:scale-90 cursor-pointer p-1"
              >
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l6-6M10 14l-6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NÚT TẬP TIẾP THEO BẤT TỬ */}
      {showNextButton && onNext && (
        <div className="absolute bottom-24 right-8 z-50 animate-in fade-in slide-in-from-right-5 duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Chặn hành vi nổi bọt kích hoạt togglePlay khi bấm nhảy tập
              onNext();
            }}
            className="group flex items-center gap-3 bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-700 px-5 py-2.5 rounded shadow-2xl transition-all active:scale-95 cursor-pointer"
          >
            <div className="text-left">
              <p className="text-white text-xs font-bold">Tập kế tiếp</p>
            </div>
            <div className="bg-white text-black p-1.5 rounded-sm group-hover:bg-red-600 group-hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M6 18L14.5 12L6 6V18ZM16 6V18H18V6H16Z" />
              </svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}