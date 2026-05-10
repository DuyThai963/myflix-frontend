"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";

// 1. Tách toàn bộ logic tìm kiếm vào Component này
function SearchResults() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || ""; // Dùng "q" giống code cũ của bạn

  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [keyword, setKeyword] = useState(queryParam);

  // Đồng bộ ô input trên Navbar với URL
  useEffect(() => {
    setKeyword(queryParam);
  }, [queryParam]);

  // Gọi API tìm kiếm
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!queryParam.trim()) {
        setMovies([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const data = await movieService.searchMovies(queryParam);
        setMovies(data);
      } catch (error) {
        console.error("Lỗi khi tìm kiếm:", error);
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [queryParam]);

  return (
    <>
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      <div className="flex-1 px-6 md:px-12 pt-32 pb-12">
        <h1 className="text-3xl font-bold mb-8">
          Kết quả tìm kiếm: <span className="text-red-600">"{queryParam}"</span>
        </h1>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-zinc-700 border-t-red-600 rounded-full animate-spin"></div>
          </div>
        ) : movies.length > 0 ? (
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
            <span className="text-6xl mb-4">🔍</span>
            <p className="text-xl">Không tìm thấy phim nào khớp với từ khóa của bạn.</p>
          </div>
        )}
      </div>

      <MovieModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
      />
    </>
  );
}

// 2. Export chính chỉ làm nhiệm vụ bọc Suspense để Vercel không báo lỗi
export default function SearchPage() {
  return (
    <main className="bg-black min-h-screen text-white flex flex-col">
      <Suspense fallback={
        <div className="bg-black min-h-screen text-white flex items-center justify-center">
          <p>Đang chuẩn bị trang tìm kiếm...</p>
        </div>
      }>
        <SearchResults />
      </Suspense>
      <Footer />
    </main>
  );
}