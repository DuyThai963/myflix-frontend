"use client";

import WatchPartyHub from "@/components/WatchPartyHub";
import Navbar from "@/components/Navbar";
import MovieModal from "@/components/MovieModal";
import { useWatchPartyLogic } from "@/hooks/useWatchPartyLogic";

export default function WatchPartyPage() {
  // Triệu hồi hòm tài nguyên xử lý dữ liệu chung
  const {
    keyword, setKeyword,
    selectedMovie,
    initialTime,
    setCurrentRoomId,
    handleCloseMovie
  } = useWatchPartyLogic();

  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar keyword={keyword} setKeyword={setKeyword} />
      
      <main className="pt-24">
        {/* Truyền hàm kích hoạt Room ID vào sảnh card phòng */}
        <WatchPartyHub onJoinRoomClick={setCurrentRoomId} />
      </main>

      {/* 👑 KHÓA CHẶT HỌNG RÒ RỈ: ÉP CỨNG ISWATCHPARTY={TRUE} VÀO ĐÍT MODAL TẠI SẢNH */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={handleCloseMovie}
          initialTime={initialTime}
          isWatchParty={true}
        />
      )}
    </div>
  );
}