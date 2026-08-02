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
  episode_current: string;
  episode_total: string;
  currentTime?: number;
  watchId_db?: string;
  serverName?: string;
  isEmbedMode?: boolean;
  isHost?: boolean;
  hostUserId?: string | number;
  origin_name?: string;
  thumb_url?: string;
  poster_url?: string;
}