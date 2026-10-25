"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";
import { useEffect, useState, useMemo } from "react";

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1); // Quản lý số trang hiện tại
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true); // Kiểm tra còn phim để tải không

  const fetchMovies = async (pageNum: number) => {
    setLoading(true);
    try {
      const data = await movieService.getMoviesByCategory("phim-le", pageNum);
      if (data && data.length > 0) {
        setMovies(prev => pageNum === 1 ? data : [...prev, ...data]);
        if (data.length < 10) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Lỗi fetch movies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies(1);
  }, []);

  // Hàm xử lý khi bấm nút Tải thêm
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMovies(nextPage);
  };

  return (
    <main className="bg-black min-h-screen text-white flex flex-col">
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      <div className="flex-1 px-6 md:px-12 pt-32 pb-12">
        <h1 className="text-3xl font-bold mb-8">Phim Lẻ (Movies)</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie, index) => (
            <div key={`${movie.id || movie.slug}-${index}`} className="w-full">
              <MovieCard movie={movie} onClick={() => setSelectedMovie(movie)} />
            </div>
          ))}
        </div>

        {/* Nút Tải thêm */}
        {hasMore && (
          <div className="flex justify-center mt-12 mb-8">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="bg-red-600 text-white px-8 py-2 rounded-md font-bold hover:bg-red-700 transition disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tải...
                </div>
              ) : "Xem thêm"}
            </button>
          </div>
        )}
      </div>

      <MovieModal
        movie={selectedMovie}
        onClose={() => {
          setSelectedMovie(null);
          window.dispatchEvent(new Event("myflix_history_updated"));
        }}
      />
      <Footer />
    </main>
  );
}