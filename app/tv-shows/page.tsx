"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";
import { useEffect, useState } from "react";

export default function TvShowsPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const fetchMovies = async () => {
      const data = await movieService.getMovies();
      // Lọc ra phim bộ (có chứa chữ "tập" trong duration)
      const seriesMovies = data.filter((m: Movie) => m.duration?.includes("tập"));
      setMovies(seriesMovies);
    };
    fetchMovies();
  }, []);

  return (
    <main className="bg-black min-h-screen text-white flex flex-col">
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      <div className="flex-1 px-6 md:px-12 pt-32 pb-12">
        <h1 className="text-3xl font-bold mb-8">TV Shows</h1>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <div key={movie.id} className="w-full">
                <MovieCard
                  movie={movie}
                  onClick={() => setSelectedMovie(movie)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 py-20">
            <span className="text-6xl mb-4">📺</span>
            <p className="text-xl">Hiện chưa có phim bộ nào.</p>
          </div>
        )}
      </div>

      <MovieModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
      />

      <Footer />
    </main>
  );
}