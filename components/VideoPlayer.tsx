"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  movieId: string | number;
  isSeries?: boolean;      // TRUE nếu là phim tập, FALSE/undefined nếu là phim lẻ
  onNext?: () => void;     // Hàm xử lý chuyển tập kế tiếp
  onProgress?: (currentTime: number) => void;
};

export default function VideoPlayer({ src, movieId, isSeries = false, onNext, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false); // State quản lý nút Next
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUserInteraction = () => {
    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    if (!videoRef.current || !src) return;
    setLoading(true);
    setShowNextButton(false); // Reset nút khi đổi tập/đổi phim
    
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
        if (savedTime > 0) video.currentTime = savedTime;
        video.play().catch(() => {});
      });
      return () => hls.destroy();
    }
  }, [src, movieId]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleUserInteraction}
      onClick={handleUserInteraction}
      className="relative w-full h-full bg-black group overflow-hidden"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <div className="w-12 h-12 border-4 border-zinc-600 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        controls={showControls} 
        autoPlay
        className="w-full h-full"
        onTimeUpdate={(e) => {
          const video = e.target as HTMLVideoElement;
          const currentTime = video.currentTime;
          const duration = video.duration;

          if (onProgress) onProgress(currentTime);

          if (isSeries && duration > 0) {
            const timeLeft = duration - currentTime;

            let skipTime = 60;
            if (duration > 3000) {
              skipTime = 120;
            } else if (duration > 1800) {
              skipTime = 90;
            }

            if (timeLeft <= skipTime && timeLeft > 2) {
              setShowNextButton(true);
            } else {
              setShowNextButton(false);
            }
          }
        }}

        onEnded={() => {
          if (isSeries && onNext) {
            onNext(); 
          }
        }}
      />

      {/* UI NÚT "TẬP TIẾP THEO" CHUẨN NETFLIX (Góc dưới bên phải) */}
      {showNextButton && onNext && (
        <div className="absolute bottom-20 right-8 z-50 animate-in fade-in slide-in-from-right-5 duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="group flex items-center gap-3 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 px-5 py-3 rounded shadow-2xl transition-all active:scale-95"
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

      {!showControls && !showNextButton && (
        <div className="absolute inset-0 z-10" />
      )}
    </div>
  );
}