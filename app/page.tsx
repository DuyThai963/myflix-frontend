"use client";

import HeroBanner from "@/components/HeroBanner";
import MovieModal from "@/components/MovieModal";
import MovieRow from "@/components/MovieRow";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingIntro from "@/components/LoadingIntro";
import { HeroSkeleton, RowSkeleton } from "@/components/Skeletons";

import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";
import { useEffect, useMemo, useState } from "react";
import { socket } from "@/services/socket.service";

export default function Home() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [keyword, setKeyword] = useState("");
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  const [mountIntro, setMountIntro] = useState(false);
  const [isMoviesLoading, setIsMoviesLoading] = useState(true);

  useEffect(() => {
    socket.connect();

    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("room");

    if (!roomId) {
      setSelectedMovie(null);
      return;
    }
    const userName = `ChiếnHữu_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    socket.emit("join_room", { roomId, userName });

    const handleRoomState = (data: any) => {
      if (data && data.movieState && data.movieState.slug) {
        setSelectedMovie({
          id: data.movieState.id || data.roomId,
          slug: data.movieState.slug,
          title: data.movieState.title,
          origin_name: "",
          thumb_url: "",
          poster_url: "",
          year: 2026,
          duration: "",
          genre: "",
          country: "",
          description: ""
        });
      }
    };

    const handleRoomError = (err: any) => {
      alert(`⚠️ Lỗi phòng: ${err.message}`);
      window.location.href = "/";
    };

    socket.on("room_state", handleRoomState);
    socket.on("room_error", handleRoomError);

    return () => {
      socket.off("room_state", handleRoomState);
      socket.off("room_error", handleRoomError);
    };
  }, []);

  // Fetch dữ liệu từ API Home
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await movieService.getMovies();
        setMovies(data);
      } catch (error) {
        console.error("Lỗi fetch movies", error);
      } finally {
        setIsMoviesLoading(false);
      }
    };
    fetchMovies();
  }, []);

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem("myflix_has_seen_intro");

    if (!hasSeenIntro) {
      setMountIntro(true);
      const introTimer = setTimeout(() => {
        setIsIntroLoading(false);
        sessionStorage.setItem("myflix_has_seen_intro", "true");
      }, 2500);

      return () => clearTimeout(introTimer);
    } else {
      setIsIntroLoading(false);
      setMountIntro(false); 
    }
  }, []);

  useEffect(() => {
    console.log("[INTRO] isIntroLoading:", isIntroLoading);
    if (isIntroLoading) {
      sessionStorage.setItem("myflix_has_seen_intro", "true");
      const introTimer = setTimeout(() => {
        console.log("[INTRO] Intro ended");
        setIsIntroLoading(false);
      }, 2500);

      return () => clearTimeout(introTimer);
    }
  }, [isIntroLoading]);

  // Logic nhóm phim tự động theo danh mục
  const movieSections = useMemo(() => {
    if (movies.length === 0) return [];

    // Lọc theo keyword trước
    const filtered = movies.filter((m) =>
      m.title.toLowerCase().includes(keyword.toLowerCase())
    );

    return [
      { title: "Trending Now", movies: filtered.slice(0, 10) },
      { title: "Phim Trung Quốc", movies: filtered.filter((m) => m.country === "Trung Quốc") },
      { title: "Phim Hàn Quốc", movies: filtered.filter((m) => m.country === "Hàn Quốc") },
      { title: "Hành động", movies: filtered.filter((m) => m.genre === "Hành động") },
      { title: "Chính kịch", movies: filtered.filter((m) => m.genre === "Chính kịch") },
      { title: "Âu Mỹ", movies: filtered.filter((m) => m.country === "Âu Mỹ") },
    ].filter((section) => section.movies.length > 0);
  }, [movies, keyword]);

  // Logic quản lý lịch sử xem
  useEffect(() => {
    const loadHistory = () => {
      try {
        const historyData = localStorage.getItem("myflix_history");
        if (historyData) {
          const parsedHistory = JSON.parse(historyData);
          const uniqueMoviesMap = new Map();
          parsedHistory.forEach((item: any) => {
            if (item?.movie?.id && !uniqueMoviesMap.has(item.movie.id)) {
              uniqueMoviesMap.set(item.movie.id, item.movie);
            }
          });
          setContinueWatching(Array.from(uniqueMoviesMap.values()));
        } else {
          setContinueWatching([]);
        }
      } catch (e) { 
        console.error("Lỗi đọc lịch sử", e); 
      }
    };
    loadHistory();
    window.addEventListener("myflix_history_updated", loadHistory);
    return () => window.removeEventListener("myflix_history_updated", loadHistory);
  }, []);

  const handleRemoveHistory = (movieId: string | number) => {
    const historyData = localStorage.getItem("myflix_history");
    if (historyData) {
      const history = JSON.parse(historyData).filter((h: any) => h.movie.id !== movieId);
      localStorage.setItem("myflix_history", JSON.stringify(history));
      window.dispatchEvent(new Event("myflix_history_updated"));
    }
  };

  return (
    <>
      {mountIntro && <LoadingIntro isLoading={isIntroLoading} />}
      <main className="bg-black min-h-screen text-white">
        <Navbar keyword={keyword} setKeyword={setKeyword} />

        {isMoviesLoading ? (
          <>
            <HeroSkeleton />
            <div className="-mt-24 relative z-20">
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </div>
          </>
        ) : (
          <>
            {movies.length > 0 && <HeroBanner movie={movies[0]} />}

            <div className="-mt-24 relative z-20">
              {continueWatching.length > 0 && (
                <MovieRow
                  title="Continue Watching"
                  movies={continueWatching}
                  onSelectMovie={setSelectedMovie}
                  onRemoveMovie={handleRemoveHistory}
                />
              )}

              {movieSections.map((section, index) => (
                <MovieRow
                  key={index}
                  title={section.title}
                  movies={section.movies}
                  onSelectMovie={setSelectedMovie}
                />
              ))}
            </div>
          </>
        )}

        {selectedMovie && (
          <MovieModal
            movie={selectedMovie}
            onClose={() => {
              setSelectedMovie(null);
              window.dispatchEvent(new Event("myflix_history_updated"));
              if (window.location.search.includes("room=")) {
                window.history.pushState({}, "", window.location.pathname);
              }
            }}
          />
        )}
        <Footer />
      </main>
    </>
  );
}