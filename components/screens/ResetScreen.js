'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppContext';

export default function ResetScreen() {
  const { user, authReady, router } = useApp();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!supabase) return <section className="authpage scard"><h3>Accounts are not set up</h3><Link className="btn g" href="/">Back to my list</Link></section>;
  if (!authReady) return <section className="authpage scard"><h3>Checking your link...</h3></section>;
  if (!user) return <section className="authpage scard"><h3>Open the link from your email</h3><p className="tag">Reset links work once and expire after a while. Open it on this device, or ask for a new one.</p><Link className="btn" href="/login">Request a new link</Link></section>;

  async function submit(e) {
    e.preventDefault(); setMsg(null);
    if (pw.length < 8) return setMsg({ err: 'Use at least 8 characters.' });
    if (pw !== pw2) return setMsg({ err: 'The two passwords do not match.' });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ err: error.message });
    setMsg({ ok: 'Password changed. Taking you to your list...' });
    setTimeout(() => router.push('/'), 1400);
  }
  return (
    <section className="authpage">
      <form className="scard" onSubmit={submit} noValidate>
        <h3>Choose a new password</h3>
        <p className="tag" style={{ margin: 0 }}>For {user.email}</p>
        <div className="srow">
          <input className="fld" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="New password (8+ characters)" aria-label="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="chip" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
        </div>
        <input className="fld" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="Repeat new password" aria-label="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save new password'}</button>
        {msg?.err && <p className="msg err" role="alert">{msg.err}</p>}
        {msg?.ok && <p className="msg" role="status">{msg.ok}</p>}
      </form>
    </section>
  );
}
