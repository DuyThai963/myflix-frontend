"use client";

import { useRef } from "react";
import { Movie } from "@/types/movie";
import MovieCard from "./MovieCard";

type Props = {
  title: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onRemoveMovie?: (movieId: string | number) => void;
};

export default function MovieRow({
  title,
  movies,
  onSelectMovie,
  onRemoveMovie,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({
      left: direction === "left" ? -500 : 500,
      behavior: "smooth",
    });
  };

  return (
    <section className="px-6 md:px-12 mt-12 relative group/row">
      <h2 className="text-2xl font-bold mb-4 text-white">{title}</h2>

      {/* Nút cuộn trái - Chỉ hiện khi hover vào hàng */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-2 top-[55%] -translate-y-1/2 z-40 bg-black/60 hover:bg-black w-10 h-32 text-white hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
      >
        ‹
      </button>

      {/* Nút cuộn phải - Chỉ hiện khi hover vào hàng */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-2 top-[55%] -translate-y-1/2 z-40 bg-black/60 hover:bg-black w-10 h-32 text-white hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
      >
        ›
      </button>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-10 pt-4 overscroll-x-contain"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {movies.map((movie, index) => {
          const uniqueKey = (movie as any).watchId_db || movie.id || movie.slug || `row-item-${index}`;

          return (
            <div 
              key={uniqueKey} 
              className="flex-none w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px]" 
            >
              <MovieCard
                movie={movie}
                onClick={() => onSelectMovie(movie)}
                onRemove={onRemoveMovie ? () => onRemoveMovie(movie.id) : undefined}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}