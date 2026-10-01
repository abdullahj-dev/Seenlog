'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SITE } from '@/lib/config';
import { supabase } from '@/lib/supabase';

let M = SITE.ratingMode; // set from the viewer's own choice at the top of every render
const K = 'seenlog_v1';
const KD = { movie: 'Movie', series: 'Series', anime: 'Anime' };
const ST = { plan: 'Plan to watch', now: 'Watching', done: 'Watched' };
const F = ['😖', '🙁', '😐', '🙂', '🤩'];
const MOODS = ['Loved it', 'Moved me', 'Fun', 'Thrilling', 'Comforting', 'Mind-bending', 'Slow burn', 'Disappointing'];
const TAGS = ['great story', 'slow burn', 'beautiful', 'rewatchable', 'cried', 'funny', 'mind-bending', 'comfort', 'underrated', 'overrated'];
const MINOPTS = { 10: [[6, '6.0+'], [7, '7.0+'], [8, '8.0+'], [9, '9.0+']], 100: [[6, '60+'], [7, '70+'], [8, '80+'], [9, '90+']], 5: [[4, '★2+'], [6, '★3+'], [8, '★4+'], [10, '★5']], smiley: [[4, '🙁 or better'], [6, '😐 or better'], [8, '🙂 or better'], [10, '🤩 only']] };
const simUrl = (k) => (k.startsWith('al') ? `/api/similar?al=${k.slice(2)}` : `/api/similar?tm=${k.startsWith('tmmovie') ? 'movie' : 'tv'}&id=${k.replace(/^tm(movie|tv)/, '')}`);
const face = (v) => Math.max(0, Math.min(4, Math.floor((v - 0.1) / 20)));
const fmt = (v) => v == null ? '-' : M === '100' ? Math.round(v) : M === '5' ? '★' + (v / 20).toFixed(1).replace('.0', '') : M === 'smiley' ? F[face(v)] : (v / 10).toFixed(1);
const pad = (n) => String(n || 0).padStart(3, '0');
const bg = (u) => (u ? { backgroundImage: `url('${u}')` } : {});

const KINDW = { movie: 'movie', movies: 'movie', film: 'movie', films: 'movie', series: 'series', 'tv series': 'series', 'tv shows': 'series', 'tv show': 'series', tv: 'series', shows: 'series', anime: 'anime' };
const nrm = (t) => String(t).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
function parseList(text) {
  let kind = null; const seen = new Set(), out = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    if (/^\s*\/\//.test(raw) || !raw.trim()) continue;
    for (const part of raw.split(/\s+\|\s+/)) {
      let s = part.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/https?:\/\/\S+/g, ' ').split(/\s+->\s+/)[0].trim();
      if (!s) continue;
      const head = s.replace(/^[#*=\-\s]+/, '').replace(/[:\-=#*_\s]+$/, '').toLowerCase();
      if (KINDW[head] && s.length < 24) { kind = KINDW[head]; continue; }
      s = s.replace(/^(\s*(\d{1,3}[.)\]]|[-*•>]|\[[ xX✓]?\]|[✓✔✗✘❌✅=?]))+\s*/, '');
      let k = kind; const kh = s.match(/[(\[]\s*(movie|film|series|tv series|tv|anime)\s*[)\]]/i);
      if (kh) { k = KINDW[kh[1].toLowerCase()] || (kh[1].toLowerCase() === 'film' ? 'movie' : k); s = s.replace(kh[0], ' '); }
      const ym = s.match(/[(\[]\s*((?:19|20)\d\d)\s*[)\]]\s*$/) || s.match(/[\s,-]+((?:19|20)\d\d)\s*$/);
      const year = ym ? ym[1] : ''; if (ym) s = s.replace(ym[0], ' ');
      s = s.replace(/\bS\d{1,2}(E\d{1,3})?\b/gi, ' ').replace(/\bseason\s*\d+\b/gi, ' ').replace(/\b\d+(st|nd|rd|th)\s+season\b/gi, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').replace(/^[\s\-–:,;.]+|[\s\-–:,;.]+$/g, '');
      if (s.length < 2) continue;
      const id = nrm(s) + year; if (seen.has(id)) continue; seen.add(id);
      out.push({ raw: part.trim(), q: s, year, kind: k });
    }
  }
  return out;
}
function pickBest(row, hits) {
  const q = nrm(row.q);
  const sc = (h) => (nrm(h.title) === q ? 4 : nrm(h.title).includes(q) || q.includes(nrm(h.title)) ? 2 : 0) + (row.year && h.year === row.year ? 3 : 0) + (!row.kind || h.kind === row.kind ? 1 : 0);
  const ranked = hits.map((h, i) => ({ h, s: sc(h) - i * 0.01 })).sort((a, b) => b.s - a.s);
  const top = ranked[0]?.h;
  return { cands: ranked.map((r) => r.h), pick: top || null, sure: !!top && nrm(top.title) === q && (!row.year || top.year === row.year) };
}

function Shelf({ children, cls = '' }) {
  const r = useRef();
  const go = (n) => r.current.scrollBy({ left: n * r.current.clientWidth * 0.85, behavior: 'smooth' });
  return <div className={'shelfw ' + cls}><button className="arr l" aria-label="Scroll left" onClick={() => go(-1)}>‹</button><div className="shelf" ref={r}>{children}</div><button className="arr r" aria-label="Scroll right" onClick={() => go(1)}>›</button></div>;
}

export default function App() {
  const [lib, setLib] = useState([]);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [errs, setErrs] = useState({});
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [fS, setFS] = useState('all');
  const [fK, setFK] = useState('all');
  const [lq, setLq] = useState('');
  const [sort, setSort] = useState('recent');
  const [cur, setCur] = useState(null);
  const [toast, setToast] = useState('');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const path = usePathname();
  const router = useRouter();
  const [rmode, setRmode] = useState(SITE.ratingMode);
  M = rmode;
  const [fT, setFT] = useState('');
  const [fC, setFC] = useState('');
  const [impText, setImpText] = useState('');
  const [impRows, setImpRows] = useState([]);
  const [impBusy, setImpBusy] = useState(false);
  const [impProg, setImpProg] = useState(0);
  const [impStatus, setImpStatus] = useState('done');
  const [yr, setYr] = useState(new Date().getFullYear());
  const [sim, setSim] = useState(null);
  const [cap, setCap] = useState(48);
  const [dCap, setDCap] = useState(40);
  const [dPage, setDPage] = useState(1);
  const [dMore, setDMore] = useState(true);
  const [prof, setProf] = useState(null);
  const [uname, setUname] = useState('');
  const [dTab, setDTab] = useState('newest');
  const [dKind, setDKind] = useState('movie');
  const [dHits, setDHits] = useState([]);
  const [dBusy, setDBusy] = useState(false);
  const [because, setBecause] = useState(null);
  const [tonight, setTonight] = useState(null);
  const [showPub, setShowPub] = useState(false);
  const [minR, setMinR] = useState(0);
  const [mode, setMode] = useState('in');
  const [showPw, setShowPw] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const togglePub = (v) => { setShowPub(v); try { localStorage.setItem('seenlog_pub', v ? '1' : '0'); } catch {} };
  const L = useRef([]); L.current = lib;
  const timer = useRef(), run = useRef(0), tt = useRef(), dlg = useRef(), file = useRef(), keyRef = useRef(), addRef = useRef();

  const readLocal = () => { try { return JSON.parse(localStorage.getItem(K)) || []; } catch { return []; } };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, sess) => setUser(sess?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    let dead = false;
    (async () => {
      if (!supabase || !user) { setLib(readLocal()); setPending(0); setReady(true); return; }
      setReady(false);
      const { data, error } = await supabase.from('entries').select('data').eq('user_id', user.id);
      if (dead) return;
      if (error) { say('Could not load your list from your account'); setLib([]); }
      else {
        const cloud = data.map((r) => r.data);
        setLib(cloud);
        const have = new Set(cloud.map((x) => x.key));
        setPending(readLocal().filter((x) => !have.has(x.key)).length);
      }
      setReady(true);
    })();
    return () => { dead = true; };
  }, [user?.id, authReady]);
  const commit = (next) => {
    const prev = L.current; L.current = next; setLib(next);
    if (!supabase || !user) { try { localStorage.setItem(K, JSON.stringify(next)); } catch {} return; }
    const old = new Map(prev.map((x) => [x.key, JSON.stringify(x)]));
    const up = next.filter((x) => old.get(x.key) !== JSON.stringify(x)).map((x) => ({ key: x.key, data: x, updated_at: new Date().toISOString() }));
    const gone = prev.filter((x) => !next.some((y) => y.key === x.key)).map((x) => x.key);
    (async () => {
      if (up.length) { const { error } = await supabase.from('entries').upsert(up, { onConflict: 'user_id,key' }); if (error) say('Could not save to your account'); }
      if (gone.length) { const { error } = await supabase.from('entries').delete().eq('user_id', user.id).in('key', gone); if (error) say('Could not remove from your account'); }
    })();
  };
  async function signIn(mode) {
    setBusy(true); setAuthErr('');
    const creds = { email: email.trim(), password: pw };
    const { data, error } = mode === 'up' ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    if (error) setAuthErr(error.message);
    else if (mode === 'up' && !data.session) setAuthErr('Account created. Confirm the email we sent, then sign in.');
    else { setAuthOpen(false); setPw(''); }
    setBusy(false);
  }
  function moveLocal() {
    const have = new Set(L.current.map((x) => x.key));
    const add = readLocal().filter((x) => !have.has(x.key));
    commit([...L.current, ...add]); setPending(0); say(add.length + ' titles moved into your account');
  }
  const patch = (key, ch) => commit(L.current.map((x) => (x.key === key ? { ...x, ...ch } : x)));
  const say = (m) => { setToast(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(''), 2400); };

  const item = lib.find((x) => x.key === cur);
  useEffect(() => {
    const d = dlg.current; if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);

  useEffect(() => {
    if (!item || !item.key.startsWith('tm') || item.facts !== undefined) return;
    const tm = item.key.startsWith('tmmovie') ? 'movie' : 'tv', id = item.key.replace(/^tm(movie|tv)/, '');
    fetch(`/api/title?tm=${tm}&id=${id}`).then((r) => r.json()).then((d) => {
      if (d.error) return;
      const { backdrop, trailer, watch, tagline, score, airStatus, episodes, facts, seasons } = d;
      patch(item.key, { backdrop, trailer, watch: watch ?? null, tagline, score, airStatus, episodes, facts: facts || [], seasons: seasons || [] });
    }).catch(() => {});
  }, [item?.key]);
  useEffect(() => {
    const k = (e) => keyRef.current?.(e);
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  useEffect(() => {
    try { setShowPub(localStorage.getItem('seenlog_pub') === '1'); const m = localStorage.getItem('seenlog_mode'); if (m) setRmode(m); } catch {}
    const down = (e) => { if (!e.target.closest('.menu')) setAuthOpen(false); if (!e.target.closest('.find')) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') { setAuthOpen(false); setOpen(false); setHelpOpen(false); } };
    document.addEventListener('mousedown', down); window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', esc); };
  }, []);

  useEffect(() => {
    if (!supabase || !user) { setProf(null); return; }
    supabase.from('profiles').select('username,is_public,share_reviews,rating_mode,public_cols').eq('id', user.id).maybeSingle().then(({ data }) => { setProf(data || { username: null, is_public: false, public_cols: [] }); setUname(data?.username || ''); if (data?.rating_mode) { setRmode(data.rating_mode); try { localStorage.setItem('seenlog_mode', data.rating_mode); } catch {} } });
  }, [user?.id]);
  function togglePubCol(c) {
    const cur = prof?.public_cols || [];
    saveProfile({ public_cols: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] });
  }
  async function shareCol(c) {
    const url = `${location.origin}/u/${prof.username}/c/${encodeURIComponent(c)}`;
    try { if (navigator.share) await navigator.share({ title: `${c} by ${prof.username}`, url }); else { await navigator.clipboard.writeText(url); say('Link copied'); } } catch {}
  }
  function changeMode(m) {
    setRmode(m); setMinR(0);
    try { localStorage.setItem('seenlog_mode', m); } catch {}
    window.dispatchEvent(new CustomEvent('seenlog:mode', { detail: m }));
    if (prof) saveProfile({ rating_mode: m });
  }
  async function saveProfile(ch) {
    const { error } = await supabase.from('profiles').update(ch).eq('id', user.id);
    if (error) return say(error.code === '23505' ? 'That username is taken' : error.code === '23514' ? 'Use 3 to 20 lowercase letters, numbers or underscores' : 'Could not save. Did you run the new SQL?');
    setProf({ ...prof, ...ch }); say('Saved');
  }

  useEffect(() => { setCap(48); }, [fS, fK, lq, sort, minR, fT, fC]);

  useEffect(() => {
    if (!item || !/^(tm|al)/.test(item.key)) return;
    let dead = false;
    fetch(simUrl(item.key)).then((r) => r.json()).then((d) => { if (!dead) setSim({ key: item.key, hits: d.hits || [] }); }).catch(() => {});
    return () => { dead = true; };
  }, [item?.key]);

  useEffect(() => { const keys = lib.map((x) => x.key); window.__slKeys = keys; window.dispatchEvent(new CustomEvent('seenlog:keys', { detail: keys })); }, [lib]);
  addRef.current = add;
  useEffect(() => {
    const h = (e) => addRef.current?.(e.detail);
    window.addEventListener('seenlog:add', h);
    return () => window.removeEventListener('seenlog:add', h);
  }, []);

  function onChange(v) {
    setQ(v); clearTimeout(timer.current);
    const my = ++run.current;
    if (v.trim().length < 2) { setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const d = await (await fetch('/api/search?q=' + encodeURIComponent(v.trim()))).json();
        if (my !== run.current) return;
        setHits(d.hits || []); setErrs(d.errors || {}); setOpen(true);
      } catch { say('Search failed. Check your connection.'); }
    }, 350);
  }

  async function add(h) {
    setOpen(false); setQ('');
    if (L.current.some((x) => x.key === h.key)) { say('Already in your list'); return setCur(h.key); }
    say('Adding ' + h.title + '...');
    try {
      let f = h.item;
      if (!f) { f = await (await fetch(h.src === 'al' ? `/api/title?al=${h.id}` : `/api/title?tm=${h.tm}&id=${h.id}`)).json(); if (f.error) throw new Error(f.error); }
      const entry = { kind: h.kind, title: h.title, year: h.year, poster: h.poster, ...f, key: h.key,
        no: Math.max(0, ...L.current.map((x) => x.no || 0)) + 1, status: 'plan', rating: null, notes: '', added: Date.now() };
      commit([entry, ...L.current]); say('Logged: ' + h.title); setCur(h.key);
    } catch { say('Could not load details. Try again.'); }
  }

  const remove = () => { if (confirm('Remove ' + item.title + ' from your list?')) { commit(lib.filter((x) => x.key !== cur)); setCur(null); say('Removed'); } };
  const exportList = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(lib, null, 1)], { type: 'application/json' })); a.download = SITE.name.toLowerCase() + '-backup.json'; a.click(); };
  async function importList(e) {
    try {
      const d = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(d)) throw 0;
      const have = new Set(lib.map((x) => x.key));
      const add = d.filter((x) => x && x.key && x.title && !have.has(x.key)).map((x) => ({ genres: [], notes: '', status: 'plan', rating: null, added: Date.now(), ...x }));
      commit([...lib, ...add]); say(add.length + ' imported');
    } catch { say('That file is not a valid backup'); }
    e.target.value = '';
  }

  const s = lq.toLowerCase();
  const list = lib.filter((x) => (fS === 'all' || x.status === fS) && (fK === 'all' || x.kind === fK) && (minR === 0 || (x.rating != null && x.rating >= minR * 10)) && (!fT || (x.tags || []).includes(fT)) && (!fC || (x.cols || []).includes(fC)) && (!s || [x.title, (x.genres || []).join(' '), x.director, x.writer, x.cast, x.overview, x.notes, (x.tags || []).join(' '), (x.cols || []).join(' '), (x.log || []).map((l) => [l.with, l.mood, l.line].join(' ')).join(' ')].join(' ').toLowerCase().includes(s)))
    .sort(sort === 'pub' ? (a, b) => (b.score ?? -1) - (a.score ?? -1) : sort === 'rating' ? (a, b) => (b.rating ?? -1) - (a.rating ?? -1) : sort === 'year' ? (a, b) => (+b.year || 0) - (+a.year || 0) : sort === 'title' ? (a, b) => a.title.localeCompare(b.title) : (a, b) => b.added - a.added);
  const done = lib.filter((x) => x.status === 'done').length, rated = lib.filter((x) => x.rating != null);
  const pct = lib.length ? Math.round((done / lib.length) * 100) : 0;
  const shown = tab === 'all' ? hits : hits.filter((h) => h.kind === tab);
  const failed = Object.entries(errs).filter(([, v]) => v);
  const today = () => new Date().toISOString().slice(0, 10);
  const logWatch = (it) => patch(it.key, { log: [...(it.log || []), { id: Date.now(), d: today(), with: '', mood: '', line: '' }], status: 'done' });
  const setLog = (it, i, ch) => patch(it.key, { log: (it.log || []).flatMap((l, j) => (j !== i ? [l] : ch ? [{ ...l, ...ch }] : [])) });
  async function share(it) {
    const last = it.log?.at(-1)?.line;
    const t = `${it.title}${it.year ? ' (' + it.year + ')' : ''}${it.rating != null ? ', I rated it ' + fmt(it.rating) : ''}${last ? '. "' + last + '"' : ''}`;
    try { if (navigator.share) await navigator.share({ title: it.title, text: t, url: location.origin }); else { await navigator.clipboard.writeText(t + ' ' + location.origin); say('Copied. Paste it anywhere.'); } } catch {}
  }
  function pickTonight(skip) {
    const g = {};
    lib.filter((x) => x.rating != null).forEach((x) => (x.genres || []).forEach((n) => { (g[n] = g[n] || []).push(x.rating / 10); }));
    const t = Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
    const pool = lib.filter((x) => x.status === 'plan' && x.key !== skip);
    if (!pool.length) { say('Add some titles to Plan to watch first'); return; }
    const best = pool.map((x) => {
      const gs = (x.genres || []).filter((n) => t[n] != null).sort((a, b) => t[b] - t[a]);
      const sc = gs.length ? gs.reduce((a, n) => a + t[n], 0) / gs.length : 6;
      return { x, s: sc + Math.random() * 1.5, why: gs.length ? `You rate ${gs[0]} titles ${fmt(t[gs[0]] * 10)} on average` : 'Something new for you' };
    }).sort((a, b) => b.s - a.s)[0];
    setTonight(best);
  }
  useEffect(() => {
    if (path !== '/discover' || !ready || because) return;
    const seeds = lib.filter((x) => x.rating >= 80 && /^(tm|al)/.test(x.key)).sort((a, b) => b.rating - a.rating).slice(0, 5);
    if (!seeds.length) return;
    const x = seeds[Math.floor(Math.random() * seeds.length)];
    fetch(simUrl(x.key)).then((r) => r.json()).then((d) => setBecause({ title: x.title, rating: x.rating, hits: d.hits || [] })).catch(() => {});
  }, [path, ready]);
  useEffect(() => {
    if (!ready || path !== '/' || lib.length || user) return;
    try { if (sessionStorage.getItem('seenlog_landed')) return; sessionStorage.setItem('seenlog_landed', '1'); } catch {}
    router.replace('/discover');
  }, [ready, path]);
  const pills = (obj, val, set) => Object.entries(obj).map(([k, v]) => <button key={k} className="chip" aria-pressed={val === k} onClick={() => set(k)}>{v}</button>);
  const dcard = (h) => (
    <article className="card" key={h.key}>
      <button className="pb" onClick={() => add(h)}>
        <div className={'poster' + (h.poster ? '' : ' blank')} style={bg(h.poster)}>{h.poster ? '' : h.title}{lib.some((x) => x.key === h.key) && <span className="st done">In your list</span>}</div>
        <div className="stub"><b>{h.title}</b><small>{KD[h.kind]}{h.year ? ', ' + h.year : ''}</small></div>
      </button>
    </article>
  );
  const fresh = (a) => a.filter((h) => !lib.some((x) => x.key === h.key));
  const discover = because?.hits.length > 0 && fresh(because.hits).length > 0 ? (
    <section><h2 className="rh d" style={{ fontSize: '1.3rem' }}>Because you rated {because.title} {fmt(because.rating)}</h2><Shelf>{fresh(because.hits).slice(0, 14).map(dcard)}</Shelf></section>
  ) : null;
  const entries = lib.flatMap((x) => (x.log || []).map((l, i) => ({ x, l, i }))).sort((a, b) => (b.l.d || '').localeCompare(a.l.d || ''));
  const months = entries.slice(0, dCap).reduce((m, e) => { const k = (e.l.d || 'Undated').slice(0, 7); (m[k] = m[k] || []).push(e); return m; }, {});
  const diary = (
    <section>
      <h2 className="rh d">Diary<small>{entries.length} {entries.length === 1 ? 'watch' : 'watches'}, {entries.filter((e) => e.i > 0).length} rewatches</small></h2>
      {!entries.length && <p className="none">Nothing logged yet. Open a title and press Log that I watched it.</p>}
      {Object.entries(months).map(([k, a]) => (
        <div key={k}><h3 className="month d">{k === 'Undated' ? k : new Date(k + '-01T00:00:00').toLocaleString('en', { month: 'long', year: 'numeric' })}</h3>
          {a.map(({ x, l, i }) => (
            <button className="de" key={x.key + (l.id ?? i)} onClick={() => setCur(x.key)}>
              {x.poster ? <img src={x.poster} alt="" loading="lazy" /> : <i />}
              <span><b>{x.title}{i > 0 ? ' ↻' : ''}</b><small>{[l.d, l.with && 'with ' + l.with, l.mood, x.rating != null && 'rated ' + fmt(x.rating)].filter(Boolean).join(', ')}</small>{l.line && <q>{l.line}</q>}</span>
            </button>
          ))}
        </div>
      ))}
      {entries.length > dCap && <button className="btn g more" onClick={() => setDCap(dCap + 40)}>Show older ({entries.length - dCap} more)</button>}
    </section>
  );
  keyRef.current = (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); document.getElementById('q')?.focus(); return; }
    if (e.key === '?') { setCur(null); setHelpOpen((h) => !h); return; }
    if (!item) return;
    const i = list.findIndex((x) => x.key === item.key);
    if (e.key === 'ArrowRight' && list[i + 1]) setCur(list[i + 1].key);
    if (e.key === 'ArrowLeft' && list[i - 1]) setCur(list[i - 1].key);
    if (e.key.length === 1 && '123'.includes(e.key)) patch(item.key, { status: ['plan', 'now', 'done'][+e.key - 1] });
    if (e.key === 'w' && item.watch?.link) window.open(item.watch.link, '_blank', 'noopener');
    if (e.key === 't' && item.trailer) window.open(item.trailer, '_blank', 'noopener');
  };
  const chips = (obj, val, set) => Object.entries({ all: 'All', ...obj }).map(([k, v]) => <button key={k} className="chip" aria-pressed={val === k} onClick={() => set(k)}>{v}</button>);

  function Rating() {
    const v = item.rating;
    if (M === '5') return [0, 1, 2, 3, 4].map((i) => <button key={i} className={v >= i * 20 + 20 ? 'on' : ''} aria-label={i + 1 + ' stars'} onClick={() => patch(item.key, { rating: i * 20 + 20 })}>★</button>);
    if (M === 'smiley') return F.map((f, i) => <button key={i} className={v != null && face(v) === i ? 'on' : ''} onClick={() => patch(item.key, { rating: i * 20 + 20 })}>{f}</button>);
    const h = M === '100';
    return <input type="number" min="0" max={h ? 100 : 10} step={h ? 1 : 0.1} key={item.key + M} defaultValue={v == null ? '' : h ? v : v / 10} placeholder={h ? '0-100' : '0-10'} aria-label="Your rating"
      onBlur={(e) => { const t = e.target.value; patch(item.key, { rating: t === '' ? null : Math.min(100, Math.max(0, +t * (h ? 1 : 10))) }); }} />;
  }

  const byNew = [...lib].sort((a, b) => b.added - a.added);
  const filtering = fS !== 'all' || fK !== 'all' || lq || minR || fT || fC;
  const rows = [['Continue watching', byNew.filter((x) => x.status === 'now')], ['Up next', byNew.filter((x) => x.status === 'plan').slice(0, 14)],
    ['Your top rated', lib.filter((x) => x.rating != null).sort((a, b) => b.rating - a.rating).slice(0, 14)]].filter(([, a]) => a.length);
  const jump = () => document.getElementById('all')?.scrollIntoView({ behavior: 'smooth' });
  const tiles = [['Watched', done, () => { setFS('done'); setFK('all'); jump(); }], ['Watching', lib.filter((x) => x.status === 'now').length, () => { setFS('now'); setFK('all'); jump(); }],
    ['Plan to watch', lib.filter((x) => x.status === 'plan').length, () => { setFS('plan'); setFK('all'); jump(); }], ['Average', rated.length ? fmt(rated.reduce((t, x) => t + x.rating, 0) / rated.length) : '-', null],
    ['Movies', lib.filter((x) => x.kind === 'movie').length, () => { setFK('movie'); setFS('all'); jump(); }], ['Series', lib.filter((x) => x.kind === 'series').length, () => { setFK('series'); setFS('all'); jump(); }],
    ['Anime', lib.filter((x) => x.kind === 'anime').length, () => { setFK('anime'); setFS('all'); jump(); }]];
  const card = (x) => (
    <article className="card" key={x.key}>
      <button className="pb" onClick={() => setCur(x.key)}>
        <div className={'poster' + (x.poster ? '' : ' blank')} style={bg(x.poster)}>
          {x.poster ? '' : x.title}<span className={'st ' + x.status}>{ST[x.status]}</span>{x.rating != null && <span className="stamp">{fmt(x.rating)}</span>}{showPub && x.score != null && <span className="pubb" title="Public score">{fmt(x.score * 10)}</span>}{(x.log?.length || 0) > 1 && <span className="rew" title="Times watched">↻{x.log.length}</span>}
        </div>
        <div className="stub"><b>{x.title}</b><small>No. {pad(x.no)}, {KD[x.kind]}{x.year ? ', ' + x.year : ''}{x.status === 'now' && x.progress?.e != null ? ', ' + (x.progress.s ? 'S' + x.progress.s + ' ' : '') + 'E' + x.progress.e : ''}</small></div>
      </button>
      <div className="ov"><small>{(x.genres || []).slice(0, 3).join(', ')}</small>
        <div>{x.status !== 'now' && <button className="btn" onClick={() => patch(x.key, { status: 'now' })}>Start</button>}{x.status !== 'done' && <button className="btn g" onClick={() => patch(x.key, { status: 'done' })}>Done</button>}</div></div>
    </article>
  );

  const Y = String(yr), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dates = lib.flatMap((x) => x.log?.length ? x.log.map((l, i) => ({ x, d: l.d || '', i, mood: l.mood })) : x.status === 'done' && x.added ? [{ x, d: new Date(x.added).toISOString().slice(0, 10), i: 0, mood: '' }] : []).filter((e) => e.d.startsWith(Y));
  const inYear = [...new Map(dates.map((e) => [e.x.key, e.x])).values()];
  const gC = {}; inYear.forEach((x) => (x.genres || []).forEach((g) => { gC[g] = (gC[g] || 0) + 1; }));
  const topG = Object.entries(gC).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const mC = Array(12).fill(0); dates.forEach((e) => { mC[+e.d.slice(5, 7) - 1]++; });
  const moodC = {}; dates.forEach((e) => { if (e.mood) moodC[e.mood] = (moodC[e.mood] || 0) + 1; });
  const yR = inYear.filter((x) => x.rating != null), yAvg = yR.length ? yR.reduce((t, x) => t + x.rating, 0) / yR.length : null;
  const yTop = [...yR].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const yearsAvail = [...new Set([new Date().getFullYear(), ...lib.flatMap((x) => (x.log || []).map((l) => +(l.d || '').slice(0, 4))).filter(Boolean), ...lib.filter((x) => x.added).map((x) => new Date(x.added).getFullYear())])].sort((a, b) => b - a);
  const bar = (n, max) => <i className="bt"><span className="barfill" style={{ width: (max ? (n / max) * 100 : 0) + '%' }} /></i>;
  async function shareYear() {
    const t = `My ${yr} on ${SITE.name}: ${dates.length} watches, ${inYear.length} titles${topG[0] ? ', top genre ' + topG[0][0] : ''}${yAvg != null ? ', average rating ' + fmt(yAvg) : ''}.`;
    try { if (navigator.share) await navigator.share({ title: `My ${yr}`, text: t, url: location.origin }); else { await navigator.clipboard.writeText(t + ' ' + location.origin); say('Copied. Paste it anywhere.'); } } catch {}
  }
  const year = (
    <section>
      <h2 className="rh d">Year in review<small><select value={yr} onChange={(e) => setYr(+e.target.value)} aria-label="Year">{yearsAvail.map((y) => <option key={y}>{y}</option>)}</select></small></h2>
      {!dates.length ? <p className="none">Nothing logged in {yr} yet. Log watches in the diary and they show up here.</p> : (<>
        <div className="stats">
          {[['Watches', dates.length], ['Titles', inYear.length], ['Rewatches', dates.filter((e) => e.i > 0).length], ['Average rating', yAvg != null ? fmt(yAvg) : '-']].map(([l, n]) => <div className="stat" key={l}><b>{n}</b><small>{l}</small></div>)}
        </div>
        {topG.length > 0 && <><h3 className="rh d" style={{ fontSize: '1.3rem' }}>Top genres</h3><div className="bars">{topG.map(([g, n]) => <div className="brow" key={g}><span>{g}</span>{bar(n, topG[0][1])}<em>{n}</em></div>)}</div></>}
        <h3 className="rh d" style={{ fontSize: '1.3rem' }}>By month</h3>
        <div className="bars">{mC.map((n, i) => <div className="brow" key={i}><span>{MON[i]}</span>{bar(n, Math.max(...mC))}<em>{n}</em></div>)}</div>
        {Object.keys(moodC).length > 0 && <><h3 className="rh d" style={{ fontSize: '1.3rem' }}>Moods</h3><div className="prov">{Object.entries(moodC).sort((a, b) => b[1] - a[1]).map(([m, n]) => <span key={m}>{m} {n}</span>)}</div></>}
        {yTop.length > 0 && <><h3 className="rh d" style={{ fontSize: '1.3rem' }}>Best of {yr}</h3><Shelf>{yTop.map(card)}</Shelf></>}
        <button className="btn more" onClick={shareYear}>Share my year</button>
      </>)}
    </section>
  );

  const tagCount = {}, colCount = {};
  lib.forEach((x) => { (x.tags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }); (x.cols || []).forEach((c) => { colCount[c] = (colCount[c] || 0) + 1; }); });
  const toggleIn = (it, f, v) => patch(it.key, { [f]: (it[f] || []).includes(v) ? it[f].filter((t) => t !== v) : [...(it[f] || []), v] });
  const addNew = (it, f, raw, clear) => {
    const v = f === 'tags' ? raw.trim().toLowerCase().slice(0, 30) : raw.trim().slice(0, 30);
    if (!v) return;
    if (!(it[f] || []).includes(v)) patch(it.key, { [f]: [...(it[f] || []), v] });
    clear();
  };

  async function runMatch() {
    const rows = parseList(impText);
    if (!rows.length) return say('Nothing to import. Paste your list first.');
    setImpBusy(true); setImpRows([]); setImpProg(0);
    const out = []; let next = 0, done = 0, warned = false;
    async function worker() {
      while (next < rows.length) {
        const k = next++, r = rows[k]; let hits = [];
        try { const p = new URLSearchParams({ q: r.q }); if (r.kind) p.set('kind', r.kind); const d = await (await fetch('/api/match?' + p)).json(); hits = d.hits || []; if (d.error && !hits.length && !warned) { warned = true; say(d.error); } } catch {}
        const b = pickBest(r, hits);
        out[k] = { ...r, id: k, cands: b.cands, pick: b.pick?.key || '', state: !b.pick ? 'none' : b.sure ? 'ok' : 'guess', include: !!b.pick && !L.current.some((x) => x.key === b.pick.key), dupe: !!b.pick && L.current.some((x) => x.key === b.pick.key) };
        setImpProg(Math.round((++done / rows.length) * 100));
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    setImpRows(out); setImpBusy(false);
  }
  async function runImport() {
    const chosen = impRows.filter((r) => r.include && r.pick && !r.dupe);
    if (!chosen.length) return say('Nothing selected');
    setImpBusy(true); setImpProg(0);
    const made = [], res = {}; let next = 0, done = 0;
    async function worker() {
      while (next < chosen.length) {
        const r = chosen[next++], h = r.cands.find((c) => c.key === r.pick);
        try {
          if (made.some((m) => m.key === h.key)) { res[r.id] = 'dupe'; continue; }
          let f = h.item;
          if (!f) { f = await (await fetch(h.src === 'al' ? `/api/title?al=${h.id}` : `/api/title?tm=${h.tm}&id=${h.id}`)).json(); if (f.error) throw 0; }
          made.push({ kind: h.kind, title: h.title, year: h.year, poster: h.poster, ...f, key: h.key, status: impStatus, rating: null, notes: '', added: Date.now() - r.id });
          res[r.id] = 'added';
        } catch { res[r.id] = 'failed'; }
        setImpProg(Math.round((++done / chosen.length) * 100));
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    made.sort((a, b) => b.added - a.added);
    let n = Math.max(0, ...L.current.map((x) => x.no || 0));
    commit([...made.map((m) => ({ ...m, no: ++n })), ...L.current]);
    setImpRows(impRows.map((r) => ({ ...r, result: res[r.id] })));
    setImpBusy(false); say(made.length + ' titles added');
  }
  function downloadReport() {
    const lines = ['// Seenlog import report. ✓ added, = already in your list, ✗ not found or failed, ? unchecked guess, - skipped by you.', '// You can paste this whole file back into Import and it will work.'];
    impRows.forEach((r) => {
      const h = r.cands.find((c) => c.key === r.pick);
      const mark = r.result === 'added' ? '✓' : r.result === 'failed' || !r.pick ? '✗' : r.dupe || r.result === 'dupe' ? '=' : r.include ? '?' : '-';
      lines.push(`${mark} ${r.raw}${h ? '  ->  ' + h.title + (h.year ? ' (' + h.year + ')' : '') + ', ' + KD[h.kind] : '  ->  not found'}`);
    });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' })); a.download = 'import-report.txt'; a.click();
  }
  const cnt = (st) => impRows.filter((r) => r.state === st).length;
  const setRow = (id, ch) => setImpRows(impRows.map((x) => (x.id === id ? { ...x, ...ch } : x)));
  const imp = (
    <section>
      <h2 className="rh d">Import a list<small>paste names, or open a .txt file</small></h2>
      <textarea className="imp" value={impText} onChange={(e) => setImpText(e.target.value)} placeholder={'Movies:\nInception (2010)\n2. the prestige\nSeries\n- Breaking Bad\nSteins;Gate (anime)'} />
      <div className="bar">
        <label className="btn g">Open .txt file<input type="file" accept=".txt,.md,.csv" hidden onChange={async (e) => { if (e.target.files[0]) setImpText(await e.target.files[0].text()); e.target.value = ''; }} /></label>
        <span className="gap" />
        <select value={impStatus} onChange={(e) => setImpStatus(e.target.value)} aria-label="Mark imported titles as">{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>Mark all as {v}</option>)}</select>
        <button className="btn" disabled={impBusy || !impText.trim()} onClick={runMatch}>Find matches</button>
      </div>
      {impBusy && <div className="pbar"><span style={{ width: impProg + '%' }} /></div>}
      {impRows.length > 0 && (<>
        <p className="tag">✓ {cnt('ok')} sure, ? {cnt('guess')} worth a look, ✗ {cnt('none')} not found. Untick anything you do not want, or pick a different match.</p>
        <div className="improws">{impRows.map((r) => (
          <div className={'ir ' + r.state} key={r.id}>
            <input type="checkbox" checked={!!r.include} disabled={!r.pick || r.dupe} onChange={(e) => setRow(r.id, { include: e.target.checked })} aria-label={'Include ' + r.raw} />
            <span className="mk">{r.result === 'added' ? '✓✓' : r.state === 'ok' ? '✓' : r.state === 'guess' ? '?' : '✗'}</span>
            <span className="rawt" title={r.raw}>{r.raw}</span>
            {r.cands.length ? <select value={r.pick} onChange={(e) => setRow(r.id, { pick: e.target.value, include: !L.current.some((x) => x.key === e.target.value), dupe: L.current.some((x) => x.key === e.target.value), state: 'guess' })}>{r.cands.map((c) => <option key={c.key} value={c.key}>{c.title} ({c.year || '?'}, {KD[c.kind]})</option>)}</select> : <em>no match</em>}
            {r.dupe && <small>already in your list</small>}
          </div>
        ))}</div>
        <div className="act"><button className="btn" disabled={impBusy} onClick={runImport}>Add {impRows.filter((r) => r.include && r.pick && !r.dupe).length} titles</button><button className="btn g" onClick={downloadReport}>Download report (.txt)</button></div>
      </>)}
    </section>
  );

  return (
    <>
      <div className="top">
        <div className="find">
          <label htmlFor="q" className="sr">Find a movie, series or anime</label>
          <input id="q" type="search" autoComplete="off" placeholder="Search movies, series, anime   ( press / )" value={q}
            onChange={(e) => { setSel(0); onChange(e.target.value); }}
            onKeyDown={(e) => {
              if (!open || !shown.length) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((sel + 1) % shown.length); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((sel + shown.length - 1) % shown.length); }
              if (e.key === 'Enter' && shown[sel]) add(shown[sel]);
            }} />
          {open && (
            <div id="res">
              <div className="tabs">{chips(KD, tab, setTab)}</div>
              {shown.map((h, i) => (
                <button className={'r' + (i === sel ? ' hi' : '')} key={h.key} onClick={() => add(h)}>
                  {h.poster ? <img src={h.poster} alt="" loading="lazy" /> : <i />}
                  <span><b>{h.title}</b><span className="kind">{KD[h.kind]}</span><small>{h.year}</small></span>
                </button>
              ))}
              {!shown.length && <div className="r"><span>No match in this tab.</span></div>}
            </div>
          )}
        </div>
        <div className="menu">
          <button className="avatar" aria-label="Account and list menu" aria-expanded={authOpen} onClick={() => setAuthOpen(!authOpen)}>{user ? user.email[0].toUpperCase() : '☰'}</button>
          {authOpen && (
            <div className="pop">
              {supabase && (user ? <><p className="tag" style={{ margin: 0 }}>{user.email}</p><button className="btn g" onClick={() => { supabase.auth.signOut(); setAuthOpen(false); }}>Sign out</button>
                  {prof && (
                    <div className="pub">
                      <b>Your public page</b>
                      <div className="pw"><input type="text" placeholder="choose a username" value={uname} maxLength={20} onChange={(e) => setUname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} /><button className="chip" disabled={!uname || uname === prof.username} onClick={() => saveProfile({ username: uname })}>Save</button></div>
                      <label className="tog"><input type="checkbox" disabled={!prof.username} checked={!!prof.is_public} onChange={(e) => saveProfile({ is_public: e.target.checked })} /> Anyone with the link can see my titles, posters and ratings</label>
                      <label className="tog"><input type="checkbox" disabled={!prof.is_public} checked={!!prof.share_reviews} onChange={(e) => saveProfile({ share_reviews: e.target.checked })} /> Also show my written notes as public reviews</label>
                      {prof.is_public && prof.username && <button className="btn g" onClick={() => { navigator.clipboard.writeText(location.origin + '/u/' + prof.username); say('Link copied'); }}>Copy public link</button>}
                      {prof.is_public && prof.username && <a className="btn g" href={`/u/${prof.username}/opengraph-image`} target="_blank" rel="noopener noreferrer">Open my poster wall image</a>}
                      <small className="tag" style={{ margin: 0 }}>Diary entries always stay private. Notes stay private unless you turn reviews on, and you can lock any single note.</small>
                    </div>
                  )}</>
                : <form className="auth" onSubmit={(e) => { e.preventDefault(); signIn(mode); }}>
                    <div className="seg"><button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => { setMode('in'); setAuthErr(''); }}>Sign in</button><button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => { setMode('up'); setAuthErr(''); }}>Create account</button></div>
                    <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <div className="pw"><input type={showPw ? 'text' : 'password'} required minLength={6} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} placeholder="Password (6+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} /><button type="button" className="chip" onClick={() => setShowPw(!showPw)}>{showPw ? 'Hide' : 'Show'}</button></div>
                    <button className="btn" type="submit" disabled={busy}>{busy ? 'One moment...' : mode === 'up' ? 'Create account' : 'Sign in'}</button>
                    {authErr && <p>{authErr}</p>}
                  </form>)}
              <hr />
              <p className="tag" style={{ margin: 0 }}>{user ? 'Saved to your account.' : supabase ? 'Saved in this browser. Sign in to keep it across devices.' : 'Saved in this browser only.'}</p>
              <div className="ratesel"><small>Rating style</small>
                <select value={rmode} onChange={(e) => changeMode(e.target.value)} aria-label="Rating style">
                  <option value="10">Decimal, out of 10 (7.5)</option><option value="100">Out of 100 (75)</option><option value="5">Stars (4 stars)</option><option value="smiley">Faces</option>
                </select></div>
              <label className="tog"><input type="checkbox" checked={showPub} onChange={(e) => togglePub(e.target.checked)} /> Show public scores on cards</label>
              <button className="btn g" onClick={() => { setHelpOpen(true); setAuthOpen(false); }}>Keyboard shortcuts</button>
              <button className="btn g" onClick={exportList}>Export list</button>
              <button className="btn g" onClick={() => file.current.click()}>Import list</button>
              <input ref={file} type="file" accept=".json" hidden onChange={importList} />
            </div>
          )}
        </div>
      </div>
      <nav className="nav" aria-label="Pages">
        <Link href="/" className={path === '/' ? 'on' : ''}>My list</Link>
        <Link href="/diary" className={path === '/diary' ? 'on' : ''}>Diary</Link>
        <Link href="/discover" className={path === '/discover' ? 'on' : ''}>Discover</Link>
        <Link href="/year" className={path === '/year' ? 'on' : ''}>Year</Link>
        <Link href="/community" className={path === '/community' ? 'on' : ''}>Community</Link>
        <Link href="/import" className={path === '/import' ? 'on' : ''}>Import</Link>
        <span className="gap" /><button className="btn" onClick={() => pickTonight()}>Pick for tonight</button>
      </nav>
      {failed.map(([k, v]) => <p className="tag" key={k} style={{ color: 'var(--ember)' }}>{k} failed: {v}</p>)}
      {user && pending > 0 && (
        <p className="tag">This browser has {pending} {pending === 1 ? 'title' : 'titles'} that {pending === 1 ? 'is' : 'are'} not in your account.{' '}
          <button className="chip" onClick={moveLocal}>Move them in</button> <button className="chip" onClick={() => setPending(0)}>Skip</button></p>
      )}

      {path === '/' && (<>
      <div className="stats">
        <div className="stat ringtile"><div className="ring" style={{ '--p': pct }} data-t={pct + '%'} /><small>{lib.length} logged</small></div>
        {tiles.map(([l, n, f]) => <button key={l} className="stat" disabled={!f} onClick={f}><b>{n}</b><small>{l}</small></button>)}
      </div>

      {ready && !filtering && rows.map(([t, a]) => (
        <section key={t}><h2 className="rh d">{t}<small>{a.length}</small></h2><Shelf>{a.map(card)}</Shelf></section>
      ))}

      <h2 className="rh d" id="all">Everything<small>{list.length}</small></h2>
      {(Object.keys(colCount).length > 0 || Object.keys(tagCount).length > 0) && (
        <div className="tagrow">
          {Object.entries(colCount).map(([c, n]) => <button key={'c' + c} className="chip col" aria-pressed={fC === c} onClick={() => setFC(fC === c ? '' : c)}>▤ {c} {n}</button>)}
          {Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t, n]) => <button key={'t' + t} className="chip" aria-pressed={fT === t} onClick={() => setFT(fT === t ? '' : t)}>#{t} {n}</button>)}
        </div>
      )}
      {fC && (
        <div className="sharebar">
          {prof?.username ? (<>
            <label className="tog"><input type="checkbox" checked={(prof.public_cols || []).includes(fC)} onChange={() => togglePubCol(fC)} /> Share "{fC}" with a public link</label>
            {(prof.public_cols || []).includes(fC) && <button className="chip" onClick={() => shareCol(fC)}>Share link</button>}
          </>) : <small className="tag" style={{ margin: 0 }}>{user ? 'Choose a username in the menu to share collections.' : 'Sign in and choose a username to share collections.'}</small>}
        </div>
      )}
      <div className="bar">
        <span>{chips(ST, fS, setFS)}</span><span className="sep" /><span>{chips(KD, fK, setFK)}</span><span className="gap" />
        <input type="search" placeholder="Recall: title, plot, cast, notes, who with" value={lq} onChange={(e) => setLq(e.target.value)} />
        <select value={minR} onChange={(e) => setMinR(+e.target.value)} aria-label="Minimum rating of mine"><option value={0}>Any rating of mine</option>{(MINOPTS[rmode] || MINOPTS[10]).map(([n, l]) => <option key={n} value={n}>Mine {l}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="recent">Recently added</option><option value="rating">My rating, high to low</option><option value="pub">Public score, high to low</option><option value="year">Newest release</option><option value="title">Title A to Z</option>
        </select>
      </div>
      <section id="grid" aria-live="polite">
        {ready && list.slice(0, cap).map(card)}
        {ready && !lib.length && [1, 2, 3, 4].map((n) => <div className="card ghost" key={n}><div className="poster">{n === 1 ? 'Ticket 001' : 'Empty seat'}</div></div>)}
        {ready && !lib.length && <p className="none">The house is empty. Search a title at the top and log your first ticket.</p>}
        {ready && lib.length > 0 && !list.length && <p className="none">Nothing matches these filters.</p>}
        {ready && list.length > cap && <button className="btn g more" onClick={() => setCap(cap + 48)}>Show more ({list.length - cap} left)</button>}
      </section>
      </>)}
      {path === '/diary' && diary}
      {path === '/discover' && discover}
      {path === '/year' && year}
      {path === '/import' && imp}

      <dialog ref={dlg} onClose={() => setCur(null)} onClick={(e) => { if (e.target === dlg.current) dlg.current.close(); }}>
        {item && (<>
          {item.backdrop && <div className="bd" style={bg(item.backdrop)} />}
          <div className="dm">
            <div className={'poster' + (item.poster ? '' : ' blank')} style={bg(item.poster)}>{item.poster ? '' : item.title}</div>
            <div>
              <h2>{item.title}</h2>
              {item.tagline && <div className="meta"><i>{item.tagline}</i></div>}
              <div className="meta">{[KD[item.kind], item.year, item.runtime, item.episodes && item.kind !== 'movie' ? item.episodes + ' episodes' : ''].filter(Boolean).join(', ')}</div>
              <div className="badges">
                {item.rating != null && <span className="mine">Your rating {fmt(item.rating)}</span>}
                {item.score != null && <span>Public score {fmt(item.score * 10)}</span>}
                {item.rating != null && item.score != null && <span>{Math.abs(item.rating / 10 - item.score) < 0.3 ? 'In line with the public' : item.rating / 10 > item.score ? 'You rate it higher' : 'You rate it lower'}</span>}
                {item.airStatus && <span>{item.airStatus}</span>}
              </div>
              {item.log?.length > 0 && (() => { const ds = item.log.map((l) => l.d).filter(Boolean).sort(); return <p className="rec">Watched {item.log.length}x{ds[0] ? ', first ' + ds[0] : ''}{ds.length > 1 ? ', latest ' + ds[ds.length - 1] : ''}.</p>; })()}
              <div className="act" style={{ marginTop: 6 }}>
                {item.watch?.link ? <a className="btn watch" target="_blank" rel="noopener noreferrer" href={item.watch.link}>▶ Where to watch</a> : <span className="meta">{item.watch === undefined ? 'Checking where to watch...' : 'No streaming info found for your region'}</span>}
                {item.trailer && <a className="btn g" target="_blank" rel="noopener noreferrer" href={item.trailer}>Trailer</a>}
                <a className="btn g" target="_blank" rel="noopener noreferrer" href={'https://www.google.com/search?q=' + encodeURIComponent(item.title + ' ' + item.year + ' ' + (item.kind === 'movie' ? 'movie' : item.kind))}>Google</a>
              </div>
              {item.watch && (item.watch.providers?.length > 0 || item.watch.rent?.length > 0) && (
                <div className="prov">{item.watch.providers.map((n) => <span key={n}>{n}</span>)}{item.watch.rent?.map((n) => <span key={n} className="alt">{n} (rent or buy)</span>)}
                  {item.key.startsWith('tm') && <small>Streaming data by JustWatch</small>}</div>
              )}
              <div className="prov">{(item.genres || []).map((g) => <button key={g} className="chip" onClick={() => { setLq(g); setFS('all'); setFK('all'); dlg.current.close(); jump(); }}>{g}</button>)}</div>
              <div className="rate"><span id="big" key={item.rating}>{item.rating != null ? fmt(item.rating) : ''}</span></div>
              <dl className="crew">
                {[['director', 'Director or creator'], ['writer', 'Writer'], ['studio', 'Studio'], ['cast', 'Cast']].map(([k, l]) => item[k] ? [<dt key={k + 't'}>{l}</dt>, <dd key={k}>{item[k]}</dd>] : null)}
              </dl>
              <p>{item.overview}</p>
              {item.facts?.length > 0 && <dl className="crew">{item.facts.map(([l, v]) => [<dt key={l + 't'}>{l}</dt>, <dd key={l}>{v}</dd>])}</dl>}
              {item.seasons?.length > 0 && <><h3>Seasons</h3><div className="seasons">{item.seasons.map((z) => <div key={z.n} className={'sn' + (item.progress?.s > z.n ? ' seen' : '')}><b>{z.name}</b><small>{z.eps} episodes{z.year ? ', ' + z.year : ''}</small></div>)}</div></>}
              {item.related?.length > 0 && <><h3>Related</h3><div className="prov">{item.related.map((r) => <span key={r}>{r}</span>)}</div></>}
              {sim?.key === item.key && fresh(sim.hits).length > 0 && (<><h3>More like this (click to log one)</h3><Shelf cls="mltw">{fresh(sim.hits).slice(0, 14).map((h) => <button key={h.key} className="mt" onClick={() => add(h)} title={h.title}><img src={h.poster} alt={h.title} loading="lazy" /></button>)}</Shelf></>)}
              <h3>Status</h3>
              <div>{Object.entries(ST).map(([k, v]) => <button key={k} className="chip" aria-pressed={item.status === k} onClick={() => patch(item.key, { status: k })}>{v}</button>)}</div>
              {item.kind !== 'movie' && (
                <div className="prog"><span>Watched up to</span>
                  {item.seasons?.length > 0 && <label>Season<input type="number" min="1" key={item.key + 's'} defaultValue={item.progress?.s ?? ''} onBlur={(e) => patch(item.key, { progress: { ...item.progress, s: e.target.value === '' ? null : +e.target.value } })} /></label>}
                  <label>Episode<input type="number" min="0" key={item.key + 'e'} defaultValue={item.progress?.e ?? ''} onBlur={(e) => patch(item.key, { progress: { ...item.progress, e: e.target.value === '' ? null : +e.target.value } })} /></label>
                </div>
              )}
              <h3>Your rating</h3>
              <div className="rate"><Rating /></div>
              <h3>Tags</h3>
              <div className="prov">
                {[...new Set([...TAGS, ...(item.tags || [])])].map((t) => <button key={t} className="chip" aria-pressed={(item.tags || []).includes(t)} onClick={() => toggleIn(item, 'tags', t)}>{t}</button>)}
                <input className="mini" placeholder="+ your own, press Enter" maxLength={30} onKeyDown={(e) => { if (e.key === 'Enter') { const el = e.target; addNew(item, 'tags', el.value, () => { el.value = ''; }); } }} />
              </div>
              <h3>Collections</h3>
              <div className="prov">
                {[...new Set([...Object.keys(colCount), ...(item.cols || [])])].map((c) => <button key={c} className="chip col" aria-pressed={(item.cols || []).includes(c)} onClick={() => toggleIn(item, 'cols', c)}>▤ {c}</button>)}
                <input className="mini" placeholder="+ new collection, press Enter" maxLength={30} onKeyDown={(e) => { if (e.key === 'Enter') { const el = e.target; addNew(item, 'cols', el.value, () => { el.value = ''; }); } }} />
              </div>
              <h3>Notes</h3>
              <textarea key={item.key} defaultValue={item.notes} placeholder="What did you think?" onBlur={(e) => patch(item.key, { notes: e.target.value })} />
              <label className="tog"><input type="checkbox" checked={!!item.lock} onChange={(e) => patch(item.key, { lock: e.target.checked })} /> Keep this note private even when reviews are public</label>
              <h3>Diary{item.log?.length ? ` (watched ${item.log.length}x)` : ''}</h3>
              {(item.log || []).map((l, i) => (
                <div className="lg" key={l.id ?? i}>
                  <input type="date" defaultValue={l.d} aria-label="Date watched" onBlur={(e) => setLog(item, i, { d: e.target.value })} />
                  <input placeholder="Watched with" defaultValue={l.with} onBlur={(e) => setLog(item, i, { with: e.target.value })} />
                  <select defaultValue={l.mood} aria-label="Mood" onChange={(e) => setLog(item, i, { mood: e.target.value })}><option value="">Mood</option>{MOODS.map((m) => <option key={m}>{m}</option>)}</select>
                  <button className="chip" aria-label="Delete this entry" onClick={() => setLog(item, i, null)}>✕</button>
                  <input className="one" placeholder="What stayed with me, in one line" defaultValue={l.line} onBlur={(e) => setLog(item, i, { line: e.target.value })} />
                </div>
              ))}
              <button className="btn g" onClick={() => logWatch(item)}>{item.log?.length ? '↻ Log a rewatch' : '+ Log that I watched it'}</button>
              <div className="act"><button className="btn" onClick={() => share(item)}>Share</button><button className="btn g" onClick={() => dlg.current.close()}>Close</button><button className="btn g x" onClick={remove}>Remove</button></div>
            </div>
          </div>
        </>)}
      </dialog>
      {tonight && (
        <div className="help" onClick={() => setTonight(null)}>
          <div className="helpbox tn" onClick={(e) => e.stopPropagation()}>
            <div className={'poster' + (tonight.x.poster ? '' : ' blank')} style={bg(tonight.x.poster)}>{tonight.x.poster ? '' : tonight.x.title}</div>
            <h2 className="d">{tonight.x.title}</h2>
            <p className="tag" style={{ margin: '6px auto 0' }}>{[KD[tonight.x.kind], tonight.x.year, tonight.x.runtime].filter(Boolean).join(', ')}. {tonight.why}.</p>
            <div className="act">
              <button className="btn watch" onClick={() => { patch(tonight.x.key, { status: 'now' }); setCur(tonight.x.key); setTonight(null); }}>Start this</button>
              <button className="btn g" onClick={() => pickTonight(tonight.x.key)}>Another</button>
              <button className="btn g" onClick={() => setTonight(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {helpOpen && (
        <div className="help" onClick={() => setHelpOpen(false)}>
          <div className="helpbox" onClick={(e) => e.stopPropagation()}>
            <h2 className="d">Shortcuts</h2>
            <dl>
              <dt><kbd>/</kbd></dt><dd>Search for a title</dd>
              <dt><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd></dt><dd>Pick a search result</dd>
              <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Previous or next title in an open popup</dd>
              <dt><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></dt><dd>Plan, watching, watched</dd>
              <dt><kbd>W</kbd></dt><dd>Where to watch</dd>
              <dt><kbd>T</kbd></dt><dd>Trailer</dd>
              <dt><kbd>?</kbd></dt><dd>Show or hide this list</dd>
              <dt><kbd>Esc</kbd></dt><dd>Close anything open</dd>
            </dl>
          </div>
        </div>
      )}
      <div id="toast" className={toast ? 'on' : ''} role="status">{toast}</div>
    </>
  );
}
