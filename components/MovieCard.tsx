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
        w-full /* Đổi thành w-full để nó tự co giãn theo thẻ cha */
        h-full /* Thêm h-full */
        aspect-video
        rounded-md
        overflow-hidden
        transition-all
        duration-300
        hover:scale-105
        hover:z-50
        hover:shadow-2xl
        cursor-pointer
        bg-zinc-900
        group
      "
    >
      <img
        src={movie.poster}
        alt={movie.title}
        className="
          w-full
          h-full
          object-cover
          object-top
        "
      />

      {/* Nút X xóa khỏi lịch sử */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className="
            absolute
            top-2
            right-2
            z-50
            w-8
            h-8
            rounded-full
            bg-black/60
            text-white
            flex
            items-center
            justify-center
            opacity-0
            group-hover:opacity-100
            transition-opacity
            hover:bg-red-600
          "
          title="Xóa khỏi danh sách Đang xem"
        >
          ✕
        </button>
      )}

      <div
        className="
          absolute
          inset-0
          bg-gradient-to-t
          from-black/90
          via-black/40
          to-transparent
          opacity-0
          hover:opacity-100
          transition-opacity
          duration-300
          flex
          flex-col
          justify-end
          p-4
        "
      >
        <div>
          <h3 className="font-bold text-sm md:text-base text-white truncate drop-shadow-md">
            {movie.title}
          </h3>

          <p className="text-xs text-gray-300 mt-1 font-medium drop-shadow-md">
            <span className="text-green-500 font-bold mr-2">{movie.year}</span> 
            {movie.genre}
          </p>
        </div>
      </div>
    </div>
  );
}