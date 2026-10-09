'use client';
import '@/components/styles/admin.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LANGS } from '@/lib/custom';
import { useApp } from '@/components/AppContext';

export const FB_KINDS = { bug: 'Something is broken', idea: 'An idea', complaint: 'A complaint', missing: 'A missing title', other: 'Something else', report: 'A profile report' };
export const FB_STATUS = { new: 'Sent', seen: 'Read', planned: 'Planned', done: 'Done', declined: 'Not planned' };
const day = (d) => new Date(d).toISOString().slice(0, 10);

export default function FeedbackScreen() {
  const { authReady, say, user } = useApp();
  const [kind, setKind] = useState('idea');
  const [body, setBody] = useState('');
  const [t, setT] = useState({ title: '', year: '', kind: 'movie', lang: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mine, setMine] = useState(null);

  const load = () => supabase.from('feedback').select('id,kind,body,status,admin_note,created_at,updated_at,reply_seen_at,title_data').order('created_at', { ascending: false }).limit(30).then(({ data }) => {
    const rows = (data || []).map((m) => ({ ...m, fresh: m.updated_at > m.created_at && (!m.reply_seen_at || m.reply_seen_at < m.updated_at) }));
    setMine(rows);
    if (rows.some((m) => m.fresh)) supabase.rpc('mark_replies_seen').then(() => window.dispatchEvent(new Event('seenlog:fbseen')));
  });
  useEffect(() => { if (supabase && user) load(); }, [user?.id]);

  if (!authReady) return null;
  if (!supabase || !user) return <div className="authpage"><h2 className="d">Send feedback</h2><p className="tag">Feedback is tied to an account so replies have somewhere to land.</p><Link className="btn" href="/login">Sign in or create account</Link></div>;

  async function send(e) {
    e.preventDefault(); setErr('');
    const miss = kind === 'missing';
    if (miss && !t.title.trim()) return setErr('Which title is missing?');
    if (miss && t.year && !/^\d{4}$/.test(t.year.trim())) return setErr('Year should be four digits.');
    const text = body.trim() || (miss ? 'Missing title: ' + t.title.trim() : '');
    if (text.length < 3) return setErr('Write a few words so it makes sense later.');
    setBusy(true);
    const row = { kind, body: text.slice(0, 2000), title_data: miss ? { title: t.title.trim().slice(0, 140), year: t.year.trim(), kind: t.kind, lang: t.lang } : null };
    const { error } = await supabase.from('feedback').insert(row);
    setBusy(false);
    if (error) return setErr(error.message);
    setBody(''); setT({ title: '', year: '', kind: 'movie', lang: '' }); say('Sent. Thank you.'); load();
  }

  return (
    <div className="authpage" style={{ maxWidth: 620 }}>
      <h2 className="d">Send feedback</h2>
      <p className="tag">Bugs, ideas, complaints, titles the search could not find. It goes straight to the person who runs this site.</p>
      <form className="scard" onSubmit={send}>
        <div className="prov">{Object.entries(FB_KINDS).filter(([k]) => k !== 'report').map(([k, v]) => <button type="button" key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{v}</button>)}</div>
        {kind === 'missing' && (
          <div className="fbgrid">
            <input className="fld wide" placeholder="Title" aria-label="Missing title" value={t.title} maxLength={140} onChange={(e) => setT({ ...t, title: e.target.value })} />
            <input className="fld" placeholder="Year" aria-label="Year" inputMode="numeric" maxLength={4} value={t.year} onChange={(e) => setT({ ...t, year: e.target.value })} />
            <select className="fld" aria-label="Type" value={t.kind} onChange={(e) => setT({ ...t, kind: e.target.value })}><option value="movie">Movie</option><option value="series">Series</option><option value="anime">Anime</option></select>
            <select className="fld" aria-label="Language" value={t.lang} onChange={(e) => setT({ ...t, lang: e.target.value })}><option value="">Language</option>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
          </div>
        )}
        <textarea className="fld" rows={5} maxLength={2000} placeholder={kind === 'missing' ? 'Anything that helps find it: actors, a link, where you saw it (optional)' : 'What happened, or what would you like?'} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Details" />
        {err && <p className="msg err" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Sending...' : 'Send'}</button>
      </form>
      {mine && mine.length > 0 && (<>
        <h3 className="d" style={{ marginTop: 22 }}>Your messages</h3>
        {mine.map((m) => (
          <div className="urow" key={m.id} style={{ display: 'block' }}>
            <small>{FB_KINDS[m.kind]}, {day(m.created_at)}</small> <span className={'flag' + (m.status !== 'new' ? ' on' : '')}>{FB_STATUS[m.status]}</span>{m.fresh && <span className="flag newflag">New</span>}
            <p style={{ margin: '6px 0 0', overflowWrap: 'anywhere' }}>{m.body}</p>
            {m.admin_note && <p className="reply"><small>Reply</small>{m.admin_note}</p>}
          </div>
        ))}
      </>)}
    </div>
  );
}
