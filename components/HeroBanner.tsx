import { Movie } from "@/types/movie";

type Props = {
  movie: Movie;
};

export default function HeroBanner({ movie }: Props) {
  return (
    <div className="relative h-[85vh] w-full">
      <img
        src={movie.banner}
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />

      <div className="absolute bottom-32 left-6 md:left-12 max-w-xl">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          {movie.title}
        </h1>

        <p className="text-sm md:text-lg text-gray-300 mb-6">
          {movie.description}
        </p>

        <div className="flex gap-4">
          <button className="bg-white text-black px-6 py-3 rounded font-semibold hover:bg-gray-300">
            ▶ Play
          </button>

          <button className="bg-gray-500/70 px-6 py-3 rounded font-semibold hover:bg-gray-500">
            More Info
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}