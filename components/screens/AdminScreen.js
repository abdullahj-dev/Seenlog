'use client';
import '@/components/styles/admin.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppContext';
import { FB_KINDS, FB_STATUS } from '@/components/screens/FeedbackScreen';
import { langName } from '@/lib/custom';
import { SITE } from '@/lib/config';
import AdminCatalog from '@/components/screens/AdminCatalog';

const TABS = [['over', 'Overview'], ['inbox', 'Inbox'], ['catalog', 'Catalog'], ['users', 'People']];
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : 'never');

export default function AdminScreen() {
  const { authReady, isAdmin, say, user } = useApp();
  const [tab, setTab] = useState('over');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [f, setF] = useState('');
  const [err, setErr] = useState('');
  const [fb, setFb] = useState(null);
  const [fs, setFs] = useState('open');
  const [seed, setSeed] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.rpc('admin_stats').then(({ data, error }) => (error ? setErr(error.message) : setStats(data)));
    supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(300).then(({ data, error }) => (error ? setErr(error.message) : setFb(data)));
    supabase.rpc('admin_users').then(({ data, error }) => (error ? setErr(error.message) : setUsers(data)));
  }, [isAdmin]);

  if (!authReady || isAdmin === null) return <p className="tag">Checking access...</p>;
  if (!isAdmin) return <div className="authpage"><h2 className="d">Not allowed</h2><p className="tag">{user ? 'This account is not an admin.' : 'Sign in with the admin account.'}</p><Link className="btn" href={user ? '/' : '/login'}>{user ? 'Back to your list' : 'Sign in'}</Link></div>;

  async function setProfile(u, featured, visible) {
    const { error } = await supabase.rpc('admin_set_profile', { uid: u.id, featured, visible });
    if (error) return say('Could not change that: ' + error.message);
    setUsers((l) => l.map((x) => (x.id === u.id ? { ...x, is_featured: featured, is_public: visible } : x)));
    say('Updated ' + (u.username || u.email));
  }

  async function suspend(u, on) {
    if (on && !window.confirm('Suspend ' + (u.username || u.email) + '? They cannot sign in and their public page goes off.')) return;
    const { error } = await supabase.rpc('admin_suspend', { uid: u.id, suspend: on });
    if (error) return say('Could not change that: ' + error.message);
    setUsers((l) => l.map((x) => (x.id === u.id ? { ...x, suspended: on, ...(on ? { is_public: false, is_featured: false } : {}) } : x)));
    say(on ? 'Suspended' : 'Restored');
  }

  async function saveFb(m, ch) {
    const { error } = await supabase.from('feedback').update({ ...ch, updated_at: new Date().toISOString() }).eq('id', m.id);
    if (error) return say('Could not save: ' + error.message);
    setFb((l) => l.map((x) => (x.id === m.id ? { ...x, ...ch } : x))); say('Saved');
  }
  async function delFb(m) {
    if (!window.confirm('Delete this message for good?')) return;
    const { error } = await supabase.from('feedback').delete().eq('id', m.id);
    if (error) return say('Could not delete: ' + error.message);
    setFb((l) => l.filter((x) => x.id !== m.id));
  }
  const nNew = (fb || []).filter((m) => m.status === 'new').length;
  const fbShown = (fb || []).filter((m) => (fs === 'all' ? true : fs === 'open' ? m.status === 'new' || m.status === 'seen' || m.status === 'planned' : m.status === fs));

  const shown = (users || []).filter((u) => !f.trim() || (u.email + ' ' + (u.username || '')).toLowerCase().includes(f.trim().toLowerCase()));
  const S = stats || {};
  const tiles = [['users', 'People'], ['new_7d', 'New this week'], ['public', 'Public profiles'], ['featured', 'Featured'], ['titles', 'Titles logged'], ['custom', 'Added by hand'], ['movies', 'Movies'], ['series', 'Series'], ['anime', 'Anime']];

  return (
    <div className="adm">
      <h2 className="d">Admin</h2>
      <div className="tabs">{TABS.map(([k, l]) => <button key={k} className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}{k === 'inbox' && nNew > 0 && <span className="tabn">{nNew}</span>}</button>)}</div>
      {err && <p className="msg err" role="alert">{err}. Did you run supabase/admin.sql?</p>}
      {tab === 'over' && <div className="stats">{tiles.map(([k, l]) => <div className="stat" key={k}><b>{stats ? S[k] ?? 0 : '...'}</b><small>{l}</small></div>)}</div>}
      {tab === 'inbox' && (
        <div className="inbox">
          <div className="prov">{[['open', 'Open'], ['new', 'New'], ['done', 'Done'], ['declined', 'Not planned'], ['all', 'Everything']].map(([k, l]) => <button key={k} className="chip" aria-pressed={fs === k} onClick={() => setFs(k)}>{l}</button>)}</div>
          {fb === null && <p className="tag">Loading...</p>}
          {fb && !fbShown.length && <p className="tag">Nothing here.</p>}
          {fbShown.map((m) => (
            <div className="urow" key={m.id}>
              <div className="fbtop"><span className="flag on">{FB_KINDS[m.kind]}</span><span className={'flag' + (m.status === 'new' ? ' on' : '')}>{FB_STATUS[m.status]}</span><small>{m.email || 'deleted account'}</small><small className="when">{day(m.created_at)}</small></div>
              <p className="fbbody">{m.body}</p>
              {m.title_data?.profile && <p className="tag" style={{ margin: 0 }}>Reported profile: @{m.title_data.profile} <button className="linkbtn" onClick={() => { setF(m.title_data.profile); setTab('users'); }}>Find in People</button> <Link className="linkbtn" href={'/u/' + m.title_data.profile}>View page</Link></p>}
              {m.title_data?.title && <p className="tag" style={{ margin: 0 }}>{m.title_data.title}{m.title_data.year ? ' (' + m.title_data.year + ')' : ''}, {m.title_data.kind}{m.title_data.lang ? ', ' + langName(m.title_data.lang) : ''} <button className="linkbtn" onClick={() => { setSeed({ ...m.title_data, fbId: m.id }); setTab('catalog'); }}>Add to catalog</button></p>}
              <textarea className="fld" rows={2} maxLength={1000} placeholder="Reply the person will see (optional)" defaultValue={m.admin_note || ''} onBlur={(e) => { if (e.target.value !== (m.admin_note || '')) saveFb(m, { admin_note: e.target.value.trim() || null }); }} aria-label="Reply" />
              <div className="srow">
                {Object.entries(FB_STATUS).map(([k, l]) => <button key={k} className="chip" aria-pressed={m.status === k} onClick={() => saveFb(m, { status: k })}>{k === 'new' ? 'New' : l}</button>)}
                {m.email && <a className="btn g" href={'mailto:' + m.email + '?subject=' + encodeURIComponent('Re: your message on ' + SITE.name) + '&body=' + encodeURIComponent('\n\n> ' + m.body.slice(0, 300).replace(/\n/g, ' '))}>Email them</a>}
                <button className="btn g x" onClick={() => delFb(m)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'catalog' && <AdminCatalog seed={seed} onSeedUsed={() => setSeed(null)} onSaved={(id) => saveFb({ id }, { status: 'done', admin_note: 'Added. It now shows up in search.' })} />}
      {tab === 'users' && (<>
        <input className="fld" placeholder="Search by email or username" value={f} onChange={(e) => setF(e.target.value)} aria-label="Search people" />
        {users === null && <p className="tag">Loading...</p>}
        {shown.map((u) => (
          <div className="urow" key={u.id}>
            <div>
              <b>{u.username ? '@' + u.username : u.email}</b>
              <small>{u.username ? u.email + ', ' : ''}joined {day(u.joined)}, last seen {day(u.last_seen)}, {u.entries} titles</small>
              <div style={{ marginTop: 6 }}><span className={'flag' + (u.is_public ? ' on' : '')}>{u.is_public ? 'Public' : 'Private'}</span>{u.is_featured && <span className="flag on">Featured</span>}{u.suspended && <span className="flag on" style={{ borderColor: 'var(--ember)', color: 'var(--ember)' }}>Suspended</span>}</div>
            </div>
            <div className="srow">
              {u.username && u.is_public && <Link className="btn g" href={'/u/' + u.username}>View</Link>}
              {u.is_public && <button className="btn g" onClick={() => setProfile(u, !u.is_featured, u.is_public)}>{u.is_featured ? 'Unfeature' : 'Feature'}</button>}
              {u.is_public && <button className="btn g x" onClick={() => setProfile(u, false, false)}>Hide profile</button>}
              {u.suspended ? <button className="btn g" onClick={() => suspend(u, false)}>Restore</button> : <button className="btn g x" onClick={() => suspend(u, true)}>Suspend</button>}
            </div>
          </div>
        ))}
        {users && !shown.length && <p className="tag">Nobody matches.</p>}
      </>)}
    </div>
  );
}
