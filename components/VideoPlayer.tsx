"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  movieId: string | number;
  onProgress?: (currentTime: number) => void;
};

export default function VideoPlayer({ src, movieId, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref cho container
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hàm xử lý hiện thanh điều khiển khi rê chuột (MouseMove)
  const handleUserInteraction = () => {
    setShowControls(true);
    
    // Xóa timeout cũ nếu người dùng vẫn đang di chuyển chuột
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Nếu sau 3 giây không động đậy chuột/remote thì mới ẩn
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    if (!videoRef.current || !src) return;

    setLoading(true);
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

    // Logic HLS giữ nguyên...
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
        playsInline={false} 
        muted={true}
        className="w-full h-full cursor-none"
        style={{ cursor: showControls ? 'default' : 'none' }}
        onLoadedData={() => setLoading(false)}
        onError={() => setLoading(false)}
        onTimeUpdate={(e) => {
          const currentTime = (e.target as HTMLVideoElement).currentTime;
          if (onProgress) onProgress(currentTime);
        }}
      />

      {/* Lớp phủ hỗ trợ: Giúp nhận diện hover tốt hơn trên Android/Cốc Cốc */}
      {!showControls && (
        <div className="absolute inset-0 z-10" />
      )}
    </div>
  );
}