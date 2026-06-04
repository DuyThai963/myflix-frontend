"use client";

import WatchPartyHub from "@/components/WatchPartyHub";
import Navbar from "@/components/Navbar";
import { useState, useEffect } from "react";
import { socket } from "@/services/socket.service";
import MovieModal from "@/components/MovieModal";
import { Movie } from "@/types/movie";

export default function WatchPartyPage() {
  const [keyword, setKeyword] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [initialTime, setInitialTime] = useState<number>(0);

  useEffect(() => {
    socket.connect();

    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get("room");

    const handleSyncInitialTime = ({ currentTime }: { currentTime: number }) => {
      setInitialTime(currentTime);
    };

    socket.on("sync_initial_time_to_guest", handleSyncInitialTime);

    if (room) {
      socket.emit("join_room", {
        roomId: room,
        userName: `Khách_${Math.random().toString(36).substring(7)}`
      });

      socket.on("room_state", (roomData) => {
        if (roomData?.movieState?.slug) {
          setSelectedMovie({
            id: roomData.movieState.slug,
            slug: roomData.movieState.slug,
            title: roomData.movieState.title,
            description: "",
            banner: "",
            poster: "",
            stream: "",
            year: 0,
            duration: "",
            genre: "",
            country: "",
            episode_current: roomData.movieState.episode || "1",
            episode_total: "1"
          });
        }
      });

      socket.on("room_error", (error) => {
        alert(error.message);
      });

      socket.on("room_deleted_by_host", () => {
        alert("Chủ phòng đã đóng phòng này!");
        setSelectedMovie(null);
      });
    }

    return () => {
      socket.off("room_state");
      socket.off("room_error");
      socket.off("room_deleted_by_host");
      socket.off("sync_initial_time_to_guest", handleSyncInitialTime);
    };
  }, []);

  const handleCloseMovie = () => {
    setSelectedMovie(null);
  };

  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar keyword={keyword} setKeyword={setKeyword} />
      <main className="pt-24">
        <WatchPartyHub />
      </main>
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={handleCloseMovie}
          initialTime={initialTime}
        />
      )}
    </div>
  );
}
