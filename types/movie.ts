export interface Episode {
  name: string;
  slug: string;
  link_m3u8: string;
  link_embed: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  banner: string;
  poster: string;
  stream: string;
  year: number;
  duration: string;
  genre: string;
  progress?: number;
  lastTime?: number;
  country?: string;
  slug: string;
  episodes?: Episode[];
}