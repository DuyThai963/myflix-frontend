"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieModal from "@/components/MovieModal";
import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";
import { BsFillPlayFill } from "react-icons/bs";
import { FaArrowLeft } from "react-icons/fa";

export default function MovieDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;
  const router = useRouter();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMovie = async () => {
      setLoading(true);
      try {
        const data = await movieService.getMovieDetail(slug);
        if (!isMounted) return;

        const movieItem = data?.movie || data?.item;
        if (movieItem) {
          const formattedMovie: Movie = {
            id: movieItem._id || movieItem.id || slug,
            slug: movieItem.slug || slug,
            title: movieItem.name || movieItem.title || "Phim",
            description: movieItem.content || movieItem.description || movieItem.origin_name || "",
            banner: movieItem.banner || movieItem.tmdb_backdrop || movieItem.thumb_url || movieItem.poster_url || "",
            poster: movieItem.poster || movieItem.poster_url || movieItem.thumb_url || "",
            stream: "",
            year: movieItem.year || new Date().getFullYear(),
            duration: movieItem.time || "",
            country: movieItem.country?.[0]?.name || "Đang cập nhật",
            genre: movieItem.category?.[0]?.name || "Phim",
            episode_current: movieItem.episode_current || "Full",
            episode_total: movieItem.episode_total || "",
            origin_name: movieItem.origin_name || ""
          };
          setMovie(formattedMovie);
        }
      } catch (error) {
        console.error("Lỗi tải thông tin phim:", error);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchMovie();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    window.dispatchEvent(new Event("myflix_history_updated"));
    if (window.location.search.includes("room=")) {
      window.history.pushState({}, "", window.location.pathname);
    }
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <main className="bg-black min-h-screen text-white flex flex-col">
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      <div className="flex-1 flex flex-col pt-24 pb-12">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
            <p className="text-zinc-400 font-medium text-sm animate-pulse">
              Đang tải dữ liệu phim...
            </p>
          </div>
        ) : movie ? (
          <div className="relative flex-1 flex flex-col">
            {/* Background Backdrop Hero */}
            <div className="relative w-full h-[50vh] md:h-[65vh] overflow-hidden select-none">
              <img
                src={movie.banner || movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover object-center filter brightness-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />

              {/* Movie Info Overlay */}
              <div className="absolute bottom-8 left-6 md:left-12 max-w-2xl z-10">
                <button
                  onClick={handleGoBack}
                  className="mb-4 inline-flex items-center gap-2 text-xs md:text-sm text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full backdrop-blur-md transition-colors"
                >
                  <FaArrowLeft className="text-xs" /> Quay lại
                </button>

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-md leading-tight mb-2">
                  {movie.title}
                </h1>

                {movie.origin_name && (
                  <p className="text-sm md:text-base text-zinc-400 italic mb-3">
                    {movie.origin_name} {movie.year ? `(${movie.year})` : ""}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs md:text-sm text-zinc-300 mb-4">
                  {movie.year && (
                    <span className="text-green-500 font-bold">{movie.year}</span>
                  )}
                  {movie.duration && (
                    <>
                      <span>•</span>
                      <span>{movie.duration}</span>
                    </>
                  )}
                  {movie.genre && (
                    <>
                      <span>•</span>
                      <span className="bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-200">
                        {movie.genre}
                      </span>
                    </>
                  )}
                  {movie.episode_current && (
                    <span className="bg-purple-600/90 text-white font-semibold px-2 py-0.5 rounded text-[11px]">
                      {movie.episode_current}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-md shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    <BsFillPlayFill size={24} />
                    <span>Xem Phim</span>
                  </button>

                  <button
                    onClick={handleGoBack}
                    className="bg-zinc-800/80 hover:bg-zinc-700 text-white font-medium px-5 py-2.5 rounded-md backdrop-blur-md transition-colors"
                  >
                    Khám phá phim khác
                  </button>
                </div>
              </div>
            </div>

            {/* Chi tiết nội dung tóm tắt */}
            <div className="px-6 md:px-12 py-8 max-w-4xl">
              <h2 className="text-xl font-bold mb-3 text-white border-l-4 border-red-600 pl-3">
                Nội Dung Phim
              </h2>
              <div
                className="text-zinc-300 text-sm md:text-base leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{
                  __html: movie.description || "Đang cập nhật nội dung cho bộ phim này..."
                }}
              />
            </div>

            {/* Modal phát phim trực tiếp */}
            {isModalOpen && (
              <MovieModal
                movie={movie}
                isWatchParty={false}
                onClose={handleCloseModal}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
            <h2 className="text-2xl font-bold mb-2">Không tìm thấy phim</h2>
            <p className="text-zinc-400 mb-6 text-sm">
              Phim bạn tìm kiếm có thể đã bị xóa hoặc đường dẫn không đúng.
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-red-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-red-700 transition"
            >
              Về trang chủ
            </button>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
