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
      // Gọi qua proxy backend để lấy danh sách phim, không gọi trực tiếp OPhim
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/home?page=${pageNum}`);
      const data = await response.json();
      
      const items = data?.data?.items || data?.items || [];
      
      if (items.length > 0) {
        const newMovies = items.map((m: any) => ({
          id: m._id || m.id || m.slug,
          slug: m.slug,
          title: m.name || m.title,
          poster: m.poster_url || m.thumb_url,
          year: m.year,
          genre: m.category?.[0]?.name || "Phim lẻ"
        }));

        // Cộng dồn phim mới vào danh sách cũ
        setMovies(prev => pageNum === 1 ? newMovies : [...prev, ...newMovies]);
        
        // Nếu số lượng trả về ít hơn 10 thì có thể đã hết phim
        if (newMovies.length < 10) setHasMore(false);
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
        <h1 className="text-3xl font-bold mb-8">Movies</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <div key={movie.id} className="w-full">
              <MovieCard movie={movie} onClick={() => setSelectedMovie(movie)} />
            </div>
          ))}
        </div>

        {/* Nút Tải thêm */}
        {hasMore && (
          <div className="flex justify-center mt-12">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="bg-white text-black px-8 py-2 rounded-md font-bold hover:bg-gray-200 transition disabled:bg-gray-500"
            >
              {loading ? "Đang tải..." : "Tải thêm"}
            </button>
          </div>
        )}
      </div>

      <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      <Footer />
    </main>
  );
}