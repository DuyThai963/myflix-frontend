"use client";

import HeroBanner from "@/components/HeroBanner";
import MovieModal from "@/components/MovieModal";
import MovieRow from "@/components/MovieRow";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingIntro from "@/components/LoadingIntro";
import { HeroSkeleton, RowSkeleton } from "@/components/Skeletons";

import { useHomeLogic } from "@/hooks/useHomeLogic";

export default function Home() {
  // Triệu hồi toàn bộ State và Action từ hòm logic ra dùng
  const {
    selectedMovie, setSelectedMovie,
    keyword, setKeyword,
    continueWatching,
    movies,
    mountIntro, isIntroLoading,
    isMoviesLoading,
    movieSections,
    handleRemoveHistory
  } = useHomeLogic();

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
            isWatchParty={false}
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