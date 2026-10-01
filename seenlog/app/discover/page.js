import Link from 'next/link';
import { discover } from '@/lib/sources';
import { GENRES, REGIONS } from '@/lib/filters';
import DiscoverCard from '@/components/DiscoverCard';

const TABS = { newest: 'Newest', trending: 'Trending', top: 'Top rated' };
const KINDS = { movie: 'Movies', series: 'Series', anime: 'Anime' };

async function read(searchParams) {
  const sp = (await searchParams) || {};
  const tab = TABS[sp.tab] ? sp.tab : 'newest';
  const kind = KINDS[sp.kind] ? sp.kind : 'movie';
  const genre = GENRES[kind].includes(sp.genre) ? sp.genre : '';
  const region = kind !== 'anime' && REGIONS.includes(sp.region) ? sp.region : '';
  const page = Math.min(50, Math.max(1, parseInt(sp.page) || 1));
  return { tab, kind, genre, region, page };
}
const url = (c, o = {}) => {
  const p = { ...c, ...o }, u = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => { if (v && !(k === 'page' && Number(v) === 1)) u.set(k, v); });
  const s = u.toString();
  return '/discover' + (s ? '?' + s : '');
};

export async function generateMetadata({ searchParams }) {
  const c = await read(searchParams);
  const title = `${TABS[c.tab]} ${[c.region, c.genre].filter(Boolean).join(' ')} ${KINDS[c.kind]}`.replace(/\s+/g, ' ').trim() + (c.page > 1 ? `, page ${c.page}` : '');
  return { title, description: `Browse ${title.toLowerCase()}. Pick any title to add it to your own watch list.`, alternates: { canonical: url(c) } };
}

export default async function Discover({ searchParams }) {
  const c = await read(searchParams);
  let hits = [], err = null;
  try { hits = await discover(c.tab, c.kind, c.page, { genre: c.genre, region: c.region }); } catch (e) { err = e.message; }
  return (
    <section>
      <h2 className="rh d">Discover<small>click any title to log it</small></h2>
      <div className="bar">
        {Object.entries(TABS).map(([k, v]) => <Link key={k} className="chip" aria-pressed={c.tab === k} href={url(c, { tab: k, page: 1 })}>{v}</Link>)}
        <span className="sep" />
        {Object.entries(KINDS).map(([k, v]) => <Link key={k} className="chip" aria-pressed={c.kind === k} href={url(c, { kind: k, genre: '', region: k === 'anime' ? '' : c.region, page: 1 })}>{v}</Link>)}
      </div>
      <div className="tagrow">
        {GENRES[c.kind].map((g) => <Link key={g} className="chip" aria-pressed={c.genre === g} href={url(c, { genre: c.genre === g ? '' : g, page: 1 })}>{g}</Link>)}
      </div>
      {c.kind !== 'anime' && (
        <div className="tagrow">
          {REGIONS.map((r) => <Link key={r} className="chip col" aria-pressed={c.region === r} href={url(c, { region: c.region === r ? '' : r, page: 1 })}>{r}</Link>)}
        </div>
      )}
      {err && <p className="tag" style={{ color: 'var(--ember)' }}>Could not load: {err}</p>}
      <div id="grid">{hits.length ? hits.map((h) => <DiscoverCard key={h.key} h={h} />) : !err && <p className="none">Nothing matches these filters. Try removing one.</p>}</div>
      <nav className="pager" aria-label="Pages">
        {c.page > 1 && <Link className="chip" href={url(c, { page: c.page - 1 })}>Previous</Link>}
        <span>Page {c.page}</span>
        {hits.length >= 10 && <Link className="chip" href={url(c, { page: c.page + 1 })}>Next</Link>}
      </nav>
    </section>
  );
}
