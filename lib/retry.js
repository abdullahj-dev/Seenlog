// Second chance for searches that find little. Self-contained: it does not touch lib/sources.js.
// Used by app/api/search/route.js:  return NextResponse.json(await withRetry(q, await searchAll(q)));
const TM = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w342';
const LATIN = /^[\p{Script=Latin}\p{N}\p{P}\p{Z}]+$/u;

async function tmdbSearch(q, language) {
  const u = new URL(TM + '/search/multi');
  u.searchParams.set('include_adult', 'false'); u.searchParams.set('query', q);
  if (language) u.searchParams.set('language', language);
  const r = await fetch(u, { headers: { Authorization: 'Bearer ' + process.env.TMDB_TOKEN }, cache: 'no-store' });
  if (!r.ok) throw new Error('TMDB answered ' + r.status);
  const d = await r.json();
  return (d.results || []).filter((x) => x.media_type === 'movie' || x.media_type === 'tv').map((x) => {
    const names = [x.title || x.name, x.original_title || x.original_name].filter(Boolean);
    return {
      src: 'tmdb', tm: x.media_type, id: x.id, key: 'tm' + x.media_type + x.id,
      kind: x.genre_ids?.includes(16) && x.original_language === 'ja' ? 'anime' : x.media_type === 'tv' ? 'series' : 'movie',
      title: names.find((n) => LATIN.test(n)) || names[0] || '',
      year: (x.release_date || x.first_air_date || '').slice(0, 4),
      poster: x.poster_path ? IMG + x.poster_path : '',
      lang: x.original_language || '',
    };
  });
}

// Other ways to write the same title: without a trailing year, without punctuation or accents,
// and with Roman Urdu and Hindi spelling loosened.
export function variants(q) {
  const base = q.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const noYear = base.replace(/\s*\b(19|20)\d\d$/, '').trim();
  const loose = noYear.toLowerCase().replace(/aa/g, 'a').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/ou/g, 'u').replace(/([b-df-hj-np-tv-z])\1/g, '$1');
  const seen = new Set([q.trim().toLowerCase()]);
  return [noYear, base, loose].filter((v) => v.length > 1 && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()));
}

// Titles you approved in the admin Catalog tab. Read straight from Supabase with the public key; any failure is ignored.
async function catalogHits(q) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || q.trim().length < 2) return [];
  const terms = [...new Set([q, ...variants(q)].map((t) => t.replace(/[*,()%\\"]/g, ' ').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 1))];
  const or = terms.map((t) => 'title.ilike.*' + encodeURIComponent(t) + '*').join(',');
  const r = await fetch(`${url}/rest/v1/catalog?select=*&or=(${or})&limit=4`, { headers: { apikey: key, Authorization: 'Bearer ' + key }, cache: 'no-store' });
  if (!r.ok) return [];
  return (await r.json()).map((c) => ({
    src: 'cat', key: c.key, kind: c.kind, title: c.title, year: c.year || '', poster: c.poster || '', lang: c.lang || '',
    item: { overview: c.overview || '', genres: c.genres || [], director: c.director || '', writer: '', studio: '', cast: c.cast_names || '', runtime: '', lang: c.lang || '', custom: true },
  }));
}

// data is whatever searchAll returned: { hits, errors }. Adds catalog titles first, then, if TMDB found little,
// retries with variants. Returns the same shape, plus loose: true when retry extras were added.
export async function withRetry(q, data) {
  const cat = await catalogHits(q).catch(() => []);
  const base = cat.length ? { ...data, hits: [...cat, ...(data?.hits || [])] } : data;
  const hits = base?.hits || [];
  if (q.trim().length < 3 || !process.env.TMDB_TOKEN || hits.filter((h) => h.src === 'tmdb').length >= 3) return base;
  const stripYear = q.replace(/\s*[(\[]?\b(19|20)\d\d[)\]]?\s*$/, '').trim() || q;
  const jobs = [...variants(q).map((v) => tmdbSearch(v)), ...['hi-IN', 'ur-PK', 'pa-IN'].map((l) => tmdbSearch(stripYear, l))];
  const more = (await Promise.allSettled(jobs)).flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const seen = new Set(hits.map((h) => h.key));
  const extra = more.filter((h) => !seen.has(h.key) && seen.add(h.key));
  const y = (q.match(/\b((?:19|20)\d\d)\s*$/) || [])[1];
  if (y) extra.sort((a, b) => (b.year === y) - (a.year === y));
  return extra.length ? { ...base, hits: [...hits, ...extra].slice(0, 14), loose: true } : base;
}
