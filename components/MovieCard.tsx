"use client";

import { Movie } from "@/types/movie";
import { useEffect, useRef } from "react";

type Props = {
  movie: Movie;
  onClick: () => void;
  onRemove?: (e: React.MouseEvent) => void;
};

export default function MovieCard({ movie, onClick, onRemove }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    let lastTouchTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const now = window.performance.now();
      
      // BẪY SAFARI: Nếu phát hiện 2 cú chạm liên tiếp cách nhau dưới 250ms (Double Tap)
      if (now - lastTouchTime < 250) {
        if (e.cancelable) e.preventDefault(); // Chặn đứng và giết chết lệnh tự động zoom của iOS
      }
      // Nếu là vuốt cuộn bình thường (chỉ chạm 1 lần rồi di chuyển ngón tay), e.preventDefault() KHÔNG chạy, giúp cuộn mượt
      lastTouchTime = now;
    };

    // Buộc phải dùng addEventListener Native với passive: false để đè quyền hệ thống Safari
    cardElement.addEventListener("touchstart", handleTouchStart, { passive: false });

    return () => {
      cardElement.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  return (
    <div
      ref={cardRef} // Gắn ref để kích hoạt bộ bẫy chống zoom Native
      onClick={onClick}
      className="
        relative
        w-full 
        aspect-[2/3] 
        rounded-md
        overflow-hidden
        transition-transform
        duration-300
        cursor-pointer
        bg-zinc-900
        group
        
        /* CHUẨN TAILWIND HOVER: Chỉ tương tác khi dùng chuột ở PC/Máy chiếu */
        @media:pointer-fine:hover:scale-105 
        @media:pointer-fine:hover:z-50 
        @media:pointer-fine:hover:shadow-2xl

        /* CHÌA KHÓA: Cho phép vuốt ngang list phim thoải mái, nhưng không cho phép zoom */
        touch-pan-x touch-pan-y
        select-none
      "
      style={{ touchAction: "pan-x pan-y" }} // Đồng bộ inline style để Safari không hiểu lầm
    >
      {/* Poster phim */}
      <img
        src={movie.poster}
        alt={movie.title}
        className="w-full h-full object-cover object-top pointer-events-none select-none unselectable"
        draggable="false"
      />

      {/* Nút xóa - Giữ nguyên vẹn */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className="
            remove-btn
            absolute top-2 right-2 z-50 w-8 h-8 rounded-full 
            bg-black/70 text-white flex items-center justify-center 
            transition-all duration-300 hover:bg-red-600 active:scale-90
          "
        >
          ✕
        </button>
      )}

      {/* Overlay thông tin - Giữ nguyên vẹn */}
      <div
        className="
          info-overlay
          absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent
          transition-opacity duration-300 flex flex-col justify-end p-2.5
        "
      >
        <div className="transform transition-transform duration-300">
          <h3 className="font-bold text-[13px] md:text-sm text-white truncate leading-tight drop-shadow-lg">
            {movie.title}
          </h3>

          <p className="text-[10px] text-gray-300 mt-1 font-medium flex items-center gap-2">
            <span className="text-green-500 font-bold">{movie.year}</span> 
            <span className="opacity-60">|</span>
            <span className="truncate">{movie.genre}</span>
          </p>
        </div>
      </div>
    </div>
  );
}