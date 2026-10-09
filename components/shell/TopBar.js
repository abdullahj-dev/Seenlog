'use client';
import Link from 'next/link';
import { SITE } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { KD, ACCENTS } from '@/lib/ui';
import { langName } from '@/lib/custom';
import { useApp } from '@/components/AppContext';
import ReplyDot, { ReplyCount } from '@/components/ReplyDot';

export default function TopBar() {
  const { isAdmin, add, authOpen, loose, setCustomOpen, setOpen, changeMode, chips, focused, onChange, open, q, recent, rmode, scrolled, sel, setAccent, setAuthOpen, setFocused, setHelpOpen, setQ, setSel, setTab, shown, tab, trend, user } = useApp();

  return (
    <>
<div className="top">
        <Link href="/" className={'minib d' + (scrolled ? ' on' : '')}>{SITE.name}</Link>
        <div className="find">
          <label htmlFor="q" className="sr">Find a movie, series or anime</label>
          <input id="q" type="search" autoComplete="off" placeholder="Search movies, series, anime   ( press / )" value={q}
            onFocus={() => setFocused(true)}
            onChange={(e) => { setSel(0); onChange(e.target.value); }}
            onKeyDown={(e) => {
              if (!open || !shown.length) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((sel + 1) % shown.length); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((sel + shown.length - 1) % shown.length); }
              if (e.key === 'Enter' && shown[sel]) add(shown[sel]);
            }} />
          {!open && focused && q.trim().length < 2 && (recent.length > 0 || trend.length > 0) && (
            <div id="res">
              {recent.length > 0 && <div className="sugg"><small>Recent searches</small><div className="prov">{recent.map((r) => <button key={r} className="chip" onClick={() => { setQ(r); setSel(0); onChange(r); }}>{r}</button>)}</div></div>}
              {trend.length > 0 && <div className="sugg"><small>Trending now, click to log</small><div className="prov">{trend.map((h) => <button key={h.key} className="mt" title={h.title} onClick={() => add(h)}><img src={h.poster} alt={h.title} loading="lazy" /></button>)}</div></div>}
            </div>
          )}
          {open && (
            <div id="res">
              <div className="tabs">{chips(KD, tab, setTab)}</div>
              {shown.map((h, i) => (
                <button className={'r' + (i === sel ? ' hi' : '')} key={h.key} onClick={() => add(h)}>
                  {h.poster ? <img src={h.poster} alt="" loading="lazy" /> : <i />}
                  <span><b>{h.title}</b><span className="kind">{KD[h.kind]}</span><small>{[h.year, h.lang && h.lang !== 'en' ? langName(h.lang) : ''].filter(Boolean).join(', ')}</small></span>
                </button>
              ))}
              {!shown.length && <div className="r"><span>No match in this tab.</span></div>}
              {loose && shown.length > 0 && <div className="loosenote">Includes close matches for other spellings.</div>}
              <button className="addmiss" onClick={() => { setCustomOpen({ seed: q.trim() }); setOpen(false); setFocused(false); setQ(''); }}>Cannot find it? Add {q.trim() ? '"' + q.trim() + '"' : 'it'} yourself</button>
            </div>
          )}
        </div>
        <div className="menu">
          <button className="avatar" aria-label="Account and quick settings" aria-expanded={authOpen} onClick={() => setAuthOpen(!authOpen)}>{user ? user.email[0].toUpperCase() : '☰'}<ReplyDot /></button>
          {authOpen && (
            <div className="pop">
              {user ? (<><p className="tag" style={{ margin: 0 }}>{user.email}</p><Link className="btn" href="/settings" onClick={() => setAuthOpen(false)}>Settings</Link>{isAdmin && <Link className="btn g" href="/admin" onClick={() => setAuthOpen(false)}>Admin</Link>}</>)
                : supabase ? (<><p className="tag" style={{ margin: 0 }}>Sign in to keep your list on every device and share it.</p><Link className="btn" href="/login" onClick={() => setAuthOpen(false)}>Sign in or create account</Link></>)
                : <p className="tag" style={{ margin: 0 }}>Saved in this browser only.</p>}
              <hr />
              <div className="ratesel"><small>Accent colour</small><div className="swatches">{ACCENTS.map(([c, n]) => <button key={c} className="sw" style={{ background: c }} aria-label={n} title={n} onClick={() => setAccent(c)} />)}</div></div>
              <div className="ratesel"><small>Rating style</small>
                <select value={rmode} onChange={(e) => changeMode(e.target.value)} aria-label="Rating style">
                  <option value="10">Decimal, out of 10 (7.5)</option><option value="100">Out of 100 (75)</option><option value="5">Stars (4 stars)</option><option value="smiley">Faces</option>
                </select></div>
              <button className="btn g" onClick={() => { setCustomOpen({ seed: '' }); setAuthOpen(false); }}>Add a title by hand</button>
              <Link className="btn g" href="/feedback" onClick={() => setAuthOpen(false)}>Send feedback <ReplyCount /></Link>
              <button className="btn g" onClick={() => { setHelpOpen(true); setAuthOpen(false); }}>Keyboard shortcuts</button>
              {user && <button className="btn g" onClick={() => { supabase.auth.signOut(); try { localStorage.removeItem('seenlog_cache'); } catch {} setAuthOpen(false); }}>Sign out</button>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
