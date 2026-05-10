"use client";

import HeroBanner from "@/components/HeroBanner";
import MovieModal from "@/components/MovieModal";
import MovieRow from "@/components/MovieRow";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [keyword, setKeyword] = useState("");
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) =>
      movie.title.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [movies, keyword]);

  useEffect(() => {
    const fetchMovies = async () => {
      const data = await movieService.getMovies();
      setMovies(data);
    };

    fetchMovies();
  }, []);

  const loadHistory = () => {
    try {
      const historyData = localStorage.getItem("myflix_history");
      if (historyData) {
        const history = JSON.parse(historyData);
        const historyMovies = history.map((h: any) => h.movie);
        setContinueWatching(historyMovies);
      } else {
        setContinueWatching([]);
      }
    } catch (e) {
      console.error("Lỗi đọc lịch sử", e);
    }
  };

  useEffect(() => {
    loadHistory();

    const handleStorageChange = () => loadHistory();
    window.addEventListener("myflix_history_updated", handleStorageChange);

    return () => {
      window.removeEventListener("myflix_history_updated", handleStorageChange);
    };
  }, []);

  // Hàm xử lý xóa phim khỏi lịch sử
  const handleRemoveHistory = (movieId: string | number) => {
    try {
      const historyData = localStorage.getItem("myflix_history");
      if (historyData) {
        let history = JSON.parse(historyData);
        // Lọc bỏ phim có id trùng khớp
        history = history.filter((h: any) => h.movie.id !== movieId);
        // Lưu lại vào localStorage
        localStorage.setItem("myflix_history", JSON.stringify(history));
        // Cập nhật lại UI ngay lập tức
        loadHistory();
      }
    } catch (e) {
      console.error("Lỗi xóa lịch sử", e);
    }
  };

  const trendingMovies = filteredMovies.slice(0, 10);
  const chineseMovies = filteredMovies.filter((movie) =>
    movie.description?.toLowerCase().includes("china")
  );
  const actionMovies = filteredMovies.filter((movie) =>
    movie.genre?.toLowerCase().includes("hành động")
  );
  const dramaMovies = filteredMovies.filter((movie) =>
    movie.genre?.toLowerCase().includes("chính kịch")
  );
  const seriesMovies = filteredMovies.filter((movie) =>
    movie.duration?.includes("tập")
  );
  const koreaMovies = filteredMovies.filter(
    (movie) => movie.country === "Hàn Quốc"
  );
  const chinaMovies = filteredMovies.filter(
    (movie) => movie.country === "Trung Quốc"
  );

  return (
    <main className="bg-black min-h-screen text-white">
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      {movies.length > 0 && <HeroBanner movie={movies[0]} />}

      <div className="-mt-24 relative z-20">
        {continueWatching.length > 0 && (
          <MovieRow
            title="Continue Watching"
            movies={continueWatching}
            onSelectMovie={setSelectedMovie}
            onRemoveMovie={handleRemoveHistory} // Chỉ truyền cho Row này
          />
        )}

        <MovieRow
          title="Trending Now"
          movies={trendingMovies}
          onSelectMovie={setSelectedMovie}
        />

        <MovieRow
          title="Korean Shows"
          movies={koreaMovies}
          onSelectMovie={setSelectedMovie}
        />

        <MovieRow
          title="Chinese Drama"
          movies={chinaMovies}
          onSelectMovie={setSelectedMovie}
        />

        <MovieRow
          title="Drama"
          movies={dramaMovies}
          onSelectMovie={setSelectedMovie}
        />
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