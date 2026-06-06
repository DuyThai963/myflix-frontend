"use client";

import { useState, useEffect } from "react";
import { socket } from "@/services/socket.service";
import { Movie } from "@/types/movie";

interface Room {
  roomId: string;
  roomName: string;
  movieState: {
    slug: string;
    title: string;
    episode: string;
    currentTime: number;
  };
  users: any[];
}

export function useWatchPartyHubLogic(onJoinRoomClick?: (roomId: string) => void) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);

  // 📡 1. LẮNG NGHE DANH SÁCH PHÒNG CHUNG TẠI SẢNH CHÍNH
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    
    socket.emit("get_active_rooms");

    socket.on("active_rooms_list", (data: Room[]) => {
      setRooms(data);
    });

    // 🚀 LUỒNG TẠO PHÒNG THÀNH CÔNG: Chuyển sạch sang găm vào sessionStorage để tự hủy khi tắt tab!
    socket.on("room_created_success", ({ roomId, hostToken }) => {
      try {
        sessionStorage.setItem(`myflix_host_of_${roomId}`, "true");
        sessionStorage.setItem(`host_token_${roomId}`, hostToken);
      } catch (e) {}
      
      const newUrl = `${window.location.pathname}?room=${roomId}`;
      window.history.pushState({}, "", newUrl);
      
      if (onJoinRoomClick) {
        onJoinRoomClick(roomId);
      }
    });

    return () => {
      socket.off("active_rooms_list");
      socket.off("room_created_success");
    };
  }, [onJoinRoomClick]);

  // 🔍 2. LUỒNG TÌM KIẾM PHIM THEO CƠ CHẾ DEBOUNCE ĐỂ KHỞI TẠO PHÒNG
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(`https://dtmyflix.onrender.com/api/search?keyword=${encodeURIComponent(searchQuery)}`);
        const resData = await response.json();
        
        if (resData?.status === "success" && resData?.data?.items) {
          setSearchResults(resData.data.items);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Lỗi tìm kiếm phim tạo phòng:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // ➕ 3. HÀM PHÁT LỆNH KHỞI TẠO PHÒNG MỚI LÊN SERVER RENDER
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !selectedMovie) {
      alert("Vui lòng điền tên phòng và chọn một bộ phim!");
      return;
    }

    const userString = localStorage.getItem("myflix_user");
    if (!userString) {
      alert("Hết phiên đăng nhập, vui lòng đăng nhập lại để tạo phòng!");
      return;
    }
    const user = JSON.parse(userString);

    socket.emit("create_room", {
      roomName: roomName.trim(),
      movieInfo: {
        slug: selectedMovie.slug,
        title: selectedMovie.title,
        episode: "Tập 1", 
        currentTime: 0    
      },
      hostUserId: user.id,
      hostUsername: user.username
    });

    setShowCreateModal(false);
    setRoomName("");
    setSelectedMovie(null);
    setSearchQuery("");
  };

  const handleShareRoom = (roomId: string, roomName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareLink = `${window.location.origin}/watch-party?room=${roomId}`;
    navigator.clipboard.writeText(shareLink);
    alert(`🔗 Đã copy link phòng [${roomName}]!\nHãy gửi link này cho bạn bè để cùng vào cày phim nhé:\n${shareLink}`);
  };

  // 🗑️ 4. HÀM PHÁT LỆNH XÓA PHÒNG PHÍA HOST (ĐÃ ĐỒNG BỘ SẠCH RÁC SANG SESSIONSTORAGE)
  const handleDeleteRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 🎯 CHỈNH SỬA CHÍ MẠNG: Bốc chính xác Token bảo mật từ sessionStorage ra
    const hostToken = sessionStorage.getItem(`host_token_${roomId}`);
    
    if (confirm("⚠️ Bạn có chắc chắn muốn xóa phòng này không? Toàn bộ người xem sẽ bị mời ra ngoài.")) {
      socket.emit("delete_room", { roomId, hostToken });

      try {
        sessionStorage.removeItem(`myflix_host_of_${roomId}`);
        sessionStorage.removeItem(`host_token_${roomId}`);
      } catch (err) {}
    }
  };

  return {
    rooms,
    showCreateModal, setShowCreateModal,
    roomName, setRoomName,
    searchQuery, setSearchQuery,
    searchResults,
    isSearching,
    selectedMovie, setSelectedMovie,
    handleCreateRoom, handleShareRoom, handleDeleteRoom
  };
}