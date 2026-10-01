// [movie genre id, tv genre id]; null means TMDB has no such genre for series.
export const GENRE = {
  Action: [28, 10759], Adventure: [12, 10759], Animation: [16, 16], Comedy: [35, 35], Crime: [80, 80], Documentary: [99, 99],
  Drama: [18, 18], Family: [10751, 10751], Fantasy: [14, 10765], Horror: [27, null], Mystery: [9648, 9648], Romance: [10749, null],
  'Sci-fi': [878, 10765], Thriller: [53, null], War: [10752, 10768], Western: [37, 37],
};
export const REGION = {
  Hollywood: 'with_origin_country=US', Bollywood: 'with_original_language=hi', Pakistani: 'with_origin_country=PK', British: 'with_origin_country=GB',
  Korean: 'with_original_language=ko', Japanese: 'with_original_language=ja', Turkish: 'with_original_language=tr',
  Chinese: 'with_original_language=zh', Spanish: 'with_original_language=es', French: 'with_original_language=fr',
};
export const GENRES = {
  movie: Object.keys(GENRE),
  series: Object.keys(GENRE).filter((g) => GENRE[g][1] != null),
  anime: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller', 'Slice of Life', 'Sports', 'Supernatural'],
};
export const REGIONS = Object.keys(REGION);
