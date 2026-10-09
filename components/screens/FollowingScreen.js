'use client';
import '@/components/styles/social.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { loadPeople, okPoster } from '@/lib/social';
import { fmtRating } from '@/lib/rating';
import PersonCard from '@/components/PersonCard';
import PublicCard from '@/components/PublicCard';
import { useApp } from '@/components/AppContext';

const TABS = { feed: 'Latest', following: 'Following', followers: 'Followers' };

// People you follow: what they logged lately, who they are, and who follows you.
export default function FollowingScreen() {
  const { authReady, rmode, say, user } = useApp();
  const [tab, setTab] = useState('feed');
  const [data, setData] = useState(null); // { following: [people], followers: [people], feed: [items] }
  const [err, setErr] = useState('');

  async function load() {
    const [a, b] = await Promise.all([
      supabase.from('follows').select('followee,created_at').eq('follower', user.id).order('created_at', { ascending: false }).limit(500),
      supabase.from('follows').select('follower,created_at').eq('followee', user.id).order('created_at', { ascending: false }).limit(500),
    ]);
    if (a.error || b.error) return setErr((a.error || b.error).message + '. Did you run supabase/social.sql?');
    const fIds = (a.data || []).map((r) => r.followee), rIds = (b.data || []).map((r) => r.follower);
    const ids = [...new Set([...fIds, ...rIds])];
    const { data: profs } = ids.length ? await supabase.from('profiles').select('id,username').in('id', ids) : { data: [] };
    const nameOf = Object.fromEntries((profs || []).map((p) => [p.id, p.username]));
    const names = (list) => list.map((i) => nameOf[i]).filter(Boolean);
    const people = await loadPeople([...names(fIds), ...names(rIds)]);
    const by = Object.fromEntries(people.map((p) => [p.username, p]));
    const pick = (list) => names(list).map((n) => by[n]).filter(Boolean);
    let feed = [];
    const pubIds = fIds.filter((i) => nameOf[i]);
    if (pubIds.length) {
      const { data: rows } = await supabase.from('public_entries').select('user_id,key,data').in('user_id', pubIds).order('data->>added', { ascending: false }).limit(60);
      feed = (rows || []).map((r) => ({ ...r.data, key: r.key, by: nameOf[r.user_id] }));
    }
    setData({ following: pick(fIds), followers: pick(rIds), feed });
  }
  useEffect(() => { if (supabase && user) load(); }, [user?.id]);

  async function unfollow(p) {
    const { data: prof } = await supabase.from('profiles').select('id').eq('username', p.username).maybeSingle();
    if (!prof) return;
    const { error } = await supabase.from('follows').delete().eq('follower', user.id).eq('followee', prof.id);
    if (error) return say(error.message);
    setData((d) => ({ ...d, following: d.following.filter((x) => x.username !== p.username), feed: d.feed.filter((x) => x.by !== p.username) }));
  }
  async function followBack(p) {
    const { data: prof } = await supabase.from('profiles').select('id').eq('username', p.username).maybeSingle();
    if (!prof) return;
    const { error } = await supabase.from('follows').insert({ follower: user.id, followee: prof.id });
    if (error) return say(error.message);
    say('Following ' + p.username); load();
  }

  if (!authReady) return null;
  if (!supabase || !user) return <div className="authpage"><h2 className="d">Following</h2><p className="tag">Sign in to follow people and see what they log.</p><Link className="btn" href="/login">Sign in or create account</Link></div>;

  const fset = new Set((data?.following || []).map((p) => p.username));
  return (
    <section className="fpage">
      <h2 className="rh d">Following<small>{data ? data.following.length + ' people' : ''}</small></h2>
      <div className="tabs">{Object.entries(TABS).map(([k, v]) => <button key={k} className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{v}{data && k !== 'feed' ? ' ' + data[k].length : ''}</button>)}<Link className="chip" href="/community">Find people</Link></div>
      {err && <p className="msg err" role="alert">{err}</p>}
      {!data && !err && <p className="tag">Loading...</p>}
      {data && tab === 'feed' && (data.feed.length ? (
        <div className="fgrid">{data.feed.map((x) => (
          <div className="fcard" key={x.by + x.key}>
            <PublicCard x={x} by={x.by} r={x.rating != null ? String(fmtRating(x.rating, rmode || '10')) : null} ok={okPoster(x.poster)} />
            <small>by <Link href={'/u/' + x.by}>{x.by}</Link></small>
          </div>
        ))}</div>
      ) : <p className="tag">{data.following.length ? 'Nothing logged yet by the people you follow.' : 'You are not following anyone yet. Open Community, pick a person, press Follow, and their latest titles show up here.'}</p>)}
      {data && tab === 'following' && (data.following.length ? <div className="pgrid">{data.following.map((p) => <PersonCard key={p.username} p={p}><button className="btn g" onClick={() => unfollow(p)}>Unfollow</button></PersonCard>)}</div> : <p className="tag">Nobody yet.</p>)}
      {data && tab === 'followers' && (data.followers.length ? <div className="pgrid">{data.followers.map((p) => <PersonCard key={p.username} p={p}>{fset.has(p.username) ? <span className="tag" style={{ margin: 0 }}>You follow each other</span> : <button className="btn" onClick={() => followBack(p)}>Follow back</button>}</PersonCard>)}</div> : <p className="tag">No followers with a public page yet. Followers whose pages are private are not listed.</p>)}
    </section>
  );
}
