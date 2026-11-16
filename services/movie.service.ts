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

// ⚡ BỘ ĐỆM RAM TRÌNH DUYỆT (Client-side In-Memory Cache): Tải lại trang/đổi tab tức thì 0ms
const clientMemoryCache = new Map<string, { data: any; expiry: number }>();
const CLIENT_CACHE_TTL = 8 * 60 * 1000; // 8 phút

const getFromClientCache = (key: string) => {
  const item = clientMemoryCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
};

const setInClientCache = (key: string, data: any, ttlMs: number = CLIENT_CACHE_TTL) => {
  if (!data) return;
  clientMemoryCache.set(key, { data, expiry: Date.now() + ttlMs });
  if (clientMemoryCache.size > 250) {
    const firstKey = clientMemoryCache.keys().next().value;
    if (firstKey) clientMemoryCache.delete(firstKey);
  }
};

export const movieService = {
  getMovies: async (serverId: string = getActiveServerId()): Promise<Movie[]> => {
    const cacheKey = `home_${serverId}`;
    const cached = getFromClientCache(cacheKey);
    if (cached) return cached;

    // 1. Gọi qua Next.js Proxy Route hỗ trợ 5 server
    try {
      const res = await fetch(`/api/proxy-movies?action=home&server=${serverId}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          setInClientCache(cacheKey, json.data);
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

      const result = items.map((movie: any) => ({
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

      if (result.length > 0) setInClientCache(cacheKey, result);
      return result;
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
    const cacheKey = `detail_${serverId}_${slug}`;
    const cached = getFromClientCache(cacheKey);
    if (cached) return cached;

    // 1. Ưu tiên gọi qua Internal Multi-Source Proxy Route (Hỗ trợ 5 Server Nguồn)
    try {
      const proxyRes = await fetch(`/api/proxy-movie?slug=${encodeURIComponent(slug)}&server=${serverId}`);
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json?.data) {
          const detail = {
            item: json.data,
            movie: json.data,
            episodes: json.data.episodes || []
          };
          setInClientCache(cacheKey, detail);
          return detail;
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
        const detail = {
          item: resData.movie,
          movie: resData.movie,
          episodes: resData.episodes
        };
        setInClientCache(cacheKey, detail);
        return detail;
      }
      if (resData.data) {
        const detail = {
          ...resData.data,
          movie: resData.data.item || resData.data.movie,
          item: resData.data.item || resData.data.movie,
          episodes: resData.data.episodes || resData.episodes
        };
        setInClientCache(cacheKey, detail);
        return detail;
      }
      return null;
    } catch (error) {
      console.error("Lỗi kết nối API Backend:", error);
      return null;
    }
  },

  searchMovies: async (keyword: string, serverId: string = getActiveServerId()): Promise<Movie[]> => {
    const cleanKey = keyword.trim();
    if (!cleanKey) return [];

    const cacheKey = `search_${serverId}_${cleanKey.toLowerCase()}`;
    const cached = getFromClientCache(cacheKey);
    if (cached) return cached;

    // 1. Gọi qua Next.js Proxy Route hỗ trợ 5 server
    try {
      const res = await fetch(`/api/proxy-movies?action=search&keyword=${encodeURIComponent(cleanKey)}&server=${serverId}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setInClientCache(cacheKey, json.data, 2 * 60 * 1000); // 2 phút cho search
          return json.data;
        }
      }
    } catch (e) {
      // Fallback
    }

    // 2. Fallback sang backend Render
    try {
      const response = await fetch(`${BASE_URL}/search?keyword=${encodeURIComponent(cleanKey)}`);
      if (!response.ok) return [];

      const data = await response.json();
      const items = data?.data?.items || data?.items || [];

      const result = items.map((movie: any) => ({
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

      setInClientCache(cacheKey, result, 2 * 60 * 1000);
      return result;
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
      return [];
    }
  },

  getMoviesByCategory: async (slug: string, page: number = 1, serverId: string = getActiveServerId()): Promise<Movie[]> => {
    const cacheKey = `cat_${serverId}_${slug}_${page}`;
    const cached = getFromClientCache(cacheKey);
    if (cached) return cached;

    // 1. Gọi qua Next.js Proxy Route hỗ trợ 5 server
    try {
      const res = await fetch(`/api/proxy-movies?action=category&slug=${encodeURIComponent(slug)}&page=${page}&server=${serverId}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setInClientCache(cacheKey, json.data);
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

      const result = items.map((movie: any) => ({
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

      if (result.length > 0) setInClientCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Lỗi lấy phim:", error);
      return [];
    }
  }
};
