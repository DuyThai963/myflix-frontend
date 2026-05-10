const API_URL = "http://localhost:5000/api/home";
const getImageUrl = (path: string) => {
  if (!path) return "https://placehold.co/600x400/18181b/ffffff?text=No+Image";
  if (path.startsWith("http")) return path; // Nếu đã có sẵn https:// thì dùng luôn
  
  // Xóa dấu / ở đầu nếu có để tránh lỗi double slash
  const cleanPath = path.replace(/^\/+/, '');
  
  // Chốt cứng domain ảnh của OPhim để khỏi phụ thuộc vào biến API trả về
  if (cleanPath.startsWith('uploads/movies')) {
    return `https://img.ophim.live/${cleanPath}`;
  }
  return `https://img.ophim.live/uploads/movies/${cleanPath}`;
};

export const movieService = {
  getMovies: async () => {
    const response = await fetch(API_URL);

    const data = await response.json();

    const imageBase =
      data.data.APP_DOMAIN_CDN_IMAGE;

    return data.data.items.map((movie: any) => ({
      id: movie._id,

      slug: movie.slug,

      title: movie.name,

      description:
        movie.origin_name ||
        "No description",

      banner: `${imageBase}/uploads/movies/${movie.thumb_url}`,

      poster: `${imageBase}/uploads/movies/${movie.thumb_url}`,

      stream:
        "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",

      year: movie.year,

      duration: movie.time,

      country:
        movie.country?.[0]?.name ||
        "Unknown",

      genre:
        movie.category?.[0]?.name ||
        "Unknown",
    }));
  },

  getMovieStream: async (
    slug: string
  ) => {
    const response = await fetch(
      `http://localhost:5000/api/movie/${slug}`
    );

    const data = await response.json();

    const episodes =
      data?.episodes?.[0]?.server_data;

    if (!episodes?.length) return "";

    const latestEpisode =
      episodes[episodes.length - 1];

    return latestEpisode.link_m3u8 || "";
  },

  getMovieDetail: async (slug: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/movie/${slug}`);
      
      if (!response.ok) {
        console.error("Lỗi HTTP Status:", response.status);
        return null;
      }
  
      const resData = await response.json();
      
      // JSON của ông gửi là { status: true, movie: {...}, episodes: [...] }
      // KHÔNG CÓ bọc 'data', nên ta lấy trực tiếp:
      if (resData && resData.movie) {
        return {
          item: resData.movie,
          episodes: resData.episodes
        };
      }
  
      // Nếu server ông vẫn bọc trong 'data' thì dùng cái này dự phòng
      if (resData.data) return resData.data;
  
      return null;
    } catch (error) {
      console.error("Lỗi kết nối API Backend:", error);
      return null;
    }
  },

  searchMovies: async (keyword: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/search?keyword=${encodeURIComponent(keyword)}`);
      if (!response.ok) return [];

      const data = await response.json();
      if (!data?.data?.items) return [];

      return data.data.items.map((movie: any) => ({
        id: movie._id,
        slug: movie.slug,
        title: movie.name,
        description: movie.origin_name || "No description",
        // Dùng hàm getImageUrl bọc thumb_url lại
        banner: getImageUrl(movie.thumb_url),
        poster: getImageUrl(movie.thumb_url),
        stream: "",
        year: movie.year,
        duration: movie.time,
        country: movie.country?.[0]?.name || "Unknown",
        genre: movie.category?.[0]?.name || "Unknown",
      }));
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
      return [];
    }
  },

  getMoviesByCategory: async (slug: string, page: number = 1) => {
    try {
      // Danh sách các slug thuộc endpoint /danh-sach/ (Dựa trên menu OPhim)
      const listSlugs = [
        "phim-moi", 
        "phim-bo", 
        "phim-le", 
        "shows", 
        "hoat-hinh", 
        "phim-vietsub", 
        "phim-thuyet-minh", 
        "phim-long-tieng", 
        "phim-bo-dang-chieu", 
        "phim-bo-da-hoan-thanh", 
        "phim-sap-chieu", 
        "phim-chieu-rap",
        "subteam"
      ];

      // Tự động chọn endpoint đúng
      const endpoint = listSlugs.includes(slug) ? 'danh-sach' : 'the-loai';
      
      const response = await fetch(`http://localhost:5000/api/${endpoint}/${slug}?page=${page}`);
      
      if (!response.ok) {
        console.error(`Lỗi API: ${response.status}`);
        return [];
      }

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
      }));
    } catch (error) {
      console.error("Lỗi lấy phim:", error);
      return [];
    }
  }
};