import { SITE } from './config';
import { GENRE, REGION } from './filters';
const TM = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w342';

function tmHeaders() {
  if (!process.env.TMDB_TOKEN) throw new Error('TMDB_TOKEN is missing in .env.local');
  return { Authorization: 'Bearer ' + process.env.TMDB_TOKEN };
}

async function tmdbSearch(q) {
  const r = await fetch(`${TM}/search/multi?include_adult=false&query=${encodeURIComponent(q)}`, { headers: tmHeaders(), cache: 'no-store' });
  if (!r.ok) throw new Error('TMDB answered ' + r.status);
  const d = await r.json();
  return (d.results || [])
    .filter((x) => x.media_type === 'movie' || x.media_type === 'tv')
    .slice(0, 7)
    .map((x) => ({
      src: 'tmdb', tm: x.media_type, id: x.id, key: 'tm' + x.media_type + x.id,
      kind: x.genre_ids?.includes(16) && x.original_language === 'ja' ? 'anime' : x.media_type === 'tv' ? 'series' : 'movie',
      title: x.title || x.name,
      year: (x.release_date || x.first_air_date || '').slice(0, 4),
      poster: x.poster_path ? IMG + x.poster_path : '',
    }));
}

const AQ = `query($q:String){Page(perPage:6){media(search:$q,type:ANIME,sort:SEARCH_MATCH){id title{romaji english}coverImage{large}startDate{year}format season seasonYear duration source popularity nextAiringEpisode{episode airingAt}relations{edges{relationType node{title{romaji english}type}}}bannerImage trailer{id site}externalLinks{site url type}averageScore status genres description(asHtml:false)episodes studios(isMain:true){nodes{name}}staff(perPage:10){edges{role node{name{full}}}}}}}`;

async function aniQuery(query, variables) {
  const r = await fetch('https://graphql.anilist.co', {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.errors) throw new Error('AniList answered ' + r.status + (d.errors ? ': ' + d.errors[0].message : ''));
  return d.data.Page.media.map((m) => {
    const pick = (re) => [...new Set(m.staff.edges.filter((e) => re.test(e.role)).map((e) => e.node.name.full))].slice(0, 3).join(', ');
    const title = m.title.english || m.title.romaji;
    const year = m.startDate.year || '';
    return {
      src: 'al', key: 'al' + m.id, kind: 'anime', title, year, poster: m.coverImage.large,
      item: {
        overview: (m.description || '').replace(/<[^>]+>/g, ''),
        genres: m.genres || [],
        director: pick(/Director/i),
        writer: pick(/Original|Script|Story|Composition/i),
        studio: m.studios.nodes[0]?.name || '',
        cast: '',
        runtime: m.episodes ? m.episodes + ' episodes' : '',
        backdrop: m.bannerImage || '',
        trailer: m.trailer?.site === 'youtube' ? 'https://www.youtube.com/watch?v=' + m.trailer.id : '',
        watch: (() => { const l = (m.externalLinks || []).filter((e) => e.type === 'STREAMING'); return l.length ? { link: l[0].url, providers: [...new Set(l.map((e) => e.site))].slice(0, 6), rent: [] } : null; })(),
        score: m.averageScore ? +(m.averageScore / 10).toFixed(1) : null,
        airStatus: m.status || '',
        tagline: '', episodes: m.episodes || null, seasons: [],
        facts: [['Format', (m.format || '').replace(/_/g, ' ')], ['Season', [m.season ? m.season[0] + m.season.slice(1).toLowerCase() : '', m.seasonYear || ''].filter(Boolean).join(' ')],
          ['Episode length', m.duration ? m.duration + ' min' : ''], ['Source', (m.source || '').replace(/_/g, ' ').toLowerCase()],
          ['Popularity', m.popularity ? m.popularity.toLocaleString('en-US') + ' users' : ''],
          ['Next episode', m.nextAiringEpisode ? `Episode ${m.nextAiringEpisode.episode}, ${new Date(m.nextAiringEpisode.airingAt * 1000).toISOString().slice(0, 10)}` : '']].filter(([, v]) => v),
        related: (m.relations?.edges || []).filter((e) => /PREQUEL|SEQUEL|PARENT|SIDE_STORY|SPIN_OFF/.test(e.relationType) && e.node.type === 'ANIME').slice(0, 8)
          .map((e) => e.relationType.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) + ': ' + (e.node.title.english || e.node.title.romaji)),
      },
    };
  });
}

export async function searchAll(q) {
  const [a, b] = await Promise.allSettled([tmdbSearch(q), aniSearch(q)]);
  // Same anime from both sources: keep the AniList one, drop the TMDB twin.
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const al = b.value || [];
  const tm = (a.value || []).filter((h) => !(h.kind === 'anime' && al.some((x) => norm(x.title) === norm(h.title) && (!h.year || !x.year || h.year === String(x.year)))));
  return {
    hits: [...tm, ...al],
    errors: { TMDB: a.status === 'rejected' ? a.reason.message : null, AniList: b.status === 'rejected' ? b.reason.message : null },
  };
}

export async function tmdbDetails(tm, id) {
  const r = await fetch(`${TM}/${tm}/${id}?append_to_response=credits,videos,watch/providers`, { headers: tmHeaders(), cache: 'no-store' });
  if (!r.ok) throw new Error('TMDB answered ' + r.status);
  const d = await r.json();
  const c = d.credits || { crew: [], cast: [] };
  const nm = (re) => [...new Set(c.crew.filter((p) => re.test(p.job)).map((p) => p.name))].slice(0, 3).join(', ');
  return {
    overview: d.overview || '',
    genres: (d.genres || []).map((g) => g.name),
    director: tm === 'tv' ? (d.created_by || []).map((p) => p.name).join(', ') || nm(/^Director$/) : nm(/^Director$/),
    writer: nm(/Writer|Screenplay|Story/),
    studio: '',
    cast: c.cast.slice(0, 5).map((p) => p.name).join(', '),
    backdrop: d.backdrop_path ? 'https://image.tmdb.org/t/p/w780' + d.backdrop_path : '',
    trailer: (() => { const v = d.videos?.results || []; const t = v.find((x) => x.site === 'YouTube' && x.type === 'Trailer') || v.find((x) => x.site === 'YouTube'); return t ? 'https://www.youtube.com/watch?v=' + t.key : ''; })(),
    watch: (() => {
      const r = d['watch/providers']?.results?.[SITE.region || 'US']; if (!r) return null;
      const u = (a) => [...new Set(a.map((x) => x.provider_name))];
      return { link: r.link, providers: u([...(r.flatrate || []), ...(r.free || []), ...(r.ads || [])]), rent: u([...(r.rent || []), ...(r.buy || [])]).slice(0, 6) };
    })(),
    seasons: (d.seasons || []).filter((x) => x.season_number > 0).map((x) => ({ n: x.season_number, name: x.name, eps: x.episode_count, year: (x.air_date || '').slice(0, 4) })),
    facts: [['Original language', (d.spoken_languages || []).find((l) => l.iso_639_1 === d.original_language)?.english_name || ''],
      ['Networks', (d.networks || []).map((n) => n.name).slice(0, 3).join(', ')], ['Companies', (d.production_companies || []).map((n) => n.name).slice(0, 3).join(', ')],
      ['Countries', (d.production_countries || []).map((c) => c.name).slice(0, 3).join(', ')], ['Released', d.release_date || d.first_air_date || ''],
      ['Last aired', d.last_air_date || ''], ['Next episode', d.next_episode_to_air?.air_date || '']].filter(([, v]) => v),
    tagline: d.tagline || '', score: d.vote_average ? +d.vote_average.toFixed(1) : null, airStatus: d.status || '', episodes: d.number_of_episodes || null,
    runtime: tm === 'tv' ? (d.number_of_seasons ? d.number_of_seasons + ' seasons' : '') : d.runtime ? d.runtime + ' min' : '',
  };
}

const aniSearch = (q) => aniQuery(AQ, { q });
const DQ = AQ.replace('query($q:String){Page(perPage:6){media(search:$q,type:ANIME,sort:SEARCH_MATCH)', 'query($sort:[MediaSort],$pop:Int,$page:Int,$genre:String){Page(page:$page,perPage:20){media(type:ANIME,sort:$sort,status_not:NOT_YET_RELEASED,isAdult:false,popularity_greater:$pop,genre:$genre)');

const tmMap = (x, tm) => ({
  src: 'tmdb', tm, id: x.id, key: 'tm' + tm + x.id,
  kind: x.genre_ids?.includes(16) && x.original_language === 'ja' ? 'anime' : tm === 'tv' ? 'series' : 'movie',
  title: x.title || x.name, year: (x.release_date || x.first_air_date || '').slice(0, 4), poster: x.poster_path ? IMG + x.poster_path : '',
});
async function tmGet(url) {
  const r = await fetch(url, { headers: tmHeaders(), next: { revalidate: 3600 } });
  if (!r.ok) throw new Error('TMDB answered ' + r.status);
  return r.json();
}

export async function discover(tab, kind, page = 1, f = {}) {
  const { genre, region } = f;
  if (kind === 'anime') {
    const sort = { newest: 'START_DATE_DESC', trending: 'TRENDING_DESC', top: 'SCORE_DESC' }[tab];
    return aniQuery(DQ, { sort: [sort], pop: tab === 'top' ? 20000 : tab === 'newest' ? 3000 : 0, page, genre: genre ? (genre === 'Sci-fi' ? 'Sci-Fi' : genre) : null });
  }
  const tm = kind === 'series' ? 'tv' : 'movie', today = new Date().toISOString().slice(0, 10);
  const gid = genre && GENRE[genre] ? GENRE[genre][tm === 'tv' ? 1 : 0] : null;
  const rp = region && REGION[region] ? REGION[region] : null;
  let url;
  if (gid || rp) {
    const dk = tm === 'movie' ? 'primary_release_date' : 'first_air_date';
    const sort = tab === 'newest' ? dk + '.desc' : tab === 'top' ? 'vote_average.desc' : 'popularity.desc';
    const votes = rp ? 5 : tab === 'top' ? 300 : tab === 'newest' ? (tm === 'movie' ? 30 : 10) : 50;
    url = `${TM}/discover/${tm}?sort_by=${sort}&include_adult=false&page=${page}&vote_count.gte=${votes}${gid ? '&with_genres=' + gid : ''}${rp ? '&' + rp : ''}${tab === 'newest' ? `&${dk}.lte=${today}` : ''}`;
  } else {
    url = tab === 'trending' ? `${TM}/trending/${tm}/week?page=${page}`
      : tab === 'top' ? `${TM}/${tm}/top_rated?page=${page}`
      : tm === 'movie' ? `${TM}/discover/movie?sort_by=primary_release_date.desc&primary_release_date.lte=${today}&vote_count.gte=30&include_adult=false&page=${page}`
      : `${TM}/discover/tv?sort_by=first_air_date.desc&first_air_date.lte=${today}&vote_count.gte=10&include_adult=false&page=${page}`;
  }
  const d = await tmGet(url);
  return (d.results || []).map((x) => tmMap(x, tm)).filter((h) => h.poster && h.kind !== 'anime').slice(0, 20);
}

export async function similar(tm, id) {
  const d = await tmGet(`${TM}/${tm}/${id}/recommendations`);
  return (d.results || []).map((x) => tmMap(x, tm)).filter((h) => h.poster).slice(0, 16);
}

const AID = AQ.replace('query($q:String){Page(perPage:6){media(search:$q,type:ANIME,sort:SEARCH_MATCH)', 'query($id:Int){Page(perPage:1){media(id:$id,type:ANIME)');
export async function anilistById(id) {
  const r = await aniQuery(AID, { id: +id });
  if (!r[0]) throw new Error('Not found');
  return r[0].item;
}

// Used by the list importer: TMDB first, AniList only when needed (AniList allows about 90 requests a minute).
export async function matchTitle(q, kind) {
  const nrm = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  let hits = [], error = null;
  if (kind !== 'anime') { try { hits = await tmdbSearch(q); } catch (e) { error = e.message; } }
  if (kind === 'anime' || !hits.some((h) => nrm(h.title) === nrm(q))) { try { hits = [...hits, ...(await aniSearch(q))]; } catch (e) { error = error || e.message; } }
  return { hits: hits.slice(0, 8), error };
}

const SQ = 'query($id:Int){Media(id:$id){recommendations(sort:RATING_DESC,perPage:14){nodes{mediaRecommendation{id title{romaji english}coverImage{large}startDate{year}type}}}}}';
export async function anilistSimilar(id) {
  const r = await fetch('https://graphql.anilist.co', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query: SQ, variables: { id: +id } }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.errors) throw new Error('AniList answered ' + r.status);
  return (d.data.Media.recommendations.nodes || []).map((n) => n.mediaRecommendation).filter((m) => m && m.type === 'ANIME')
    .map((m) => ({ src: 'al', key: 'al' + m.id, id: m.id, kind: 'anime', title: m.title.english || m.title.romaji, year: m.startDate.year || '', poster: m.coverImage.large }));
}

// Next episode date for shows you are watching (TMDB for series, AniList for anime).
export async function airing(keys) {
  const out = {};
  const tv = keys.filter((k) => /^tmtv\d+$/.test(k)), al = keys.filter((k) => /^al\d+$/.test(k));
  await Promise.all(tv.map(async (k) => {
    try { const n = (await tmGet(`${TM}/tv/${k.slice(4)}`)).next_episode_to_air; if (n?.air_date) out[k] = { date: n.air_date, label: `S${n.season_number} E${n.episode_number}` }; } catch {}
  }));
  if (al.length) {
    try {
      const r = await fetch('https://graphql.anilist.co', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: 'query($ids:[Int]){Page(perPage:25){media(id_in:$ids){id nextAiringEpisode{episode airingAt}}}}', variables: { ids: al.map((k) => +k.slice(2)) } }) });
      const d = await r.json();
      (d.data?.Page?.media || []).forEach((m) => { if (m.nextAiringEpisode) out['al' + m.id] = { date: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString().slice(0, 10), label: 'Episode ' + m.nextAiringEpisode.episode }; });
    } catch {}
  }
  return out;
}
