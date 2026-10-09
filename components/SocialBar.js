'use client';
import '@/components/styles/social.css';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, SHOW_DISLIKES } from '@/lib/social';
import { useApp } from '@/components/AppContext';

// Follow button, follower counts, heart and broken heart for a public profile.
export default function SocialBar({ username, init }) {
  const { say, user, router } = useApp() || {};
  const [c, setC] = useState(init);
  const [me, setMe] = useState({ id: null, own: false, follows: false, vote: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase || !user) { setMe({ id: null, own: false, follows: false, vote: 0 }); return; }
    let dead = false;
    (async () => {
      const { data: p } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
      if (dead || !p) return;
      if (p.id === user.id) return setMe({ id: p.id, own: true, follows: false, vote: 0 });
      const [f, v] = await Promise.all([
        supabase.from('follows').select('followee').eq('follower', user.id).eq('followee', p.id).maybeSingle(),
        supabase.from('profile_votes').select('vote').eq('voter', user.id).eq('target', p.id).maybeSingle(),
      ]);
      if (!dead) setMe({ id: p.id, own: false, follows: !!f.data, vote: v.data?.vote || 0 });
    })();
    return () => { dead = true; };
  }, [user?.id, username]);

  const needSignIn = () => { say?.('Sign in to follow people and leave hearts'); router?.push('/login'); };

  async function follow() {
    if (!user) return needSignIn();
    if (!me.id || busy) return;
    setBusy(true);
    const on = !me.follows;
    const { error } = on ? await supabase.from('follows').insert({ follower: user.id, followee: me.id }) : await supabase.from('follows').delete().eq('follower', user.id).eq('followee', me.id);
    setBusy(false);
    if (error) return say?.(error.message);
    setMe((m) => ({ ...m, follows: on })); setC((x) => ({ ...x, followers: Math.max(0, x.followers + (on ? 1 : -1)) }));
  }

  async function vote(v) {
    if (!user) return needSignIn();
    if (!me.id || busy) return;
    setBusy(true);
    const same = me.vote === v;
    const { error } = same ? await supabase.from('profile_votes').delete().eq('voter', user.id).eq('target', me.id)
      : await supabase.from('profile_votes').upsert({ voter: user.id, target: me.id, vote: v }, { onConflict: 'voter,target' });
    setBusy(false);
    if (error) return say?.(error.message);
    setC((x) => {
      let { hearts, broken } = x;
      if (me.vote === 1) hearts--; if (me.vote === -1) broken--;
      if (!same && v === 1) hearts++; if (!same && v === -1) broken++;
      return { ...x, hearts: Math.max(0, hearts), broken: Math.max(0, broken) };
    });
    setMe((m) => ({ ...m, vote: same ? 0 : v }));
  }

  return (
    <div className="sbar">
      {!me.own && <button className={'btn' + (me.follows ? ' g' : '')} aria-pressed={me.follows} disabled={busy} onClick={follow}>{me.follows ? 'Following' : 'Follow'}</button>}
      <span className="sn"><b>{c.followers}</b> {c.followers === 1 ? 'follower' : 'followers'}</span>
      <span className="sn"><b>{c.following}</b> following</span>
      <button className={'vb' + (me.vote === 1 ? ' on' : '')} aria-pressed={me.vote === 1} aria-label={'Heart this profile, ' + c.hearts + ' so far'} disabled={me.own} onClick={() => vote(1)}><Heart /> {c.hearts}</button>
      {SHOW_DISLIKES && <button className={'vb br' + (me.vote === -1 ? ' on' : '')} aria-pressed={me.vote === -1} aria-label={'Broken heart for this profile, ' + c.broken + ' so far'} disabled={me.own} onClick={() => vote(-1)}><Heart broken /> {c.broken}</button>}
    </div>
  );
}
