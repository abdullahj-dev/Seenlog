// Shared bits for follows, hearts and the people cards. Client side.
import { supabase } from '@/lib/supabase';

// Set to false to hide broken hearts everywhere (counts and buttons). Hearts and follows stay.
export const SHOW_DISLIKES = true;

// Posters allowed on public pages: TMDB, AniList and your own Supabase poster storage.
export const okPoster = (u) => /^https:\/\/(image\.tmdb\.org|s4\.anilist\.co|[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/posters)\//.test(u || '');

// Stats, counts and a few posters for a list of usernames. Anything that fails just comes back empty.
export async function loadPeople(names) {
  const list = [...new Set(names)].filter(Boolean);
  if (!supabase || !list.length) return [];
  const [a, b, c] = await Promise.all([
    supabase.from('public_profiles').select('username,is_featured,titles,avg_rating').in('username', list),
    supabase.from('public_social').select('*').in('username', list),
    supabase.from('public_posters').select('username,poster,title').in('username', list),
  ]);
  const soc = Object.fromEntries((b.data || []).map((r) => [r.username, r]));
  const pos = {};
  (c.data || []).forEach((r) => { if (okPoster(r.poster)) (pos[r.username] ||= []).push(r); });
  return (a.data || []).map((p) => ({
    ...p, followers: +(soc[p.username]?.followers || 0), following: +(soc[p.username]?.following || 0),
    hearts: +(soc[p.username]?.hearts || 0), broken: +(soc[p.username]?.broken || 0), posters: (pos[p.username] || []).slice(0, 4),
  }));
}

export const Heart = ({ broken = false, size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    {broken && <path d="M13.2 3.6l-2.6 5 3.2 2.2-2.9 5.4" fill="none" stroke="var(--aisle)" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" />}
  </svg>
);
