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

  // Hàm load dữ liệu từ localStorage
  const loadMyList = () => {
    try {
      const listData = localStorage.getItem("myflix_mylist");
      if (listData) {
        setMyList(JSON.parse(listData));
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

  // Lọc danh sách theo từ khóa search trên Navbar
  const filteredList = useMemo(() => {
    return myList.filter((movie) =>
      movie.title.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [myList, keyword]);

  return (
    <main className="bg-black min-h-screen text-white flex flex-col">
      <Navbar keyword={keyword} setKeyword={setKeyword} />

      <div className="flex-1 px-6 md:px-12 pt-32 pb-12">
        <h1 className="text-3xl font-bold mb-8">Danh sách của tôi</h1>

        {filteredList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredList.map((movie) => (
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
              {keyword 
                ? "Không tìm thấy phim nào khớp với từ khóa." 
                : "Hãy thêm những bộ phim bạn yêu thích vào đây nhé!"}
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