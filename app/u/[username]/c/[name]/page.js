import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SITE } from '@/lib/config';
import { fmtRating } from '@/lib/rating';
import PublicCard from '@/components/PublicCard';

export const revalidate = 300;

const okImg = (u) => /^https:\/\/(image\.tmdb\.org|s4\.anilist\.co)\//.test(u || '');
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

const load = cache(async (u, c) => {
  if (!supabase) return null;
  const { data } = await supabase.from('public_collections').select('key,data').eq('username', String(u).toLowerCase()).eq('collection', c).limit(300);
  return data?.length ? data.map((r) => ({ ...r.data, key: r.key })) : null;
});

export async function generateMetadata({ params }) {
  const { username, name } = await params;
  const c = dec(name), items = await load(username, c);
  if (!items) return { title: 'Not found', robots: { index: false } };
  return { title: `${c} by ${username}`, description: `${items.length} movies, series and anime in the collection "${c}" by ${username} on ${SITE.name}.`, alternates: { canonical: `/u/${username}/c/${encodeURIComponent(c)}` } };
}

export default async function Collection({ params }) {
  const { username, name } = await params;
  const c = dec(name), items = await load(username, c);
  if (!items) notFound();
  const sorted = [...items].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (b.added || 0) - (a.added || 0));
  return (
    <section>
      <h2 className="rh d">{c}<small>by {String(username).toLowerCase()}, {items.length} {items.length === 1 ? 'title' : 'titles'}</small></h2>
      <div id="grid">
        {sorted.map((x) => <PublicCard key={x.key} x={x} by={String(username).toLowerCase()} r={x.rating != null ? fmtRating(x.rating, SITE.ratingMode) : null} ok={okImg(x.poster)} />)}
      </div>
      <Link href="/" className="btn g more">Start your own list</Link>
    </section>
  );
}
