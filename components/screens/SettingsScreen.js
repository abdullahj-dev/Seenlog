'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ACCENTS, ST } from '@/lib/ui';
import { useApp } from '@/components/AppContext';
import AccountData from '@/components/screens/AccountData';

export default function SettingsScreen() {
  const { user, prof, uname, setUname, saveProfile, say, rmode, changeMode, setAccent, vibeOn, setVibeOn, showPub, togglePub, goal, setGoal, defaultStatus, setDefaultStatus, exportList, importList, file, setHelpOpen } = useApp();
  const [mail, setMail] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState('');
  const [calm, setCalm] = useState(false);
  useEffect(() => { try { setCalm(localStorage.getItem('seenlog_motion') === 'off'); } catch {} }, []);
  const keep = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const dropCache = () => { try { localStorage.removeItem('seenlog_cache'); } catch {} };

  async function changeEmail() {
    if (!/^\S+@\S+\.\S+$/.test(mail.trim())) return say('Enter a valid email address');
    setBusy('mail');
    const { error } = await supabase.auth.updateUser({ email: mail.trim() });
    setBusy(''); if (error) return say(error.message);
    setMail(''); say('Check both inboxes to confirm the change');
  }
  async function changePassword() {
    if (pw1.length < 8) return say('Use at least 8 characters');
    if (pw1 !== pw2) return say('The two passwords do not match');
    setBusy('pw');
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setBusy(''); if (error) return say(error.message);
    setPw1(''); setPw2(''); say('Password changed');
  }
  async function signOutAll() { await supabase.auth.signOut({ scope: 'global' }); dropCache(); say('Signed out on every device'); }
  function setMotion(off) { setCalm(off); keep('seenlog_motion', off ? 'off' : 'on'); if (off) document.documentElement.dataset.motion = 'off'; else delete document.documentElement.dataset.motion; }

  return (
    <section>
      <h2 className="rh d">Settings<small>{user ? user.email : 'not signed in'}</small></h2>
      <div className="settings">
        <div className="scard">
          <h3>Account</h3>
          {user ? (<>
            <input className="fld" type="email" placeholder="New email address" aria-label="New email address" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} />
            <button className="btn g" disabled={busy === 'mail' || !mail} onClick={changeEmail}>Change email</button>
            <input className="fld" type="password" placeholder="New password (8+ characters)" aria-label="New password" autoComplete="new-password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
            <input className="fld" type="password" placeholder="Repeat new password" aria-label="Repeat new password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <button className="btn g" disabled={busy === 'pw' || !pw1} onClick={changePassword}>Change password</button>
            <hr className="hr" />
            <button className="btn g" onClick={() => { supabase.auth.signOut(); dropCache(); }}>Sign out</button>
            <button className="btn g" onClick={signOutAll}>Sign out on every device</button>
          </>) : (<>
            <p className="tag" style={{ margin: 0 }}>You are using Seenlog without an account, so your list lives in this browser only.</p>
            {supabase ? <Link className="btn" href="/login">Sign in or create account</Link> : <p className="tag" style={{ margin: 0 }}>Accounts need the Supabase keys.</p>}
          </>)}
        </div>

        {user && prof && (
          <div className="scard">
            <h3>Your public page</h3>
            <div className="srow"><input className="fld" type="text" placeholder="choose a username" aria-label="Username" value={uname} maxLength={20} onChange={(e) => setUname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} /><button className="chip" disabled={!uname || uname === prof.username} onClick={() => saveProfile({ username: uname })}>Save</button></div>
            <small className="tag" style={{ margin: 0 }}>3 to 20 letters, numbers or underscores.</small>
            <label className="tog"><input type="checkbox" disabled={!prof.username} checked={!!prof.is_public} onChange={(e) => saveProfile({ is_public: e.target.checked })} /> Anyone with the link can see my titles, posters and ratings</label>
            <label className="tog"><input type="checkbox" disabled={!prof.is_public} checked={!!prof.share_reviews} onChange={(e) => saveProfile({ share_reviews: e.target.checked })} /> Also show my written notes as public reviews</label>
            {prof.is_public && prof.username && (<>
              <button className="btn g" onClick={() => { navigator.clipboard.writeText(location.origin + '/u/' + prof.username); say('Link copied'); }}>Copy public link</button>
              <a className="btn g" href={`/u/${prof.username}/opengraph-image`} target="_blank" rel="noopener noreferrer">Open my poster wall image</a>
            </>)}
            <small className="tag" style={{ margin: 0 }}>Diary entries always stay private. Notes stay private unless you turn reviews on, and you can lock any single note.</small>
          </div>
        )}

        <div className="scard">
          <h3>Appearance</h3>
          <div className="ratesel"><small>Accent colour</small><div className="swatches">{ACCENTS.map(([c, n]) => <button key={c} className="sw" style={{ background: c }} aria-label={n} title={n} onClick={() => setAccent(c)} />)}</div></div>
          <div className="ratesel"><small>Rating style</small>
            <select className="fld" value={rmode} onChange={(e) => changeMode(e.target.value)} aria-label="Rating style">
              <option value="10">Decimal, out of 10 (7.5)</option><option value="100">Out of 100 (75)</option><option value="5">Stars (4 stars)</option><option value="smiley">Faces</option>
            </select></div>
          <label className="tog"><input type="checkbox" checked={showPub} onChange={(e) => togglePub(e.target.checked)} /> Show public scores on cards</label>
          <label className="tog"><input type="checkbox" checked={calm} onChange={(e) => setMotion(e.target.checked)} /> Reduce animations (calmer, and lighter on slow phones)</label>
          <label className="tog"><input type="checkbox" checked={vibeOn} onChange={(e) => { setVibeOn(e.target.checked); keep('seenlog_vibe', e.target.checked ? '1' : '0'); }} /> Tiny vibration when rating (phones)</label>
        </div>

        <div className="scard">
          <h3>Your library</h3>
          <div className="ratesel"><small>New titles start as</small>
            <select className="fld" value={defaultStatus} onChange={(e) => { setDefaultStatus(e.target.value); keep('seenlog_defstatus', e.target.value); }} aria-label="Default status for new titles">
              {Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="ratesel"><small>Yearly goal (titles)</small>
            <input className="fld" key={goal} type="number" min="0" max="2000" defaultValue={goal || ''} placeholder="for example 50" aria-label="Yearly goal" onBlur={(e) => { const n = Math.max(0, Math.min(2000, parseInt(e.target.value) || 0)); setGoal(n); keep('seenlog_goal', String(n)); }} /></div>
          <button className="btn g" onClick={exportList}>Export my list (backup file)</button>
          <button className="btn g" onClick={() => file.current.click()}>Import a backup file</button>
          <input ref={file} type="file" accept=".json" hidden onChange={importList} />
          <Link className="btn g" href="/import">Import from a text list</Link>
          {user && <button className="btn g" onClick={() => { dropCache(); location.reload(); }}>Refresh my list from the cloud</button>}
        </div>

        <AccountData />

        <div className="scard">
          <h3>Help</h3>
          <button className="btn g" onClick={() => setHelpOpen(true)}>Keyboard shortcuts</button>
          <Link className="btn g" href="/feedback">Send feedback or report a problem</Link>
        </div>
      </div>
    </section>
  );
}
