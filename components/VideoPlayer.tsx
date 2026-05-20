"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  movieId: string | number;
  isSeries?: boolean;
  onNext?: () => void;
  onProgress?: (currentTime: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
};

export default function VideoPlayer({ src, movieId, isSeries = false, onNext, onProgress, onFullscreenChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [videoFit, setVideoFit] = useState<"contain" | "cover">("contain");
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

  const handleUserInteraction = () => {
    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (isPlaying && !isDragging && !showMoreMenu) setShowControls(false);
    }, 3000);
  };

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

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const skipTime = (e: React.MouseEvent, amount: number) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + amount));
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = playerContainerRef.current;
    if (!container) return;

    // BẪY THIẾT BỊ TỐI CAO: Nhận diện chuẩn xác iPhone, iPad dốc toàn lực (kể cả iPad giả danh Mac)
    const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
    const isIPad = /iPad/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // Cú lừa nhận diện chip Apple Silicon của iPad

    // NẾU LÀ THIẾT BỊ DI ĐỘNG CỦA APPLE (IPHONE VÀ IPAD)
    if (isIPhone || isIPad) {
      if (!isFullscreen) {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        
        const maxEdge = Math.max(currentWidth, currentHeight);
        const minEdge = Math.min(currentWidth, currentHeight);

        // Ép chặt class bằng Tailwind v4 để đè Sandbox PWA
        container.classList.add("!fixed", "!inset-0", "!z-[999999]", "!bg-black");
        container.style.position = "fixed";
        container.style.zIndex = "999999";
        container.style.backgroundColor = "#000000";

        // Kiểm tra hướng cầm máy thực tế
        const isCurrentlyPortrait = currentHeight > currentWidth;

        // RIÊNG ĐỐI VỚI IPAD: Không cần xoay 90 độ vì iPad màn hình to, lật ngang dọc đều xem phẳng được
        if (isIPad) {
          container.style.top = "0";
          container.style.left = "0";
          container.style.width = "100vw";
          container.style.height = "100vh";
          container.style.transform = "none";
        } else {
          // ĐỐI VỚI IPHONE: Ép xoay ma trận 90 độ nếu máy đang ở màn hình dọc
          if (isCurrentlyPortrait) {
            container.style.top = "50%";
            container.style.left = "50%";
            container.style.width = `${maxEdge}px`;  
            container.style.height = `${minEdge}px`; 
            container.style.transform = "translate(-50%, -50%) rotate(90deg)";
          } else {
            container.style.top = "0";
            container.style.left = "0";
            container.style.width = "100vw";
            container.style.height = "100vh";
            container.style.transform = "none";
          }
        }
        
        try { window.scrollTo(0, 1); } catch (err) {}
        document.body.style.overflow = "hidden";
        container.style.touchAction = "none";
        
        setIsFullscreen(true);
        if (onFullscreenChange) onFullscreenChange(true);
      } else {
        // THOÁT PHÓNG TO: Dọn rác
        container.classList.remove("!fixed", "!inset-0", "!z-[999999]", "!bg-black");
        container.style.position = "";
        container.style.top = "";
        container.style.left = "";
        container.style.width = "";
        container.style.height = "";
        container.style.transform = "";
        container.style.zIndex = "";
        container.style.backgroundColor = "";
        container.style.touchAction = "";
        document.body.style.overflow = "";
        
        setIsFullscreen(false);
        if (onFullscreenChange) onFullscreenChange(false);
      }
    } else {
      // LUỒNG PC / ANDROID TV THỰC TẾ
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          container.requestFullscreen().catch(() => {});
        } else if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }
  };

  const handleTimelineUpdate = (clientX: number, clientY: number) => {
    const timeline = timelineRef.current;
    const video = videoRef.current;
    if (!timeline || !video || duration === 0) return;

    const rect = timeline.getBoundingClientRect();
    const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
    const isIPhonePortraitFull = isIPhone && isFullscreen && (window.innerHeight > window.innerWidth);
    
    let percentage = 0;

    if (isIPhonePortraitFull) {
      const offsetY = clientY - rect.top;
      percentage = Math.max(0, Math.min(1, offsetY / rect.height));
    } else {
      const offsetX = clientX - rect.left;
      percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    }
    
    const newTime = percentage * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isFull);
      if (onFullscreenChange) onFullscreenChange(isFull);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [onFullscreenChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (!videoRef.current) return;
  
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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const paddedMinutes = String(minutes).padStart(2, "0");
    const paddedSeconds = String(seconds).padStart(2, "0");
    if (hours > 0) return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    return `${paddedMinutes}:${paddedSeconds}`;
  };

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
      onTouchEnd={() => {
        setIsDragging(false);
        handleUserInteraction();
      }}
      className="relative w-full h-full bg-black overflow-hidden group flex items-center justify-center select-none font-sans cursor-default"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 pointer-events-none">
          <div className="w-14 h-14 border-4 border-zinc-700 border-t-red-600 rounded-full animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        controls={false} 
        autoPlay
        playsInline={true}
        webkit-playsinline="true"
        onClick={togglePlay}
        style={{
          aspectRatio: videoRef.current ? `${videoRef.current.videoWidth} / ${videoRef.current.videoHeight}` : "auto",
          objectFit: "contain"
        }}
        className="w-full h-full relative z-10"
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
            let skipTime = 150;
            if (dur > 3000) skipTime = 210;
            else if (dur > 1800) skipTime = 180;

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

      {/* TÁCH BIỆT HOÀN TOÀN LỚP BẪY CLICK PLAY/PAUSE NỀN */}
      <div 
        onClick={togglePlay}
        className={`absolute inset-0 bg-black/10 z-20 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"} cursor-pointer`}
      />

      {/* BỘ CONTROLS PANEL: TUYỆT ĐỐI KHÔNG DÍNH CLICK PLAY/PAUSE NỀN, ÉP TẦNG ĐỒ HỌA 3D RIÊNG BIỆT CHO IPAD */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{
          transformStyle: "preserve-3d",
          transform: "translateZ(999px)"
        }}
        className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-black/40 z-40 flex flex-col justify-between p-6 transition-opacity duration-300 ${showControls ? "opacity-100 animate-in fade-in duration-200" : "opacity-0 pointer-events-none"} cursor-default`}
      >
        <div className="flex items-center justify-between w-full relative z-50 pointer-events-none">
          {isFullscreen ? (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                toggleFullscreen(e); 
              }}
              className="hidden pointer-fine:flex text-white/80 hover:text-white items-center gap-2 font-medium text-base transition duration-200 cursor-pointer pointer-events-auto"
            >
              ✕ Thoát xem phim
            </button>
          ) : <div />}
          <div />
        </div>

        <div className="w-full space-y-4 relative z-50 pointer-events-auto">
          <div className="flex items-center gap-3 w-full group/timeline">
            <span className="text-zinc-400 text-xs font-medium tabular-nums min-w-[40px]">
              {formatTime(currentTime)}
            </span>
            
            <div 
              ref={timelineRef}
              onClick={(e) => handleTimelineUpdate(e.clientX, e.clientY)}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              onTouchMove={(e) => {
                if (e.touches.length > 0) {
                  handleTimelineUpdate(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              className="relative flex-1 h-1.5 bg-zinc-600/60 rounded-full cursor-pointer hover:h-2 transition-all duration-150 flex items-center"
            >
              <div 
                className="h-full bg-red-600 rounded-full relative flex items-center justify-end"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-[-6px] w-4 h-4 bg-red-600 border border-white rounded-full scale-100 shadow-lg" />
              </div>
            </div>

            <span className="text-zinc-400 text-xs font-medium tabular-nums min-w-[40px] text-right">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center justify-between w-full relative">
            <div className="flex items-center gap-6">
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

              <button onClick={(e) => skipTime(e, -10)} className="text-zinc-300 hover:text-white transition relative flex items-center justify-center w-7 h-7 active:scale-90 cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span className="absolute text-[9px] font-extrabold tracking-tighter select-none pt-0.5">10</span>
              </button>

              <button onClick={(e) => skipTime(e, 10)} className="text-zinc-300 hover:text-white transition relative flex items-center justify-center w-7 h-7 active:scale-90 cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                <span className="absolute text-[9px] font-extrabold tracking-tighter select-none pt-0.5">10</span>
              </button>

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
              <button onClick={(e) => toggleFullscreen(e)} className="text-zinc-300 hover:text-white transition active:scale-90 cursor-pointer p-1">
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

      {showNextButton && onNext && (
        <div className="absolute bottom-24 right-8 z-50 animate-in fade-in slide-in-from-right-5 duration-300 pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
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