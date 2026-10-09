'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppContext';

export default function LoginScreen() {
  const { user, router } = useApp();
  const [mode, setMode] = useState('in'); // in | up | forgot
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!supabase) return <section className="authpage scard"><h3>Accounts are not set up</h3><p className="tag">Add the Supabase keys to .env.local to turn on sign in. Until then your list is saved in this browser.</p><Link className="btn g" href="/">Back to my list</Link></section>;
  if (user) return <section className="authpage scard"><h3>You are signed in</h3><p className="tag">{user.email}</p><div className="act"><Link className="btn" href="/settings">Settings</Link><Link className="btn g" href="/">My list</Link></div></section>;

  async function submit(e) {
    e.preventDefault(); setMsg(null);
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setMsg({ err: 'Enter a valid email address.' });
    if (mode === 'up' && pw.length < 8) return setMsg({ err: 'Use at least 8 characters for your password.' });
    if (mode === 'up' && pw !== pw2) return setMsg({ err: 'The two passwords do not match.' });
    if (mode === 'in' && !pw) return setMsg({ err: 'Enter your password.' });
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: location.origin + '/reset-password' });
        if (error && /rate|limit|too many/i.test(error.message)) setMsg({ err: 'Too many reset emails were requested. Wait a few minutes and try again.' });
        else if (error && /fetch|network/i.test(error.message)) setMsg({ err: 'Could not reach the server. Check your connection and try again.' });
        else setMsg({ ok: 'If that email has an account, a reset link is on its way. Check your spam folder too.' });
      } else if (mode === 'up') {
        const { data, error } = await supabase.auth.signUp({ email: mail, password: pw, options: { emailRedirectTo: location.origin } });
        if (error) setMsg({ err: error.message });
        else if (!data.session) setMsg({ ok: 'Account created. Open the confirmation email, then sign in.' });
        else router.push('/');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pw });
        if (error) setMsg({ err: /invalid/i.test(error.message) ? 'That email and password do not match.' : error.message });
        else router.push('/');
      }
    } catch { setMsg({ err: 'Something went wrong. Try again.' }); }
    setBusy(false);
  }
  const go = (m) => { setMode(m); setMsg(null); };
  const title = { in: 'Welcome back', up: 'Create your account', forgot: 'Reset your password' }[mode];

  return (
    <section className="authpage">
      <form className="scard" onSubmit={submit} noValidate>
        <h3>{title}</h3>
        {mode !== 'forgot' && <div className="seg"><button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => go('in')}>Sign in</button><button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => go('up')}>Create account</button></div>}
        {mode === 'forgot' && <p className="tag" style={{ margin: 0 }}>Enter your email and we will send you a link to choose a new password.</p>}
        <input className="fld" type="email" autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'forgot' && (
          <div className="srow">
            <input className="fld" type={show ? 'text' : 'password'} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} placeholder={mode === 'up' ? 'Password (8+ characters)' : 'Password'} aria-label="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" className="chip" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
          </div>
        )}
        {mode === 'up' && <input className="fld" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="Repeat password" aria-label="Repeat password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'One moment...' : mode === 'up' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</button>
        {msg?.err && <p className="msg err" role="alert">{msg.err}</p>}
        {msg?.ok && <p className="msg" role="status">{msg.ok}</p>}
        {mode === 'in' && <button type="button" className="linkbtn" onClick={() => go('forgot')}>Forgot your password?</button>}
        {mode === 'forgot' && <button type="button" className="linkbtn" onClick={() => go('in')}>Back to sign in</button>}
        <small className="tag" style={{ margin: 0 }}>An account keeps your list on every device and lets you share a public page. You can also <Link href="/" style={{ color: 'var(--brass)' }}>keep using it without one</Link>.</small>
      </form>
    </section>
  );
}
