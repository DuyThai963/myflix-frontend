import { Movie } from "@/types/movie";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NEXT_PUBLIC_BACKEND_URL ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api` : "http://localhost:5000/api");

const getActiveServerId = (): string => {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("myflix_selected_server") || "server_1";
    } catch {
      return "server_1";
    }
  }
  return "server_1";
};

const getImageUrl = (path: string) => {
  if (!path) return "https://placehold.co/600x400/18181b/ffffff?text=No+Image";
  return path;
};

export const movieService = {
  getMovies: async (serverId: string = getActiveServerId()): Promise<Movie[]> => {
    // 1. Gọi qua Next.js Proxy Route hỗ trợ 5 server
    try {
      const res = await fetch(`/api/proxy-movies?action=home&server=${serverId}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch (e) {
      // Bỏ qua lỗi để thử fallback
    }

    // 2. Fallback sang backend Render nếu proxy nội bộ gặp sự cố
    try {
      const response = await fetch(`${BASE_URL}/home`);
      if (!response.ok) return [];
      const data = await response.json();
      const items = data?.data?.items || data?.items || [];

      return items.map((movie: any) => ({
        id: movie._id || movie.id || movie.slug,
        slug: movie.slug,
        title: movie.name || movie.title,
        description: movie.origin_name || "No description",
        banner: getImageUrl(movie.banner || movie.tmdb_backdrop || movie.thumb_url || movie.poster_url),
        poster: getImageUrl(movie.poster || movie.poster_url || movie.thumb_url),
        stream: "",
        year: movie.year,
        duration: movie.time,
        country: movie.country?.[0]?.name || "Unknown",
        genre: movie.category?.[0]?.name || "Unknown",
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
      }));
    } catch (err) {
      console.error("Lỗi getMovies fallback:", err);
      return [];
    }
  },

  getMovieStream: async (slug: string) => {
    const response = await fetch(`${BASE_URL}/movie/${slug}`);
    const data = await response.json();
    const episodes = data?.episodes?.[0]?.server_data;

    if (!episodes?.length) return "";
    const latestEpisode = episodes[episodes.length - 1];
    return latestEpisode.link_m3u8 || "";
  },

  getMovieDetail: async (slug: string, serverId: string = getActiveServerId()) => {
    // 1. Ưu tiên gọi qua Internal Multi-Source Proxy Route (Hỗ trợ 5 Server Nguồn)
    try {
      const proxyRes = await fetch(`/api/proxy-movie?slug=${encodeURIComponent(slug)}&server=${serverId}`);
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json?.data) {
          return {
            item: json.data,
            movie: json.data,
            episodes: json.data.episodes || []
          };
        }
      }
    } catch (e) {
      // Fallback sang backend nếu proxy nội bộ gặp sự cố
    }

    // 2. Fallback sang backend Render hiện tại (/movie/:slug)
    try {
      const response = await fetch(`${BASE_URL}/movie/${slug}`);
      if (!response.ok) return null;
  
      const resData = await response.json();
      if (resData && resData.movie) {
        return {
          item: resData.movie,
          movie: resData.movie,
          episodes: resData.episodes
        };
      }
      if (resData.data) {
        return {
          ...resData.data,
          movie: resData.data.item || resData.data.movie,
          item: resData.data.item || resData.data.movie,
          episodes: resData.data.episodes || resData.episodes
        };
      }
      return null;
    } catch (error) {
      console.error("Lỗi kết nối API Backend:", error);
      return null;
    }
  },

  searchMovies: async (keyword: string, serverId: string = getActiveServerId()): Promise<Movie[]> => {
    if (!keyword.trim()) return [];

    // 1. Gọi qua Next.js Proxy Route hỗ trợ 5 server
    try {
      const res = await fetch(`/api/proxy-movies?action=search&keyword=${encodeURIComponent(keyword)}&server=${serverId}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      // Fallback
    }

    // 2. Fallback sang backend Render
    try {
      const response = await fetch(`${BASE_URL}/search?keyword=${encodeURIComponent(keyword)}`);
      if (!response.ok) return [];

      const data = await response.json();
      const items = data?.data?.items || data?.items || [];

      return items.map((movie: any) => ({
        id: movie._id || movie.id || movie.slug,
        slug: movie.slug,
        title: movie.name || movie.title,
        description: movie.origin_name || "No description",
        banner: getImageUrl(movie.banner || movie.tmdb_backdrop || movie.thumb_url || movie.poster_url),
        poster: getImageUrl(movie.poster || movie.poster_url || movie.thumb_url),
        stream: "",
        year: movie.year,
        duration: movie.time,
        country: movie.country?.[0]?.name || "Unknown",
        genre: movie.category?.[0]?.name || "Unknown",
        episode_current: movie.episode_current,
      }));
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
      return [];
    }
  },

  getMoviesByCategory: async (slug: string, page: number = 1, serverId: string = getActiveServerId()): Promise<Movie[]> => {
    // 1. Gọi qua Next.js Proxy Route hỗ trợ 5 server
    try {
      const res = await fetch(`/api/proxy-movies?action=category&slug=${encodeURIComponent(slug)}&page=${page}&server=${serverId}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      // Fallback
    }

    // 2. Fallback sang backend Render
    try {
      const listSlugs = [
        "phim-moi", "phim-bo", "phim-le", "shows", "tv-shows", "hoat-hinh", 
        "phim-vietsub", "phim-thuyet-minh", "phim-long-tieng", 
        "phim-bo-dang-chieu", "phim-bo-da-hoan-thanh", 
        "phim-sap-chieu", "phim-chieu-rap", "subteam"
      ];

      const endpoint = listSlugs.includes(slug) ? 'danh-sach' : 'the-loai';
      const response = await fetch(`${BASE_URL}/${endpoint}/${slug}?page=${page}`);
      
      if (!response.ok) return [];

      const data = await response.json();
      const items = data?.data?.items || data?.items || [];

      return items.map((movie: any) => ({
        id: movie._id || movie.id || movie.slug,
        slug: movie.slug,
        title: movie.name || movie.title,
        description: movie.origin_name || "No description",
        banner: getImageUrl(movie.banner || movie.tmdb_backdrop || movie.thumb_url || movie.poster_url),
        poster: getImageUrl(movie.poster || movie.poster_url || movie.thumb_url),
        stream: "",
        year: movie.year,
        duration: movie.time,
        country: movie.country?.[0]?.name || "Unknown",
        genre: movie.category?.[0]?.name || "Unknown",
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
      }));
    } catch (error) {
      console.error("Lỗi lấy phim:", error);
      return [];
    }
  }
};
