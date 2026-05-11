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
      style={{ aspectRation: "2/3" }}
      className="
        relative
        w-full 
        aspect-[2/3] 
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
            transition-all
            md:opacity-0
            md:group-hover:opacity-100
            opacity-100
            hover:bg-red-600
            active:scale-90
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
          via-transparent
          to-transparent
          /* Mobile thì hiện luôn, Desktop thì mới cần hover */
          opacity-100 
          md:opacity-0
          md:group-hover:opacity-100
          transition-opacity
          duration-300
          flex
          flex-col
          justify-end
          p-2
        "
      >
        <div>
          <h3 className="font-bold text-sm text-white truncate drop-shadow-md">
            {movie.title}
          </h3>

          <p className="text-[10px] text-gray-300 mt-1 font-medium drop-shadow-md">
            <span className="text-green-500 font-bold mr-2">{movie.year}</span> 
            {movie.genre}
          </p>
        </div>
      </div>
    </div>
  );
}