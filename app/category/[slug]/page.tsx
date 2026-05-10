"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";
import { useEffect, useState, use } from "react";

const categoryNames: Record<string, string> = {
  "phim-moi": "Phim Mới Cập Nhật",
  "phim-bo": "Phim Bộ",
  "phim-le": "Phim Lẻ",
  "hoat-hinh": "Phim Hoạt Hình",
  "phim-chieu-rap": "Phim Chiếu Rạp",
  "hanh-dong": "Phim Hành Động",
  "kinh-di": "Phim Kinh Dị",
};

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;

  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const displayName = categoryNames[slug] || "Thể loại phim";

  const fetchCategoryMovies = async (pageNum: number) => {
    setLoading(true);
    try {
      const data = await movieService.getMoviesByCategory(slug, pageNum);
      
      if (data && data.length > 0) {
        // Nếu là trang 1 thì thay mới, nếu trang > 1 thì cộng dồn
        setMovies(prev => pageNum === 1 ? data : [...prev, ...data]);
        
        // Nếu API trả về ít hơn số lượng mặc định (thường là 20), nghĩa là hết phim
        if (data.length < 10) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Lỗi khi tải thể loại:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset dữ liệu khi đổi thể loại trên Navbar
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchCategoryMovies(1);
  }, [slug]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCategoryMovies(nextPage);
  };

  return (
    <main className="bg-black min-h-screen text-white flex flex-col">
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      <div className="flex-1 px-6 md:px-12 pt-32 pb-12">
        <h1 className="text-3xl font-bold mb-8">{displayName}</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <div key={`${movie.id}-${Math.random()}`} className="w-full">
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
              className="bg-red-600 text-white px-8 py-2 rounded-md font-bold hover:bg-red-700 transition disabled:bg-zinc-800 disabled:text-zinc-500"
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

      <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      <Footer />
    </main>
  );
}