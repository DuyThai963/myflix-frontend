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
      // Ở đây ta gọi API danh-sach/phim-le vì đây là trang Movies
      const response = await fetch(`http://localhost:5000/api/danh-sach/phim-le?page=${pageNum}`);
      const data = await response.json();
      
      if (data?.data?.items && data.data.items.length > 0) {
        // Map data sang chuẩn Movie của mình (dùng hàm helper getImageUrl đã viết ở service)
        // Lưu ý: Để nhanh tôi fetch trực tiếp, nhưng bạn nên dùng movieService.getMoviesByCategory cho sạch
        const newMovies = data.data.items.map((m: any) => ({
          id: m._id,
          slug: m.slug,
          title: m.name,
          poster: `https://img.ophim.live/uploads/movies/${m.thumb_url}`,
          year: m.year,
          genre: m.category?.[0]?.name || "Phim lẻ"
        }));

        // Cộng dồn phim mới vào danh sách cũ
        setMovies(prev => pageNum === 1 ? newMovies : [...prev, ...newMovies]);
        
        // Nếu số lượng trả về ít hơn 20 (hoặc số lượng mặc định) thì có thể đã hết phim
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

  const filteredList = useMemo(() => {
    return movies.filter((movie) =>
      movie.title.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [movies, keyword]);

  return (
    <main className="bg-black min-h-screen text-white flex flex-col">
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      <div className="flex-1 px-6 md:px-12 pt-32 pb-12">
        <h1 className="text-3xl font-bold mb-8">Movies</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredList.map((movie) => (
            <div key={movie.id} className="w-full">
              <MovieCard movie={movie} onClick={() => setSelectedMovie(movie)} />
            </div>
          ))}
        </div>

        {/* Nút Tải thêm */}
        {hasMore && !keyword && (
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