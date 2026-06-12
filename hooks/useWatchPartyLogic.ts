import { useState, useEffect } from "react";
import { socket } from "@/services/socket.service";
import { Movie } from "@/types/movie";

export function useWatchPartyLogic() {
  const [keyword, setKeyword] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [initialTime, setInitialTime] = useState<number>(0);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    // Lắng nghe mốc thời gian khởi tạo từ Host truyền cho Guest
    const handleSyncInitialTime = ({ currentTime }: { currentTime: number }) => {
      setInitialTime(currentTime);
    };
    socket.on("sync_initial_time_to_guest", handleSyncInitialTime);

    // Lắng nghe trạng thái phòng để bung Modal Player xem chung
    socket.on("room_state", (roomData) => {
      if (roomData?.movieState?.slug) {
        setSelectedMovie({
          id: roomData.movieState.id || roomData.roomId, // 🎯 Bổ sung ID chuẩn để Modal parse ra đúng tập
          slug: roomData.movieState.slug,
          title: roomData.movieState.title,
          watchId_db: roomData.movieState.episodeSlug ? `${roomData.movieState.id || roomData.roomId}-${roomData.movieState.episodeSlug}` : undefined,
          currentTime: roomData.movieState.currentTime || 0,
          origin_name: "", thumb_url: "", poster_url: "", banner: "", stream: "",
          description: "", year: 2026, duration: "", genre: "", country: "",
          episode_current: roomData.movieState.episode || "Tập 1",
          episode_total: "1"
        });
        // 🎯 Gắn lại thời gian từ DB Redis để phát tiếp ngay mốc đã lưu
        setInitialTime(roomData.movieState.currentTime || 0);
      }
    });

    socket.on("room_error", (error) => {
      alert(`⚠️ Lỗi phòng: ${error.message}`);
      setSelectedMovie(null);
      setCurrentRoomId(null);
      window.history.pushState({}, "", window.location.pathname);
    });

    socket.on("room_deleted_by_host", () => {
      alert("Chủ phòng đã đóng phòng này vĩnh viễn!");
      setSelectedMovie(null);
      setCurrentRoomId(null);
      window.history.pushState({}, "", window.location.pathname);
    });

    return () => {
      socket.off("sync_initial_time_to_guest", handleSyncInitialTime);
      socket.off("room_state");
      socket.off("room_error");
      socket.off("room_deleted_by_host");
    };
  }, []);

  // Luồng lội phòng tự động khi có mã query ?room= trên URL hoặc từ state bấm vào
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get("room");
    const activeRoomId = roomIdFromUrl || currentRoomId;

    if (!activeRoomId) return;

    const userString = localStorage.getItem("myflix_user");
    const user = userString ? JSON.parse(userString) : null;
    
    const userName = user?.username || `Khách_${Math.random().toString(36).substring(7)}`;
    const userId = user?.id || null;
    const hostToken = localStorage.getItem(`host_token_${activeRoomId}`) || null;

    socket.emit("join_room", {
      roomId: activeRoomId,
      userName,
      userId,
      hostToken
    });
  }, [currentRoomId]);

  const handleCloseMovie = () => {
    setSelectedMovie(null);
    setCurrentRoomId(null);
    window.history.pushState({}, "", window.location.pathname);
  };

  return {
    keyword, setKeyword,
    selectedMovie, setSelectedMovie,
    initialTime,
    currentRoomId, setCurrentRoomId,
    handleCloseMovie
  };
}