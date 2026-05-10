import { Movie } from "@/types/movie";

export const movies: Movie[] = [
  {
    id: 1,
    title: "Interstellar",
    description:
      "A team travels through a wormhole to save humanity.",
    banner:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
    poster:
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c",
    stream:
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    year: 2014,
    duration: "2h 49m",
    genre: "Sci-Fi",
  },

  {
    id: 2,
    title: "Batman",
    description:
      "Dark knight rises in Gotham city.",
    banner:
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1",
    poster:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26",
    stream:
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    year: 2022,
    duration: "2h 10m",
    genre: "Action",
  },
];