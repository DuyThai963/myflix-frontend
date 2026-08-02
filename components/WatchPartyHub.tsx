"use client";

import { useWatchPartyHubLogic } from "@/hooks/useWatchPartyHubLogic";
import { useEffect, useState } from "react";
import { socket } from "@/services/socket.service";

interface HubProps {
  onJoinRoomClick: (roomId: string) => void; // Khai báo Props nhận ống dẫn từ Page tổng
}

export default function WatchPartyHub({ onJoinRoomClick }: HubProps) {
  // Triệu hồi hòm action từ Hook logic
  const {
    rooms,
    showCreateModal, setShowCreateModal,
    roomName, setRoomName,
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    isSearching,
    selectedMovie, setSelectedMovie,
    handleCreateRoom, handleShareRoom, handleDeleteRoom
  } = useWatchPartyHubLogic(onJoinRoomClick);

  // 🔒 1. Lấy định danh user hiện tại (Dùng để đối chiếu quyền trên FE)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const userString = localStorage.getItem("myflix_user");
      if (userString) setCurrentUser(JSON.parse(userString));
    } catch(e) {}
  }, []);

  // 🎯 2. LỌC PHÒNG RIÊNG TƯ: Chỉ hiện phòng do mình tạo HOẶC phòng mình đã vào xem chung
  const visibleRooms = rooms.filter((room: any) => {
    if (!currentUser) return false;
    const isHost = String(room.hostUserId) === String(currentUser.id);
    const isJoined = room.joinedUserIds && room.joinedUserIds.map(String).includes(String(currentUser.id));
    const isCurrentlyInUsers = room.users && room.users.some((u: any) => String(u.userId) === String(currentUser.id));
    return isHost || isJoined || isCurrentlyInUsers;
  });

  if (!mounted) return null; // 🛡️ Tránh lỗi Hydration Mismatch giữa SSR và Client

  // 🎯 HÀM XỬ LÝ VÀO PHÒNG BẰNG MÃ CODE (GIẢI PHÁP CHO PWA)
  const handleJoinByCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    
    const roomId = joinRoomId.trim();
    const newUrl = `${window.location.pathname}?room=${roomId}`;
    window.history.pushState({}, "", newUrl);

    const userString = localStorage.getItem("myflix_user");
    const user = userString ? JSON.parse(userString) : null;
    const userName = user?.username || `ChiếnHữu_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const userId = user?.id || null;
    
    socket.emit("join_room", { roomId, userName, userId, hostToken: null });
    onJoinRoomClick(roomId);
    
    setShowJoinModal(false);
    setJoinRoomId("");
  };

  // 🎯 HÀM LỌC THÔNG MINH: Tự động trích xuất mã phòng nếu user dán nguyên cả đoạn text share hoặc full URL
  const handleRoomIdInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    // Dùng Regex tìm đoạn bắt đầu bằng "wp_" và theo sau là các ký tự chữ/số
    const match = text.match(/(wp_[a-zA-Z0-9]+)/);
    if (match) {
      setJoinRoomId(match[1]); // Nếu thấy mã, bóc đúng mã ra
    } else {
      setJoinRoomId(text); // Nếu không thấy mã chuẩn, cứ để nguyên text cho người ta gõ
    }
  };

  return (
    <div className="p-4 md:p-12 bg-zinc-950 min-h-screen text-white mt-16 select-none animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">Watch Party Hub</h1>
          <p className="text-zinc-400 text-xs md:text-sm mt-1.5">Nơi kết nối và xem phim thời gian thực cùng nhau</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setShowJoinModal(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-3 py-2 md:px-5 md:py-2.5 rounded-md text-xs md:text-sm transition-all border border-zinc-700 active:scale-95 cursor-pointer"
          >
            Nhập Mã
          </button>
          <button 
            onClick={() => {
              const token = localStorage.getItem("myflix_token");
              if (!token) {
                alert("⚠️ Vui lòng Đăng nhập tài khoản để có quyền Khởi tạo phòng xem chung!");
                return;
              }
              setShowCreateModal(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 md:px-5 md:py-2.5 rounded-md text-xs md:text-sm transition-all shadow-lg shadow-red-900/20 active:scale-95 cursor-pointer"
          >
            Tạo Phòng
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {!currentUser ? (
          <div className="text-center py-24 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 backdrop-blur-sm">
            <span className="text-4xl block mb-3">🔒</span>
            <p className="text-zinc-500 text-sm font-medium">Vui lòng đăng nhập để xem danh sách phòng của bạn.</p>
          </div>
        ) : visibleRooms.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 backdrop-blur-sm">
            <span className="text-4xl block mb-3">🍿</span>
            <p className="text-zinc-500 text-sm font-medium">Bạn chưa tạo hoặc tham gia phòng xem chung nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleRooms.map((room: any) => {
              const amITheHost = String(room.hostUserId) === String(currentUser.id);

              return (
                <div key={room.roomId} className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-xl flex flex-col justify-between hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-300 relative group shadow-xl">
                  <div>
                    <div className="flex justify-between items-center gap-3">
                      <h3 className="text-lg font-bold text-red-500 truncate flex-1 tracking-wide">{room.roomName}</h3>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          type="button"
                          onClick={(e) => handleShareRoom(room.roomId, room.roomName, e)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors text-[11px] font-bold bg-zinc-950 px-2 py-1 border border-zinc-800/60 cursor-pointer active:scale-95"
                        >
                          🔗 Share
                        </button>

                        {amITheHost && (
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteRoom(room.roomId, e)}
                            className="text-zinc-500 hover:text-red-500 p-1 rounded-md transition-colors text-[11px] font-bold bg-zinc-950 px-2 py-1 border border-zinc-800/60 cursor-pointer active:scale-95"
                          >
                            🗑️ Xóa
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/40 pt-3">
                      <p className="truncate">🎬 Phim: <span className="font-bold text-zinc-200">{room.movieState?.title || "N/A"}</span></p>
                      <p>🎞️ Tập: <span className="text-zinc-300 font-medium">{room.movieState?.episode || "1"}</span></p>
                      <p>⏱️ Thời lượng: <span className="text-zinc-300 font-medium">{Math.floor((room.movieState?.currentTime || 0) / 60)} phút</span></p>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-between items-center pt-4 border-t border-zinc-800/60">
                    <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                      {room.users?.length || 0} người đang xem
                    </span>
                    <button 
                      type="button"
                      // 🚀 THÔNG MẠCH QUYẾT ĐỊNH: Bắn ngược mã ID phòng lên cho file Page bung Player độc tôn
                      onClick={() => {
                        const newUrl = `${window.location.pathname}?room=${room.roomId}`;
                        window.history.pushState({}, "", newUrl);

                        // 🎯 ÉP SERVER TRẢ VỀ DỮ LIỆU TƯƠI NHẤT TRƯỚC KHI MỞ MODAL ĐỂ TRÁNH LỖI GHI ĐÈ TIME 0S
                        const userString = localStorage.getItem("myflix_user");
                        const user = userString ? JSON.parse(userString) : null;
                        const userName = user?.username || `ChiếnHữu_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                        const userId = user?.id || null;
                        const hostToken = sessionStorage.getItem(`host_token_${room.roomId}`) || null;
                        socket.emit("join_room", { roomId: room.roomId, userName, userId, hostToken });

                        onJoinRoomClick(room.roomId);
                      }}
                      className="bg-white text-black font-extrabold px-4 py-1.5 rounded-md text-xs hover:bg-red-600 hover:text-white transition-all active:scale-95 cursor-pointer shadow-md"
                    >
                      Vào Xem
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CONFIG TẠO PHÒNG */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleCreateRoom} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-5 tracking-wide text-zinc-100">Cấu Hình Phòng Xem Chung</h2>
            
            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-2">Tên Phòng</label>
              <input 
                type="text" required value={roomName} onChange={(e) => setRoomName(e.target.value)}
                placeholder="Nhập tên phòng của bạn..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-600"
              />
            </div>

            <div className="mb-4 relative">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-2">Tìm & Chọn phim xem chung</label>
              
              {selectedMovie ? (
                <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-md border border-red-900/30 mt-2 animate-in fade-in duration-200">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-bold text-white truncate">{selectedMovie.title}</p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{selectedMovie.origin_name}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedMovie(null)} className="text-red-500 hover:text-red-400 text-xs font-bold shrink-0 cursor-pointer">Thay Đổi</button>
                </div>
              ) : (
                <>
                  <input 
                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Gõ tên phim cần tìm để cày chung..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-600"
                  />
                  {isSearching && <span className="absolute right-3 bottom-3 text-xs text-zinc-500 animate-pulse">Đang tìm...</span>}

                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 p-2 flex flex-col gap-1 backdrop-blur-md custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 mb-1">Gợi ý phim</p>
                      
                      {searchResults.map((movie: any) => {
                        const rawImg = movie.thumb_url || movie.poster_url || "";
                        const imgUrl = rawImg || "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png";

                        return (
                          <div 
                            key={movie._id || movie.slug}
                            onClick={() => {
                              setSelectedMovie({
                                id: movie._id || movie.id || movie.slug,
                                slug: movie.slug,
                                title: movie.name || movie.title,
                                origin_name: movie.origin_name || "",
                                year: movie.year || 2026,
                                episode_current: movie.episode_current || "Full",
                                thumb_url: rawImg
                              });
                              setSearchResults([]);
                              setSearchQuery("");
                            }}
                            className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-md cursor-pointer transition-colors border-b border-zinc-900/50 last:border-0 group text-left"
                          >
                            <img src={imgUrl} alt={movie.name} className="w-8 aspect-[2/3] rounded object-cover flex-shrink-0 border border-zinc-800/80 group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                            <div className="flex flex-col truncate flex-1 min-w-0">
                              <span className="text-xs font-semibold text-white truncate group-hover:text-red-500 transition-colors">{movie.name}</span>
                              <span className="text-[10px] text-zinc-500 mt-0.5 truncate">{movie.origin_name}</span>
                              <span className="text-[10px] text-zinc-500 mt-1 font-medium">{movie.year} | {movie.episode_current || "Full"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2.5 mt-8 border-t border-zinc-800/60 pt-4">
              <button 
                type="button" 
                onClick={() => { setShowCreateModal(false); setSelectedMovie(null); setSearchQuery(""); }}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-md text-xs transition-colors cursor-pointer shadow-md active:scale-95">
                Khởi Tạo Phòng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL NHẬP MÃ PHÒNG (GIẢI PHÁP CHO PWA APP) */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleJoinByCodeSubmit} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-sm mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-3 tracking-wide text-zinc-100">Nhập Mã Phòng</h2>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">Nếu bạn đang dùng App, hãy copy mã phòng và dán vào đây để xem chung thay vì click link web.</p>
            
            <div className="mb-6">
              <input 
                type="text" required value={joinRoomId} onChange={handleRoomIdInput}
                placeholder="VD: wp_abc123..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm text-white focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-600 font-mono tracking-wider"
              />
            </div>

            <div className="flex justify-end gap-2.5 border-t border-zinc-800/60 pt-4">
              <button type="button" onClick={() => { setShowJoinModal(false); setJoinRoomId(""); }} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer">
                Hủy
              </button>
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-md text-xs transition-colors cursor-pointer shadow-md active:scale-95">
                Vào Phòng
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}