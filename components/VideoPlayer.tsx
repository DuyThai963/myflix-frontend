"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  movieId: string | number;
  onProgress?: (currentTime: number) => void; // Thêm prop này
};

export default function VideoPlayer({ src, movieId, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!videoRef.current || !src) return;

    setLoading(true);
    const video = videoRef.current;
    
    // Đọc thời gian đã lưu (chỉnh sửa một chút để đọc từ object)
    let savedTime = 0;
    try {
        const historyData = localStorage.getItem("myflix_history");
        if (historyData) {
            const history = JSON.parse(historyData);
            const found = history.find((h: any) => h.watchId === String(movieId));
            if (found) savedTime = found.currentTime;
        }
    } catch(e) {}

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (savedTime > 0) video.currentTime = savedTime;
        video.play().catch(() => {});
      });

      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      if (savedTime > 0) video.currentTime = savedTime;
    }
  }, [src, movieId]);

  return (
    <div className="relative w-full h-full bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-12 h-12 border-4 border-zinc-600 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        className="w-full h-full"
        onLoadedData={() => setLoading(false)}
        onError={() => setLoading(false)}
        onTimeUpdate={(e) => {
          const currentTime = (e.target as HTMLVideoElement).currentTime;
          if (onProgress) onProgress(currentTime); // Gọi ra ngoài
        }}
      />
    </div>
  );
}