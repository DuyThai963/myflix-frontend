/**
 * Architecture: Strategy & Adapter Pattern for Movie Providers
 * 
 * Thứ tự các Server nguồn phim chuẩn (KKPhim làm nguồn chính 100%):
 * 1. Server 1: KKPhim (https://phimapi.com - PhimAPI 200 OK) -> NGUỒN CHÍNH MẶC ĐỊNH
 * 2. Server 2: VsMov (https://vsmov.com/api - Embed: streamvsmov.com 200 OK)
 * 3. Server 3: VodPhim (https://api.xink.pro/api/content - Embed: playembed.vip 200 OK)
 * 4. Server 4: OPhim (https://ophim1.com - Server dự phòng / ngừng hoạt động)
 */

import { Movie } from "@/types/movie";

export type UnifiedEpisodeItem = {
  name: string;
  slug: string;
  link_embed: string;
  link_m3u8: string;
};

export type UnifiedServer = {
  server_name: string;
  server_data: UnifiedEpisodeItem[];
};

export type UnifiedMovieDetail = {
  id: string;
  slug: string;
  name: string;
  title: string;
  origin_name: string;
  poster: string;
  poster_url: string;
  thumb_url: string;
  banner: string;
  year: number | string;
  duration: string;
  quality: string;
  language: string;
  description: string;
  category: string;
  country: string;
  episodes: UnifiedServer[];
};

export interface MovieSourceParser {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly code: string;
  readonly type: 'type1' | 'type2';
  readonly baseUrl: string;

  getHomeUrl(page?: number): string;
  getListUrl(slug: string, page?: number): string;
  getSearchUrl(keyword: string, page?: number): string;
  getDetailUrl(slug: string): string;

  parseList(rawJson: any): Movie[];
  parse(rawJson: any): UnifiedMovieDetail | null;
}

/**
 * ========================================================
 * HỌ 1: TYPE 1 PARSER (Dành cho parser items, ep.embed)
 * ========================================================
 */
export abstract class Type1Parser implements MovieSourceParser {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly shortName: string;
  abstract readonly code: string;
  abstract readonly baseUrl: string;
  readonly type = 'type1' as const;

  getHomeUrl(page: number = 1): string {
    return `${this.baseUrl}/api/films/phim-moi-cap-nhat?page=${page}`;
  }

  getListUrl(slug: string, page: number = 1): string {
    const listSlugs = [
      "phim-bo", "phim-le", "hoat-hinh", "tv-shows", "shows", 
      "phim-dang-chieu", "phim-chieu-rap"
    ];
    if (listSlugs.includes(slug)) {
      return `${this.baseUrl}/api/films/danh-sach/${slug}?page=${page}`;
    }
    return `${this.baseUrl}/api/films/the-loai/${slug}?page=${page}`;
  }

  getSearchUrl(keyword: string, page: number = 1): string {
    return `${this.baseUrl}/api/films/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
  }

  getDetailUrl(slug: string): string {
    return `${this.baseUrl}/api/film/${slug}`;
  }

  parseList(rawJson: any): Movie[] {
    if (!rawJson) return [];
    const items = rawJson.items || rawJson.data?.items || (Array.isArray(rawJson.data) ? rawJson.data : []);
    if (!Array.isArray(items)) return [];

    return items.map((item: any) => {
      let categoryStr = "Phim";
      if (Array.isArray(item.category)) {
        categoryStr = item.category.map((c: any) => c.name || c).filter(Boolean).join(", ");
      } else if (item.category && typeof item.category === "object") {
        categoryStr = Object.values(item.category).map((c: any) => c.name || c).filter(Boolean).join(", ");
      } else if (typeof item.category === "string") {
        categoryStr = item.category;
      }

      let countryStr = "Quốc tế";
      if (Array.isArray(item.country)) {
        countryStr = item.country.map((c: any) => c.name || c).filter(Boolean).join(", ");
      } else if (item.country && typeof item.country === "object") {
        countryStr = Object.values(item.country).map((c: any) => c.name || c).filter(Boolean).join(", ");
      } else if (typeof item.country === "string") {
        countryStr = item.country;
      }

      const poster = item.poster_url || item.thumb_url || "";
      const banner = item.thumb_url || item.poster_url || "";

      return {
        id: item.slug || item.id || item._id || "",
        _id: item._id || item.id || item.slug || "",
        slug: item.slug || "",
        title: item.name || item.title || "",
        name: item.name || item.title || "",
        description: item.original_name || item.description || "Chưa có mô tả",
        origin_name: item.original_name || "",
        banner,
        poster,
        thumb_url: banner,
        poster_url: poster,
        stream: "",
        year: Number(item.year) || new Date().getFullYear(),
        duration: item.time || "",
        country: countryStr,
        genre: categoryStr,
        episode_current: item.current_episode || "Full",
        episode_total: String(item.total_episodes || "")
      };
    });
  }

  parse(rawJson: any): UnifiedMovieDetail | null {
    if (!rawJson) return null;
    const movie = rawJson.movie || rawJson.film || rawJson.data?.movie || rawJson.data?.film || rawJson.data?.item || rawJson.item || {};
    const rawEpisodes = rawJson.episodes || rawJson.data?.episodes || movie.episodes || [];

    const episodes: UnifiedServer[] = (Array.isArray(rawEpisodes) ? rawEpisodes : []).map((server: any) => {
      const items = server.items || server.server_data || [];
      return {
        server_name: server.server_name || server.name || "Vietsub #1",
        server_data: (Array.isArray(items) ? items : []).map((ep: any) => ({
          name: ep.name || "Full",
          slug: ep.slug || String(ep.name || "").toLowerCase().replace(/\s+/g, "-"),
          link_embed: ep.embed || ep.link_embed || "",
          link_m3u8: ep.m3u8 || ep.link_m3u8 || ""
        }))
      };
    });

    const poster = movie.poster_url || movie.poster || movie.thumb_url || "";
    const banner = movie.thumb_url || movie.banner || movie.poster_url || "";

    let categoryNames = "Phim";
    if (Array.isArray(movie.category)) {
      categoryNames = movie.category.map((c: any) => c.name || c).join(", ");
    } else if (movie.category && typeof movie.category === "object") {
      categoryNames = Object.values(movie.category).map((c: any) => c.name || c).join(", ");
    } else if (typeof movie.category === "string") {
      categoryNames = movie.category;
    }

    let countryNames = "Quốc tế";
    if (Array.isArray(movie.country)) {
      countryNames = movie.country.map((c: any) => c.name || c).join(", ");
    } else if (movie.country && typeof movie.country === "object") {
      countryNames = Object.values(movie.country).map((c: any) => c.name || c).join(", ");
    } else if (typeof movie.country === "string") {
      countryNames = movie.country;
    }

    return {
      id: movie.id || movie._id || movie.slug || "",
      slug: movie.slug || "",
      name: movie.name || movie.title || "",
      title: movie.name || movie.title || "",
      origin_name: movie.original_name || movie.origin_name || "",
      poster,
      poster_url: poster,
      thumb_url: banner,
      banner,
      year: movie.year || new Date().getFullYear(),
      duration: movie.time || movie.duration || movie.total_episodes || "",
      quality: movie.quality || "HD",
      language: movie.language || "Vietsub",
      description: movie.description || movie.content || "",
      category: categoryNames,
      country: countryNames,
      episodes
    };
  }
}

/**
 * ========================================================
 * HỌ 2: TYPE 2 PARSER (Dành cho Server 1: VsMov, Server 2: VodPhim, Server 3: KKPhim)
 * Cấu trúc: episodes[].server_data, ep.link_embed, ep.link_m3u8
 * ========================================================
 */
export abstract class Type2Parser implements MovieSourceParser {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly shortName: string;
  abstract readonly code: string;
  abstract readonly baseUrl: string;
  readonly type = 'type2' as const;
  abstract readonly cdnImage: string;

  getHomeUrl(page: number = 1): string {
    return `${this.baseUrl}/danh-sach/phim-moi-cap-nhat?page=${page}`;
  }

  getListUrl(slug: string, page: number = 1): string {
    const listSlugs = [
      "phim-bo", "phim-le", "hoat-hinh", "tv-shows", "shows", 
      "phim-moi", "phim-chieu-rap", "phim-dang-chieu", "subteam"
    ];
    const endpoint = listSlugs.includes(slug) ? "danh-sach" : "the-loai";
    return `${this.baseUrl}/v1/api/${endpoint}/${slug}?page=${page}`;
  }

  getSearchUrl(keyword: string, page: number = 1): string {
    return `${this.baseUrl}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`;
  }

  getDetailUrl(slug: string): string {
    return `${this.baseUrl}/phim/${slug}`;
  }

  protected resolveImageUrl(path?: string, cdnFallback?: string): string {
    if (!path) return "https://placehold.co/600x400/18181b/ffffff?text=No+Image";
    if (typeof path !== "string") return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const cdn = (cdnFallback || this.cdnImage || "").replace(/\/+$/, "");
    const cleanPath = path.replace(/^\/+/, "");
    return cdn ? `${cdn}/${cleanPath}` : path;
  }

  parseList(rawJson: any): Movie[] {
    if (!rawJson) return [];
    const items = rawJson.data?.items || rawJson.items || (Array.isArray(rawJson.data) ? rawJson.data : []);
    if (!Array.isArray(items)) return [];

    const cdn = rawJson.data?.APP_DOMAIN_CDN_IMAGE || rawJson.pathImage || this.cdnImage;

    return items.map((item: any) => {
      const poster = this.resolveImageUrl(item.poster_url || item.poster || item.thumb_url, cdn);
      const thumb = this.resolveImageUrl(item.thumb_url || item.banner || item.poster_url, cdn);

      const categoryNames = Array.isArray(item.category)
        ? item.category.map((c: any) => (typeof c === "object" ? c.name : c)).filter(Boolean).join(", ")
        : (item.category || "Phim");

      const countryNames = Array.isArray(item.country)
        ? item.country.map((c: any) => (typeof c === "object" ? c.name : c)).filter(Boolean).join(", ")
        : (item.country || "Quốc tế");

      return {
        id: item._id || item.id || item.slug || "",
        _id: item._id || item.id || item.slug || "",
        slug: item.slug || "",
        title: item.name || item.title || "",
        name: item.name || item.title || "",
        description: item.origin_name || item.description || "Chưa có mô tả",
        origin_name: item.origin_name || "",
        banner: thumb,
        poster,
        thumb_url: thumb,
        poster_url: poster,
        stream: "",
        year: Number(item.year) || new Date().getFullYear(),
        duration: item.time || "",
        country: countryNames,
        genre: categoryNames,
        episode_current: item.episode_current || "Full",
        episode_total: String(item.episode_total || "")
      };
    });
  }

  parse(rawJson: any): UnifiedMovieDetail | null {
    if (!rawJson) return null;
    const movie = rawJson.movie || rawJson.data?.movie || rawJson.item || rawJson.data?.item || {};
    const rawEpisodes = rawJson.episodes || rawJson.data?.episodes || movie.episodes || [];

    const episodes: UnifiedServer[] = (Array.isArray(rawEpisodes) ? rawEpisodes : []).map((server: any) => {
      const serverData = server.server_data || server.items || [];
      return {
        server_name: server.server_name || "Vietsub #1",
        server_data: (Array.isArray(serverData) ? serverData : []).map((ep: any) => ({
          name: ep.name || "Full",
          slug: ep.slug || String(ep.name || "").toLowerCase().replace(/\s+/g, "-"),
          link_embed: ep.link_embed || ep.embed || "",
          link_m3u8: ep.link_m3u8 || ep.m3u8 || ""
        }))
      };
    });

    const cdn = rawJson.data?.APP_DOMAIN_CDN_IMAGE || rawJson.pathImage || this.cdnImage;
    const poster = this.resolveImageUrl(movie.poster_url || movie.poster || movie.thumb_url, cdn);
    const thumb = this.resolveImageUrl(movie.thumb_url || movie.poster_url, cdn);

    const categoryNames = Array.isArray(movie.category) 
      ? movie.category.map((c: any) => (typeof c === "object" ? c.name : c)).filter(Boolean).join(", ") 
      : (movie.category || "Phim");

    const countryNames = Array.isArray(movie.country)
      ? movie.country.map((c: any) => (typeof c === "object" ? c.name : c)).filter(Boolean).join(", ") 
      : (movie.country || "Quốc tế");

    return {
      id: movie.id || movie._id || movie.slug || "",
      slug: movie.slug || "",
      name: movie.name || movie.title || "",
      title: movie.name || movie.title || "",
      origin_name: movie.original_name || movie.origin_name || "",
      poster,
      poster_url: poster,
      thumb_url: thumb,
      banner: thumb || poster,
      year: movie.year || new Date().getFullYear(),
      duration: movie.time || movie.duration || movie.episode_total || "",
      quality: movie.quality || "HD",
      language: movie.language || movie.episode_current || "Vietsub",
      description: movie.description || movie.content || "",
      category: categoryNames,
      country: countryNames,
      episodes
    };
  }
}

// 1. Server 1: KKPhim (https://phimapi.com - PhimAPI - Nguồn chính 100%)
export class KKPhimParser extends Type2Parser {
  readonly id = "server_1";
  readonly name = "Server 1 (KKPhim)";
  readonly shortName = "Server 1";
  readonly code = "kkphim";
  readonly baseUrl = "https://phimapi.com";
  readonly cdnImage = "https://phimimg.com";

  override getHomeUrl(page: number = 1): string {
    return `${this.baseUrl}/danh-sach/phim-moi-cap-nhat?page=${page}`;
  }

  override getListUrl(slug: string, page: number = 1): string {
    const listSlugs = [
      "phim-bo", "phim-le", "hoat-hinh", "tv-shows", "shows", 
      "phim-moi", "phim-chieu-rap", "phim-dang-chieu", "subteam"
    ];
    const endpoint = listSlugs.includes(slug) ? "danh-sach" : "the-loai";
    return `${this.baseUrl}/v1/api/${endpoint}/${slug}?page=${page}`;
  }

  override getSearchUrl(keyword: string, page: number = 1): string {
    return `${this.baseUrl}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`;
  }

  override getDetailUrl(slug: string): string {
    return `${this.baseUrl}/phim/${slug}`;
  }
}

// 2. Server 2: VsMov (https://vsmov.com/api - Embed: streamvsmov.com 200 OK)
export class VsMovParser extends Type2Parser {
  readonly id = "server_2";
  readonly name = "Server 2 (VsMov)";
  readonly shortName = "Server 2";
  readonly code = "vsmov";
  readonly baseUrl = "https://vsmov.com/api";
  readonly cdnImage = "https://nguon.vsphim.com/storage/images/";

  override getHomeUrl(page: number = 1): string {
    return `${this.baseUrl}/danh-sach/phim-moi-cap-nhat?page=${page}`;
  }

  override getListUrl(slug: string, page: number = 1): string {
    // 1. Nhóm danh sách chuẩn trên VsMov:
    const danhSachSlugs = [
      "phim-chieu-rap", "phim-bo", "phim-le", "subteam", "thuyet-minh", "long-tieng", "4k"
    ];
    if (danhSachSlugs.includes(slug)) {
      return `${this.baseUrl}/danh-sach/${slug}?page=${page}`;
    }
    if (slug === "phim-moi" || slug === "phim-moi-cap-nhat") {
      return `${this.baseUrl}/danh-sach/phim-moi-cap-nhat?page=${page}`;
    }
    if (slug === "phim-dang-chieu" || slug === "dang-chieu") {
      return `${this.baseUrl}/danh-sach/dang-chieu?page=${page}`;
    }

    // 2. Nhóm thể loại đặc biệt trên VsMov:
    if (slug === "hoat-hinh") {
      return `${this.baseUrl}/the-loai/hoat-hinh?page=${page}`;
    }
    if (slug === "tv-shows" || slug === "shows") {
      return `${this.baseUrl}/the-loai/truyen-hinh-thuc-te?page=${page}`;
    }

    // 3. Các thể loại còn lại (hanh-dong, kinh-di, co-trang...):
    return `${this.baseUrl}/the-loai/${slug}?page=${page}`;
  }

  override getSearchUrl(keyword: string, page: number = 1): string {
    return `${this.baseUrl}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`;
  }

  override getDetailUrl(slug: string): string {
    return `${this.baseUrl}/phim/${slug}`;
  }
}

// 3. Server 3: VodPhim (https://api.xink.pro/api/content - Embed: playembed.vip 200 OK)
export class VodPhimParser extends Type2Parser {
  readonly id = "server_3";
  readonly name = "Server 3 (VodPhim)";
  readonly shortName = "Server 3";
  readonly code = "vodphim";
  readonly baseUrl = "https://api.xink.pro/api/content";
  readonly cdnImage = "";

  override getHomeUrl(page: number = 1): string {
    return `${this.baseUrl}/danh-sach/phim?type=latest&page=${page}`;
  }

  override getListUrl(slug: string, page: number = 1): string {
    // 1. Phân loại theo Types trên VodPhim:
    if (slug === "phim-chieu-rap") {
      return `${this.baseUrl}/danh-sach/phim?type=theater&page=${page}`;
    }
    if (slug === "phim-bo") {
      return `${this.baseUrl}/danh-sach/phim?type=tv&page=${page}`;
    }
    if (slug === "phim-le") {
      return `${this.baseUrl}/danh-sach/phim?type=single&page=${page}`;
    }
    if (slug === "phim-dang-chieu" || slug === "dang-chieu") {
      return `${this.baseUrl}/danh-sach/phim?type=ongoing&page=${page}`;
    }
    if (slug === "phim-moi" || slug === "phim-moi-cap-nhat") {
      return `${this.baseUrl}/danh-sach/phim?type=latest&page=${page}`;
    }

    // 2. Phân loại theo Thể loại trên VodPhim:
    if (slug === "tv-shows" || slug === "shows") {
      return `${this.baseUrl}/danh-sach/phim?category=chuong-trinh-truyen-hinh&page=${page}`;
    }

    // 3. Các thể loại còn lại (hanh-dong, kinh-di, hoat-hinh, co-trang...):
    return `${this.baseUrl}/danh-sach/phim?category=${slug}&page=${page}`;
  }

  override getSearchUrl(keyword: string, page: number = 1): string {
    return `${this.baseUrl}/danh-sach/phim?q=${encodeURIComponent(keyword)}&page=${page}`;
  }

  override getDetailUrl(slug: string): string {
    return `${this.baseUrl}/phim/${slug}`;
  }
}

// 4. Server 4: OPhim (Dự phòng)
export class OPhimParser extends Type2Parser {
  readonly id = "server_4";
  readonly name = "Server 4 (OPhim)";
  readonly shortName = "Server 4";
  readonly code = "ophim";
  readonly baseUrl = "https://ophim1.com";
  readonly cdnImage = "https://img.ophim.live";

  override getListUrl(slug: string, page: number = 1): string {
    const listSlugs = [
      "phim-bo", "phim-le", "hoat-hinh", "tv-shows", "shows", 
      "phim-moi", "phim-chieu-rap", "phim-dang-chieu", "subteam"
    ];
    const endpoint = listSlugs.includes(slug) ? "danh-sach" : "the-loai";
    return `${this.baseUrl}/v1/api/${endpoint}/${slug}?page=${page}`;
  }
}

/**
 * ========================================================
 * REGISTRY DANH SÁCH 3 SERVERS HOẠT ĐỘNG CHÍNH THỨC:
 * 1. Server 1: KKPhim (phimapi.com - PhimAPI 200 OK) -> NGUỒN CHÍNH MẶC ĐỊNH
 * 2. Server 2: VsMov (vsmov.com - StreamVsMov 200 OK)
 * 3. Server 3: VodPhim (api.xink.pro - PlayEmbed.vip 200 OK)
 * ========================================================
 */
export const MOVIE_SERVERS: MovieSourceParser[] = [
  new KKPhimParser(),  // 1. KKPhim (Nguồn chính 100%)
  new VsMovParser(),   // 2. VsMov
  new VodPhimParser(), // 3. VodPhim
];

export const getParserById = (id: string): MovieSourceParser => {
  return MOVIE_SERVERS.find((s) => s.id === id || s.code === id) || MOVIE_SERVERS[0];
};
