"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { Movie } from "@/types/movie";
import { useEffect, useState, useMemo } from "react";

export default function MyList() {
  const [myList, setMyList] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [keyword, setKeyword] = useState("");
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Hàm load dữ liệu từ localStorage
  const loadMyList = () => {
    try {
      const listData = localStorage.getItem("myflix_mylist");
      if (listData) {
        let parsedList = JSON.parse(listData);
        if (parsedList.length > 20) {
          parsedList = parsedList.slice(0, 20);
          localStorage.setItem("myflix_mylist", JSON.stringify(parsedList));
        }
        
        setMyList(parsedList);
      } else {
        setMyList([]);
      }
    } catch (e) {
      console.error("Lỗi đọc My List", e);
    }
  };

  useEffect(() => {
    loadMyList();

    // Lắng nghe sự kiện để update nếu có thay đổi từ Modal hoặc tab khác
    const handleStorageChange = () => loadMyList();
    window.addEventListener("myflix_mylist_updated", handleStorageChange);

    return () => {
      window.removeEventListener("myflix_mylist_updated", handleStorageChange);
    };
  }, []);

  // Xử lý xóa phim ngay trên trang My List
  const handleRemoveFromList = (movieId: string | number) => {
    try {
      const listData = localStorage.getItem("myflix_mylist");
      if (listData) {
        let list = JSON.parse(listData);
        list = list.filter((m: any) => m.id !== movieId);
        localStorage.setItem("myflix_mylist", JSON.stringify(list));
        loadMyList(); // Cập nhật lại UI
        window.dispatchEvent(new Event("myflix_mylist_updated"));
      }
    } catch (e) {
      console.error("Lỗi xóa khỏi My List", e);
    }
  };

  return (
    <main className="bg-black min-h-screen text-white flex flex-col">
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      <div className="flex-1 px-6 md:px-12 pt-32 pb-12">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Danh sách của tôi
          </h1>
          
          {myList.length > 0 && (
            <>
              {!isConfirmingClear ? (
                <button
                  onClick={() => setIsConfirmingClear(true)}
                  className="px-4 py-2 text-xs md:text-sm font-semibold text-zinc-400 hover:text-red-500 bg-zinc-900/60 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/50 rounded-md transition duration-200 cursor-pointer"
                >
                  🗑️ Xóa tất cả
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-xs text-zinc-500 font-medium">Bạn chắc chắn chứ?</span>
                  <button
                    onClick={() => {
                      try {
                        localStorage.removeItem("myflix_mylist");
                        setMyList([]);
                        setIsConfirmingClear(false);
                        window.dispatchEvent(new Event("myflix_mylist_updated"));
                      } catch (e) {
                        console.error("Lỗi khi xóa tất cả My List", e);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold uppercase bg-red-600 hover:bg-red-700 text-white rounded transition cursor-pointer"
                  >
                    Có, xóa hết
                  </button>
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="px-3 py-1.5 text-xs font-bold uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {myList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {myList.map((movie) => (
              <div key={movie.id} className="w-full">
                <MovieCard
                  movie={movie}
                  onClick={() => setSelectedMovie(movie)}
                  onRemove={() => handleRemoveFromList(movie.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 py-20">
            <span className="text-6xl mb-4">🎬</span>
            <p className="text-xl">Danh sách của bạn đang trống.</p>
            <p className="text-sm mt-2">
              Hãy thêm những bộ phim bạn yêu thích vào đây nhé!
            </p>
          </div>
        )}
      </div>

      <MovieModal
        movie={selectedMovie}
        onClose={() => {
          setSelectedMovie(null);
          // Load lại phòng trường hợp bạn ấn Bỏ lưu ngay trong Modal
          loadMyList();
        }}
      />

      <Footer />
    </main>
  );
}