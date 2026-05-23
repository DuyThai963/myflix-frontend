// 1. Thay link localhost bằng link Render của bạn
const BASE_URL = "https://dtmyflix.onrender.com/api";

const getImageUrl = (path: string) => {
  if (!path) return "https://placehold.co/600x400/18181b/ffffff?text=No+Image";
  if (path.startsWith("http")) return path;
  
  const cleanPath = path.replace(/^\/+/, '');
  
  if (cleanPath.startsWith('uploads/movies')) {
    return `https://img.ophim.live/${cleanPath}`;
  }
  return `https://img.ophim.live/uploads/movies/${cleanPath}`;
};

export const movieService = {
  getMovies: async () => {
    // Dùng BASE_URL
    const response = await fetch(`${BASE_URL}/home`);
    const data = await response.json();

    return data.data.items.map((movie: any) => ({
      id: movie._id,
      slug: movie.slug,
      title: movie.name,
      description: movie.origin_name || "No description",
      // Dùng hàm getImageUrl để fix lỗi ảnh trang chủ
      banner: getImageUrl(movie.thumb_url),
      poster: getImageUrl(movie.thumb_url),
      stream: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      year: movie.year,
      duration: movie.time,
      country: movie.country?.[0]?.name || "Unknown",
      genre: movie.category?.[0]?.name || "Unknown",
      episode_current: movie.episode_current,
      episode_total: movie.episode_total,
    }));
  },

  getMovieStream: async (slug: string) => {
    const response = await fetch(`${BASE_URL}/movie/${slug}`);
    const data = await response.json();
    const episodes = data?.episodes?.[0]?.server_data;

    if (!episodes?.length) return "";
    const latestEpisode = episodes[episodes.length - 1];
    return latestEpisode.link_m3u8 || "";
  },

  getMovieDetail: async (slug: string) => {
    try {
      const response = await fetch(`${BASE_URL}/movie/${slug}`);
      if (!response.ok) return null;
  
      const resData = await response.json();
      if (resData && resData.movie) {
        return {
          item: resData.movie,
          episodes: resData.episodes
        };
      }
      if (resData.data) return resData.data;
      return null;
    } catch (error) {
      console.error("Lỗi kết nối API Backend:", error);
      return null;
    }
  },

  searchMovies: async (keyword: string) => {
    try {
      const response = await fetch(`${BASE_URL}/search?keyword=${encodeURIComponent(keyword)}`);
      if (!response.ok) return [];

      const data = await response.json();
      if (!data?.data?.items) return [];

      return data.data.items.map((movie: any) => ({
        id: movie._id,
        slug: movie.slug,
        title: movie.name,
        description: movie.origin_name || "No description",
        banner: getImageUrl(movie.thumb_url),
        poster: getImageUrl(movie.thumb_url),
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

  getMoviesByCategory: async (slug: string, page: number = 1) => {
    try {
      const listSlugs = [
        "phim-moi", "phim-bo", "phim-le", "shows", "hoat-hinh", 
        "phim-vietsub", "phim-thuyet-minh", "phim-long-tieng", 
        "phim-bo-dang-chieu", "phim-bo-da-hoan-thanh", 
        "phim-sap-chieu", "phim-chieu-rap", "subteam"
      ];

      const endpoint = listSlugs.includes(slug) ? 'danh-sach' : 'the-loai';
      const response = await fetch(`${BASE_URL}/${endpoint}/${slug}?page=${page}`);
      
      if (!response.ok) return [];

      const data = await response.json();
      if (!data?.data?.items) return [];

      return data.data.items.map((movie: any) => ({
        id: movie._id,
        slug: movie.slug,
        title: movie.name,
        description: movie.origin_name || "No description",
        banner: getImageUrl(movie.thumb_url),
        poster: getImageUrl(movie.thumb_url),
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