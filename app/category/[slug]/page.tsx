"use client";

// [Design Read] Clean dark cinematic grid layout for dynamic categories with instant 0ms pre-fetched pagination and accessible TV D-pad focus states.
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { Movie } from "@/types/movie";
import { useServer } from "@/context/ServerContext";
import { useState, use } from "react";
import { usePrefetchPagination } from "@/hooks/usePrefetchPagination";

const categoryNames: Record<string, string> = {
  "phim-moi": "Phim Mới Cập Nhật",
  "phim-bo": "Phim Bộ",
  "phim-le": "Phim Lẻ",
  "hoat-hinh": "Phim Hoạt Hình",
  "phim-chieu-rap": "Phim Chiếu Rạp",
  "hanh-dong": "Phim Hành Động",
  "kinh-di": "Phim Kinh Dị",
  "tinh-cam": "Phim Tình Cảm",
  "hai-huoc": "Phim Hài Hước",
  "co-trang": "Phim Cổ Trang",
  "tam-ly": "Phim Tâm Lý",
  "hinh-su": "Phim Hình Sự",
  "vien-tuong": "Phim Viễn Tưởng",
};

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;
  const { currentServerId } = useServer();

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [keyword, setKeyword] = useState("");

  const displayName = categoryNames[slug] || "Thể loại phim";

  const {
    movies,
    loading,
    hasMore,
    handleLoadMore,
    sentinelRef,
  } = usePrefetchPagination({
    categorySlug: slug,
    currentServerId,
  });

  return (
    <main className="bg-black min-h-screen text-white flex flex-col">
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      <div className="flex-1 px-6 md:px-12 pt-32 pb-12">
        <h1 className="text-3xl font-bold mb-8">{displayName}</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie, index) => (
            <div key={`${movie.id || movie.slug}-${index}`} className="w-full">
              <MovieCard movie={movie} onClick={() => setSelectedMovie(movie)} />
            </div>
          ))}
        </div>

        {/* Nút Xem thêm - Tự động tải trước dữ liệu ngầm khi lướt gần tới, click hiển thị 0ms */}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center mt-12 mb-8">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="bg-red-600 text-white px-8 py-2.5 rounded-md font-bold hover:bg-red-700 transition disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:scale-105 active:scale-95 shadow-lg"
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
