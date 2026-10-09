'use client';
import '@/components/styles/admin.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppContext';

const WHY = ['Spam', 'Offensive or hateful', 'Pretending to be someone', 'Something else'];

// On someone's public page (/u/name) a quiet "Report this profile" button appears bottom left.
export default function ReportDock() {
  const { path, say, user } = useApp();
  const name = (/^\/u\/([^/]+)\/?$/.exec(path || '') || [])[1];
  const ref = useRef();
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(WHY[0]);
  const [more, setMore] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { const d = ref.current; if (open && d && !d.open) d.showModal(); if (!open && d?.open) d.close(); }, [open]);
  useEffect(() => { setOpen(false); }, [path]);
  if (!name || !supabase) return null;

  async function send(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const { error } = await supabase.from('feedback').insert({ kind: 'report', body: `Profile @${name}: ${why}${more.trim() ? '. ' + more.trim() : ''}`.slice(0, 2000), title_data: { profile: name } });
    setBusy(false);
    if (error) return setErr(error.message);
    setOpen(false); setMore(''); say('Report sent. Thank you.');
  }

  return (
    <>
      <button className="reportbtn" onClick={() => setOpen(true)}>Report this profile</button>
      <dialog ref={ref} className="cdlg" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}>
        {open && (user ? (
          <form className="cf" onSubmit={send}>
            <h2 className="d">Report @{name}</h2>
            <div className="prov">{WHY.map((w) => <button type="button" key={w} className="chip" aria-pressed={why === w} onClick={() => setWhy(w)}>{w}</button>)}</div>
            <textarea className="fld" rows={3} maxLength={600} placeholder="Anything else we should know (optional)" aria-label="More detail" value={more} onChange={(e) => setMore(e.target.value)} />
            {err && <p className="msg err" role="alert">{err}</p>}
            <div className="act"><button className="btn" disabled={busy}>{busy ? 'Sending...' : 'Send report'}</button><button type="button" className="btn g" onClick={() => setOpen(false)}>Cancel</button></div>
          </form>
        ) : (
          <div className="cf"><h2 className="d">Report @{name}</h2><p className="tag">Sign in so we can follow up if needed.</p><div className="act"><Link className="btn" href="/login" onClick={() => setOpen(false)}>Sign in</Link><button className="btn g" onClick={() => setOpen(false)}>Cancel</button></div></div>
        ))}
      </dialog>
    </>
  );
}
