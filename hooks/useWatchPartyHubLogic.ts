"use client";

import { useState, useEffect } from "react";
import { socket } from "@/services/socket.service";
import { Movie } from "@/types/movie";

interface Room {
  roomId: string;
  roomName: string;
  hostUserId?: string | number;
  hostUsername?: string;
  movieState: {
    slug: string;
    title: string;
    episode: string;
    currentTime: number;
  };
  users: any[];
  joinedUserIds?: (string | number)[]; // Thêm mảng này để nhận list user_id được share từ Backend
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
    
    // Bắn lệnh xin phòng ĐÚNG THỜI ĐIỂM KẾT NỐI XONG
    if (socket.connected) {
      socket.emit("get_active_rooms");
    }
    socket.on("connect", () => {
      socket.emit("get_active_rooms");
    });

    socket.on("active_rooms_list", (data: Room[]) => {
      setRooms(data);
    });

    // 🚀 LUỒNG TẠO PHÒNG THÀNH CÔNG
    socket.on("room_created_success", ({ roomId }) => {
      
      const newUrl = `${window.location.pathname}?room=${roomId}`;
      window.history.pushState({}, "", newUrl);
      
      if (onJoinRoomClick) {
        onJoinRoomClick(roomId);
      }
    });

    return () => {
      socket.off("connect");
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/search?keyword=${encodeURIComponent(searchQuery)}`);
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
        id: selectedMovie.id,
        slug: selectedMovie.slug,
        title: selectedMovie.title,
        episode: "Tập 1", 
        episodeSlug: "full",
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

  // 🗑️ 4. HÀM PHÁT LỆNH XÓA PHÒNG PHÍA HOST (DỰA 100% VÀO ID NGƯỜI DÙNG)
  const handleDeleteRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    let hostUserId = null;
    try {
      const userString = localStorage.getItem("myflix_user");
      if (userString) {
        hostUserId = JSON.parse(userString).id;
      }
    } catch (e) {}

    if (confirm("⚠️ Bạn có chắc chắn muốn xóa phòng này không? Toàn bộ người xem sẽ bị mời ra ngoài.")) {
      socket.emit("delete_room", { roomId, hostUserId });
    }
  };

  return {
    rooms,
    showCreateModal, setShowCreateModal,
    roomName, setRoomName,
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    isSearching,
    selectedMovie, setSelectedMovie,
    handleCreateRoom, handleShareRoom, handleDeleteRoom
  };
}