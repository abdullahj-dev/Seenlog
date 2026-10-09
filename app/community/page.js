import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { SITE } from '@/lib/config';
import Rate from '@/components/Rate';
import PeopleGrid from '@/components/PeopleGrid';
import { loadPeople } from '@/lib/social';

export const revalidate = 300;
export const metadata = { title: 'Community', description: 'Find people who share their movie, series and anime lists, and read their reviews.' };

const M = SITE.ratingMode, F = ['😖', '🙁', '😐', '🙂', '🤩'];
const fmt = (v) => v == null ? '-' : M === '100' ? Math.round(v) : M === '5' ? '★' + (v / 20).toFixed(1).replace('.0', '') : M === 'smiley' ? F[Math.max(0, Math.min(4, Math.floor((v - 0.1) / 20)))] : (v / 10).toFixed(1);
const okImg = (u) => /^https:\/\/(image\.tmdb\.org|s4\.anilist\.co|[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/posters)\//.test(u || '');

export default async function Community() {
  if (!supabase) return <p className="none">Community needs the Supabase keys.</p>;
  const [{ data: people }, { data: reviews }] = await Promise.all([
    supabase.from('public_profiles').select('*').order('is_featured', { ascending: false }).order('titles', { ascending: false }).limit(60),
    supabase.from('public_reviews').select('*').order('added', { ascending: false }).limit(30),
  ]);
  const cards = await loadPeople((people || []).map((p) => p.username));
  const order = new Map((people || []).map((p, i) => [p.username, i]));
  cards.sort((a, b) => order.get(a.username) - order.get(b.username));
  return (
    <section>
      <h2 className="rh d">Community<small>people who chose to share</small></h2>
      {!people?.length ? <p className="none">Nobody has made a list public yet.</p> : <PeopleGrid people={cards} />}
      {reviews?.length > 0 && (<>
        <h3 className="rh d" style={{ fontSize: '1.3rem' }}>Latest reviews</h3>
        {reviews.map((r) => (
          <article className="rv" key={r.username + r.key}>
            {okImg(r.poster) ? <img src={r.poster} alt="" loading="lazy" /> : <i />}
            <span><b>{r.title}{r.year ? ` (${r.year})` : ''}{r.rating != null && <>, <Rate v={r.rating} def={fmt(r.rating)} /></>}</b>
              <small> by <Link href={`/u/${r.username}`}>{r.username}</Link></small>
              <p>{String(r.note).slice(0, 600)}</p></span>
          </article>
        ))}
      </>)}
    </section>
  );
}
