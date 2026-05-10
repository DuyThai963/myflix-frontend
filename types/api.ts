export type OPhimMovie = {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url: string;
  year: number;
  quality: string;
  lang: string;
  time: string;
  category: {
    name: string;
  }[];
};