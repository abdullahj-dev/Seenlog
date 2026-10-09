'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppContext';

// Settings card: download everything you have here, or delete the account for good.
export default function AccountData() {
  const { L, prof, say, user } = useApp();
  const [ask, setAsk] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function download() {
    let feedback = [];
    if (supabase && user) { const { data } = await supabase.from('feedback').select('kind,body,status,admin_note,created_at').order('created_at'); feedback = data || []; }
    const out = { exported: new Date().toISOString(), account: user ? { email: user.email } : null, profile: prof || null, titles: L.current, feedback };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    a.download = 'seenlog-everything-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say('Downloaded');
  }

  async function wipe() {
    setErr(''); setBusy(true);
    try {
      const { data: files } = await supabase.storage.from('posters').list(user.id, { limit: 1000 });
      if (files?.length) await supabase.storage.from('posters').remove(files.map((f) => user.id + '/' + f.name));
    } catch {}
    const { error } = await supabase.rpc('delete_my_account');
    if (error) { setBusy(false); return setErr(error.message); }
    await supabase.auth.signOut().catch(() => {});
    try { Object.keys(localStorage).filter((k) => k.startsWith('seenlog')).forEach((k) => localStorage.removeItem(k)); } catch {}
    window.location.assign('/');
  }

  return (
    <div className="scard">
      <h3>Your data</h3>
      <button className="btn g" onClick={download}>Download everything (titles, profile, messages)</button>
      {user && !ask && <button className="btn g x" onClick={() => setAsk(true)}>Delete my account</button>}
      {user && ask && (<>
        <p className="msg err" style={{ margin: 0 }}>This removes your account, your whole list, your public page and your messages. It cannot be undone. Download a copy first if you want one.</p>
        <input className="fld" placeholder={'Type ' + user.email + ' to confirm'} aria-label="Type your email to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        {err && <p className="msg err" role="alert" style={{ margin: 0 }}>{err}</p>}
        <div className="srow">
          <button className="btn g x" disabled={busy || typed.trim().toLowerCase() !== user.email.toLowerCase()} onClick={wipe}>{busy ? 'Deleting...' : 'Delete forever'}</button>
          <button className="btn g" disabled={busy} onClick={() => { setAsk(false); setTyped(''); setErr(''); }}>Keep my account</button>
        </div>
      </>)}
    </div>
  );
}
