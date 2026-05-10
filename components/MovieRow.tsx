"use client";

import { useRef } from "react";
import { Movie } from "@/types/movie";
import MovieCard from "./MovieCard";

type Props = {
  title: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onRemoveMovie?: (movieId: string | number) => void; // Thêm prop này
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
      left: direction === "left" ? -800 : 800,
      behavior: "smooth",
    });
  };

  return (
    <section className="px-6 md:px-12 mt-12 relative">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>

      <button
        onClick={() => scroll("left")}
        className="
          absolute
          left-2
          top-1/2
          -translate-y-1/2
          z-20
          bg-black/60
          hover:bg-black
          w-10
          h-20
          text-white
          hidden
          md:flex
          items-center
          justify-center
        "
      >
        ‹
      </button>

      <button
        onClick={() => scroll("right")}
        className="
          absolute
          right-2
          top-1/2
          -translate-y-1/2
          z-20
          bg-black/60
          hover:bg-black
          w-10
          h-20
          text-white
          hidden
          md:flex
          items-center
          justify-center
        "
      >
        ›
      </button>

      <div
        ref={rowRef}
        className="
          flex
          gap-4
          overflow-x-auto
          scroll-smooth
          pb-4
        "
        style={{
          scrollbarWidth: "none",
        }}
      >
        {movies.map((movie) => (
          // Thêm thẻ div bọc ngoài này để giữ nguyên kích thước khi cuộn ngang ở trang Home
          <div 
            key={movie.id} 
            className="flex-none w-[200px] sm:w-[240px] md:w-[280px] lg:w-[320px]"
          >
            <MovieCard
              movie={movie}
              onClick={() => onSelectMovie(movie)}
              onRemove={onRemoveMovie ? () => onRemoveMovie(movie.id) : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  );
}