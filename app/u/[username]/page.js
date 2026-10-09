import { cache } from 'react';
import Link from 'next/link';
import PublicCard from '@/components/PublicCard';
import Rate from '@/components/Rate';
import TasteMatch from '@/components/TasteMatch';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SITE } from '@/lib/config';
import SocialBar from '@/components/SocialBar';

export const revalidate = 300;

const M = SITE.ratingMode, F = ['😖', '🙁', '😐', '🙂', '🤩'];
const face = (v) => Math.max(0, Math.min(4, Math.floor((v - 0.1) / 20)));
const fmt = (v) => v == null ? '-' : M === '100' ? Math.round(v) : M === '5' ? '★' + (v / 20).toFixed(1).replace('.0', '') : M === 'smiley' ? F[face(v)] : (v / 10).toFixed(1);
const KD = { movie: 'Movie', series: 'Series', anime: 'Anime' };
const ST = { plan: 'Plan to watch', now: 'Watching', done: 'Watched' };
const okImg = (u) => /^https:\/\/(image\.tmdb\.org|s4\.anilist\.co|[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/posters)\//.test(u || '');

const load = cache(async (u) => {
  if (!supabase) return null;
  const { data: p } = await supabase.from('profiles').select('id,username').eq('username', String(u).toLowerCase()).eq('is_public', true).maybeSingle();
  if (!p) return null;
  const { data } = await supabase.from('public_entries').select('key,data').eq('user_id', p.id).limit(500);
  const { data: soc } = await supabase.from('public_social').select('followers,following,hearts,broken').eq('username', p.username).maybeSingle();
  const social = soc ? { followers: +soc.followers, following: +soc.following, hearts: +soc.hearts, broken: +soc.broken } : null;
  return { name: p.username, social, items: (data || []).map((r) => ({ ...r.data, key: r.key })) };
});

export async function generateMetadata({ params, searchParams }) {
  const { username } = await params;
  const pg = Math.max(1, parseInt((await searchParams)?.page) || 1);
  const d = await load(username);
  if (!d) return { title: 'Not found', robots: { index: false } };
  return { title: `${d.name}'s list${pg > 1 ? ', page ' + pg : ''}`, description: `${d.name} has logged ${d.items.length} movies, series and anime on ${SITE.name}.`, alternates: { canonical: `/u/${d.name}${pg > 1 ? '?page=' + pg : ''}` } };
}

export default async function Profile({ params, searchParams }) {
  const { username } = await params;
  const d = await load(username);
  if (!d) notFound();
  const PER = 48, pages = Math.max(1, Math.ceil(d.items.length / PER));
  const pg = Math.max(1, parseInt((await searchParams)?.page) || 1);
  if (pg > pages) notFound();
  const rated = d.items.filter((x) => x.rating != null);
  const avg = rated.length ? rated.reduce((t, x) => t + x.rating, 0) / rated.length : null;
  const watched = d.items.filter((x) => x.status === 'done').length;
  const top = [...rated].sort((a, b) => b.rating - a.rating).slice(0, 12);
  const all = [...d.items].sort((a, b) => (b.added || 0) - (a.added || 0));
  const reviews = [...d.items].filter((x) => x.notes).sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 12);
  const card = (x) => <PublicCard key={x.key} x={x} by={d.name} r={x.rating != null ? String(fmt(x.rating)) : null} ok={okImg(x.poster)} />;
  return (
    <section>
      <h2 className="rh d">{d.name}<small>{d.items.length} titles, {watched} watched{avg != null && <>, average <Rate v={avg} def={fmt(avg)} /></>}</small></h2>
      {d.social && <SocialBar username={d.name} init={d.social} />}
      {pg === 1 && <TasteMatch by={d.name} theirs={Object.fromEntries(d.items.filter((x) => x.rating != null).map((x) => [x.key, [x.rating, x.title]]))} />}
      {pg === 1 && top.length > 0 && (<><h3 className="rh d" style={{ fontSize: '1.3rem', marginTop: 12 }}>Top rated</h3><div className="shelf">{top.map(card)}</div></>)}
      {pg === 1 && reviews.length > 0 && (<><h3 className="rh d" style={{ fontSize: '1.3rem' }}>Reviews</h3>{reviews.map((x) => <article className="rv" key={x.key}><span><b>{x.title}{x.rating != null && <>, <Rate v={x.rating} def={fmt(x.rating)} /></>}</b><p>{String(x.notes).slice(0, 600)}</p></span></article>)}</>)}
      <h3 className="rh d" style={{ fontSize: '1.3rem' }}>Everything</h3>
      <div id="grid">{all.slice((pg - 1) * PER, pg * PER).map(card)}</div>
      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {pg > 1 && <Link className="chip" href={pg === 2 ? `/u/${d.name}` : `/u/${d.name}?page=${pg - 1}`}>Previous</Link>}
          <span>Page {pg} of {pages}</span>
          {pg < pages && <Link className="chip" href={`/u/${d.name}?page=${pg + 1}`}>Next</Link>}
        </nav>
      )}
    </section>
  );
}
