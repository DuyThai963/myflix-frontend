import { Movie } from "@/types/movie";

type Props = {
  movie: Movie;
  onClick: () => void;
  onRemove?: (e: React.MouseEvent) => void;
};

export default function MovieCard({ movie, onClick, onRemove }: Props) {
  return (
    <div
      onClick={onClick}
      className="
        relative
        w-full 
        aspect-[2/3] 
        rounded-md
        overflow-hidden
        transition-all
        duration-300
        /* Chỉ phóng to khi dùng chuột trên máy tính */
        @media(pointer:fine){hover:scale-105 hover:z-50 hover:shadow-2xl}
        cursor-pointer
        bg-zinc-900
        group
      "
    >
      {/* Poster phim */}
      <img
        src={movie.poster}
        alt={movie.title}
        className="w-full h-full object-cover object-top"
      />

      {/* Nút xóa - Class remove-btn để CSS điều khiển opacity */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className="
            remove-btn
            absolute top-2 right-2 z-50 w-8 h-8 rounded-full 
            bg-black/70 text-white flex items-center justify-center 
            transition-all duration-300 hover:bg-red-600 active:scale-90
          "
        >
          ✕
        </button>
      )}

      {/* Overlay thông tin - Class info-overlay để CSS điều khiển opacity */}
      <div
        className="
          info-overlay
          absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent
          transition-opacity duration-300 flex flex-col justify-end p-2.5
        "
      >
        <div className="transform transition-transform duration-300">
          <h3 className="font-bold text-[13px] md:text-sm text-white truncate leading-tight drop-shadow-lg">
            {movie.title}
          </h3>

          <p className="text-[10px] text-gray-300 mt-1 font-medium flex items-center gap-2">
            <span className="text-green-500 font-bold">{movie.year}</span> 
            <span className="opacity-60">|</span>
            <span className="truncate">{movie.genre}</span>
          </p>
        </div>
      </div>
    </div>
  );
}