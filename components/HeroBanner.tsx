import { Movie } from "@/types/movie";
import { BsFillPlayFill } from "react-icons/bs";
import { AiOutlineInfoCircle } from "react-icons/ai";

type Props = {
  movie: Movie;
  onSelectMovie?: (movie: Movie) => void;
};

export default function HeroBanner({ movie, onSelectMovie }: Props) {
  const posterImg = movie.poster || movie.poster_url || movie.banner;
  const bannerImg = movie.banner || movie.thumb_url || movie.poster;

  return (
    <div className="relative h-[80vh] sm:h-[85vh] md:h-[88vh] w-full overflow-hidden bg-black select-none">
      {/* Responsive Image: Ảnh dọc cho màn hình điện thoại/dọc, ảnh ngang cho máy tính/ngang */}
      <picture className="w-full h-full block">
        {/* Màn hình điện thoại hoặc tỉ lệ dọc (portrait) -> Ưu tiên ảnh dọc (poster) */}
        <source
          media="(orientation: portrait), (max-width: 767px)"
          srcSet={posterImg}
        />
        {/* Màn hình máy tính hoặc tỉ lệ ngang (landscape) -> Dùng ảnh ngang (banner 16:9) */}
        <source
          media="(orientation: landscape) and (min-width: 768px)"
          srcSet={bannerImg}
        />
        <img
          src={bannerImg}
          alt={movie.title}
          className="w-full h-full object-cover object-center"
        />
      </picture>

      {/* Lớp phủ Gradient: Làm mờ tối hậu cảnh giúp chữ luôn rõ nét */}
      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent md:block hidden" />

      {/* Khối Thông tin và Nút Thao Tác */}
      <div className="absolute bottom-20 sm:bottom-28 md:bottom-32 left-5 sm:left-8 md:left-12 right-5 md:right-auto max-w-xl z-10">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black mb-3 md:mb-5 leading-tight text-white drop-shadow-lg">
          {movie.title}
        </h1>

        {movie.origin_name && (
          <p className="text-xs sm:text-sm text-zinc-400 mb-2 font-medium italic">
            {movie.origin_name} {movie.year ? `(${movie.year})` : ""}
          </p>
        )}

        <p className="text-xs sm:text-sm md:text-base text-gray-300 mb-5 md:mb-6 line-clamp-3 md:line-clamp-none leading-relaxed drop-shadow">
          {movie.description}
        </p>

        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => onSelectMovie?.(movie)}
            className="group flex items-center justify-center gap-2 bg-white text-black px-6 sm:px-8 py-2.5 sm:py-3 rounded-md transition-all duration-200 hover:bg-zinc-200 active:scale-95 cursor-pointer font-bold border-none outline-none shadow-xl"
          >
            <BsFillPlayFill size={26} className="text-black" />
            <span className="text-sm sm:text-base uppercase tracking-wider">Play</span>
          </button>

          <button 
            onClick={() => onSelectMovie?.(movie)}
            className="flex items-center justify-center gap-2 bg-zinc-600/70 hover:bg-zinc-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-md font-semibold transition backdrop-blur-sm active:scale-95 cursor-pointer text-sm sm:text-base"
          >
            <AiOutlineInfoCircle size={20} />
            <span>More Info</span>
          </button>
        </div>
      </div>

      {/* Hiệu ứng chuyển mềm đáy Banner vào danh sách phim */}
      <div className="absolute bottom-0 left-0 w-full h-32 md:h-44 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
    </div>
  );
}