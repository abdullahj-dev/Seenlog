'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppContext';

const LV = { info: 'Info', good: 'Good news', warn: 'Warning' };
const LIFE = [['', 'No end date'], ['1', '1 day'], ['7', '7 days'], ['30', '30 days']];
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

// Admin tab: post, hide and delete announcements.
export default function AdminNotices() {
  const { say } = useApp();
  const [rows, setRows] = useState(null);
  const [f, setF] = useState({ title: '', body: '', link: '', level: 'info', life: '' });
  const [busy, setBusy] = useState(false);
  const load = async () => { const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(50); if (error) say(error.message + '. Did you run supabase/announcements.sql?'); setRows(data || []); };
  useEffect(() => { load(); }, []);
  async function post(e) {
    e.preventDefault(); if (busy) return;
    const link = f.link.trim();
    if (link && !/^(https:\/\/|\/)/.test(link)) return say('The link must start with https:// or /');
    setBusy(true);
    const row = { title: f.title.trim(), body: f.body.trim() || null, link: link || null, level: f.level, expires_at: f.life ? new Date(Date.now() + +f.life * 864e5).toISOString() : null };
    const { error } = await supabase.from('announcements').insert(row);
    setBusy(false);
    if (error) return say(error.message);
    setF({ title: '', body: '', link: '', level: 'info', life: '' }); say('Posted. People see it within a couple of minutes'); load();
  }
  async function set(id, ch) { const { error } = await supabase.from('announcements').update(ch).eq('id', id); if (error) return say(error.message); setRows((r) => r.map((x) => (x.id === id ? { ...x, ...ch } : x))); }
  async function del(id) { if (!confirm('Delete this announcement for good?')) return; const { error } = await supabase.from('announcements').delete().eq('id', id); if (error) return say(error.message); setRows((r) => r.filter((x) => x.id !== id)); }
  const live = (n) => n.active && (!n.expires_at || new Date(n.expires_at) > new Date());
  return (
    <>
      <form className="cf" onSubmit={post} style={{ marginBottom: 18 }}>
        <label>Title<input className="fld" required maxLength={80} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Following and hearts are live" /></label>
        <label>Message (optional)<textarea className="fld" maxLength={400} rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
        <label>Link (optional)<input className="fld" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="/community or https://..." /></label>
        <div className="prov">
          {Object.entries(LV).map(([k, v]) => <button type="button" key={k} className="chip" aria-pressed={f.level === k} onClick={() => setF({ ...f, level: k })}>{v}</button>)}
          <select className="fld" style={{ width: 'auto' }} aria-label="How long to show it" value={f.life} onChange={(e) => setF({ ...f, life: e.target.value })}>{LIFE.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <button className="btn" disabled={busy || !f.title.trim()}>Post announcement</button>
      </form>
      {rows === null && <p className="tag">Loading...</p>}
      {rows && !rows.length && <p className="tag">No announcements yet.</p>}
      {rows?.map((n) => (
        <div className="urow" key={n.id}>
          <div>
            <b>{n.title}</b>
            {n.body && <small>{n.body}</small>}
            <div style={{ marginTop: 6 }}><span className={'flag' + (live(n) ? ' on' : '')}>{live(n) ? 'Showing' : n.active ? 'Expired' : 'Hidden'}</span><span className="flag">{LV[n.level]}</span>{n.expires_at && <span className="flag">until {day(n.expires_at)}</span>}</div>
          </div>
          <div className="srow">
            <button className="btn g" onClick={() => set(n.id, { active: !n.active })}>{n.active ? 'Hide' : 'Show'}</button>
            <button className="btn g x" onClick={() => del(n.id)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}
