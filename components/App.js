'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SITE } from '@/lib/config';
import Shelf from '@/components/Shelf';
import { dropPoster, isCustom } from '@/lib/custom';
import { KD, ST, MOODS, TAGS, ACCENTS, MINOPTS, simUrl, sm, pad, bg } from '@/lib/ui';
import { supabase } from '@/lib/supabase';
import { AppCtx } from '@/components/AppContext';
import TopBar from '@/components/shell/TopBar';
import NavBar from '@/components/shell/NavBar';
import Views from '@/components/shell/Views';
import Popup from '@/components/shell/Popup';
import Overlays from '@/components/shell/Overlays';

let M = SITE.ratingMode; // set from the viewer's own choice at the top of every render
const K = 'seenlog_v1';
const F = ['😖', '🙁', '😐', '🙂', '🤩'];
const face = (v) => Math.max(0, Math.min(4, Math.floor((v - 0.1) / 20)));
const fmt = (v) => v == null ? '-' : M === '100' ? Math.round(v) : M === '5' ? '★' + (v / 20).toFixed(1).replace('.0', '') : M === 'smiley' ? F[face(v)] : (v / 10).toFixed(1);


export default function App() {
  const [lib, setLib] = useState([]);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState('');
  const [customOpen, setCustomOpen] = useState(null); // null, or { seed } to add, or { key } to edit
  const [hits, setHits] = useState([]);
  const [errs, setErrs] = useState({});
  const [loose, setLoose] = useState(false);
  const [isAdmin, setIsAdmin] = useState(null); // null while checking
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
  const [pending, setPending] = useState(0);
  const path = usePathname();
  const onTitle = path.startsWith('/title/');
  let titleKey = null; if (onTitle) { try { titleKey = decodeURIComponent(path.slice(7)); } catch {} }
  const wasTitle = useRef(false);
  const router = useRouter();
  const [rmode, setRmode] = useState(SITE.ratingMode);
  M = rmode;
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState([]);
  const [trend, setTrend] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [goal, setGoal] = useState(0);
  const [vibeOn, setVibeOn] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState('plan');
  const [airing, setAiring] = useState({});
  const [just, setJust] = useState(null);
  const [selMode, setSelMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [toastAct, setToastAct] = useState(null);
  const [topt, setTopt] = useState({ kind: 'any', mood: '', re: false });
  const [fT, setFT] = useState('');
  const [fC, setFC] = useState('');
              const [sim, setSim] = useState(null);
  const [cap, setCap] = useState(48);
        const [prof, setProf] = useState(null);
  const [uname, setUname] = useState('');
          const [because, setBecause] = useState(null);
  const [tonight, setTonight] = useState(null);
  const [showPub, setShowPub] = useState(false);
  const [minR, setMinR] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const togglePub = (v) => { setShowPub(v); try { localStorage.setItem('seenlog_pub', v ? '1' : '0'); } catch {} };
  const L = useRef([]); L.current = lib;
  const timer = useRef(), run = useRef(0), tt = useRef(), dlg = useRef(), file = useRef(), keyRef = useRef(), addRef = useRef();

  useEffect(() => {
    if (!supabase || !user) { setIsAdmin(false); return; }
    let dead = false;
    supabase.rpc('is_admin').then(({ data, error }) => { if (!dead) setIsAdmin(!error && data === true); });
    return () => { dead = true; };
  }, [user?.id]);
  useEffect(() => { try { const c = JSON.parse(localStorage.getItem('seenlog_cache') || 'null'); if (c?.list?.length) { setLib(c.list); setReady(true); } } catch {} }, []);
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(K)) || []; } catch { return []; } };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((ev, sess) => { setUser(sess?.user ?? null); if (ev === 'PASSWORD_RECOVERY') router.push('/reset-password'); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    let dead = false;
    (async () => {
      if (!supabase || !user) { setLib(readLocal()); setPending(0); setReady(true); return; }
      if (!L.current.length) setReady(false);
      const { data, error } = await supabase.from('entries').select('data').eq('user_id', user.id);
      if (dead) return;
      if (error) { say('Could not load your list from your account'); setLib([]); }
      else {
        const cloud = data.map((r) => r.data);
        setLib(cloud); try { localStorage.setItem('seenlog_cache', JSON.stringify({ uid: user.id, list: cloud })); } catch {}
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
    try { localStorage.setItem('seenlog_cache', JSON.stringify({ uid: user.id, list: next })); } catch {}
    const old = new Map(prev.map((x) => [x.key, JSON.stringify(x)]));
    const up = next.filter((x) => old.get(x.key) !== JSON.stringify(x)).map((x) => ({ key: x.key, data: x, updated_at: new Date().toISOString() }));
    const gone = prev.filter((x) => !next.some((y) => y.key === x.key)).map((x) => x.key);
    (async () => {
      if (up.length) { const { error } = await supabase.from('entries').upsert(up, { onConflict: 'user_id,key' }); if (error) say('Could not save to your account'); }
      if (gone.length) { const { error } = await supabase.from('entries').delete().eq('user_id', user.id).in('key', gone); if (error) say('Could not remove from your account'); }
    })();
  };
  function moveLocal() {
    const have = new Set(L.current.map((x) => x.key));
    const add = readLocal().filter((x) => !have.has(x.key));
    commit([...L.current, ...add]); setPending(0); say(add.length + ' titles moved into your account');
  }
  const patch = (key, ch) => commit(L.current.map((x) => (x.key === key ? { ...x, ...ch } : x)));
  const say = (m, act = null) => { setToast(m); setToastAct(act); clearTimeout(tt.current); tt.current = setTimeout(() => { setToast(''); setToastAct(null); }, act ? 6000 : 2400); };

  const item = lib.find((x) => x.key === cur);
  useEffect(() => {
    const d = dlg.current; if (!d) return;
    if (item && !onTitle && !d.open) d.showModal();
    if ((!item || onTitle) && d.open) d.close();
  }, [item, onTitle]);

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
    try { setShowPub(localStorage.getItem('seenlog_pub') === '1'); const m = localStorage.getItem('seenlog_mode'); if (m) setRmode(m); setGoal(+localStorage.getItem('seenlog_goal') || 0); setVibeOn(localStorage.getItem('seenlog_vibe') !== '0'); setDefaultStatus(localStorage.getItem('seenlog_defstatus') || 'plan'); if (localStorage.getItem('seenlog_motion') === 'off') document.documentElement.dataset.motion = 'off'; } catch {}
    const down = (e) => { if (!e.target.closest('.menu')) setAuthOpen(false); if (!e.target.closest('.find')) { setOpen(false); setFocused(false); } };
    const esc = (e) => { if (e.key === 'Escape') { setAuthOpen(false); setOpen(false); setFocused(false); setHelpOpen(false); } };
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

  useEffect(() => { const keys = lib.map((x) => x.key); window.__slKeys = keys; window.__slRatings = Object.fromEntries(lib.filter((x) => x.rating != null).map((x) => [x.key, x.rating])); window.dispatchEvent(new CustomEvent('seenlog:keys', { detail: keys })); }, [lib]);
  useEffect(() => {
    const sc = () => setScrolled(window.scrollY > 180);
    sc(); window.addEventListener('scroll', sc, { passive: true });
    let raf = 0;
    const mv = (e) => {
      if (e.pointerType !== 'mouse') return;
      const c = e.target.closest?.('.card'), p = c?.querySelector('.poster'); if (!p) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = p.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        p.style.setProperty('--ry', (x * 10).toFixed(1) + 'deg'); p.style.setProperty('--rx', (-y * 10).toFixed(1) + 'deg'); p.style.setProperty('--sx', (150 - (x + 0.5) * 200).toFixed(0) + '%');
      });
    };
    const out = (e) => { const c = e.target.closest?.('.card'); if (c && !c.contains(e.relatedTarget)) { const p = c.querySelector('.poster'); if (p) { p.style.setProperty('--rx', '0deg'); p.style.setProperty('--ry', '0deg'); } } };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerout', out);
    return () => { window.removeEventListener('scroll', sc); document.removeEventListener('pointermove', mv); document.removeEventListener('pointerout', out); };
  }, []);
  useEffect(() => {
    if (path !== '/' || !ready) return;
    const keys = lib.filter((x) => x.status === 'now' && /^(tmtv|al)\d+$/.test(x.key)).map((x) => x.key).slice(0, 12);
    if (!keys.length) return;
    let dead = false;
    fetch('/api/airing?keys=' + keys.join(',')).then((r) => r.json()).then((d) => { if (!dead) setAiring(d.airing || {}); }).catch(() => {});
    return () => { dead = true; };
  }, [path, ready, lib.filter((x) => x.status === 'now').length]);
  useEffect(() => {
    if (onTitle) { wasTitle.current = true; if (titleKey) setCur(titleKey); }
    else if (wasTitle.current) { wasTitle.current = false; setCur(null); }
  }, [path]);
  useEffect(() => { try { setRecent(JSON.parse(localStorage.getItem('seenlog_recent') || '[]')); } catch {} }, []);
  useEffect(() => {
    if (!focused || trend.length) return;
    fetch('/api/discover?tab=trending&kind=movie&page=1').then((r) => r.json()).then((d) => setTrend((d.hits || []).slice(0, 6))).catch(() => {});
  }, [focused]);
  addRef.current = add;
  useEffect(() => {
    const h = (e) => addRef.current?.(e.detail);
    window.addEventListener('seenlog:add', h);
    return () => window.removeEventListener('seenlog:add', h);
  }, []);

  function saveRecent(t) {
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    setRecent(next); try { localStorage.setItem('seenlog_recent', JSON.stringify(next)); } catch {}
  }

  function onChange(v) {
    setQ(v); clearTimeout(timer.current);
    const my = ++run.current;
    if (v.trim().length < 2) { setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const d = await (await fetch('/api/search?q=' + encodeURIComponent(v.trim()))).json();
        if (my !== run.current) return;
        setHits(d.hits || []); setErrs(d.errors || {}); setLoose(!!d.loose); setOpen(true);
      } catch { say('Search failed. Check your connection.'); }
    }, 350);
  }

  async function add(h) {
    setOpen(false); setFocused(false); if (q.trim().length > 1) saveRecent(q.trim()); setQ('');
    if (L.current.some((x) => x.key === h.key)) { say('Already in your list'); return setCur(h.key); }
    say('Adding ' + h.title + '...');
    try {
      let f = h.item;
      if (!f) { f = await (await fetch(h.src === 'al' ? `/api/title?al=${h.id}` : `/api/title?tm=${h.tm}&id=${h.id}`)).json(); if (f.error) throw new Error(f.error); }
      const entry = { kind: h.kind, title: h.title, year: h.year, poster: h.poster, lang: h.lang || '', ...f, key: h.key,
        no: Math.max(0, ...L.current.map((x) => x.no || 0)) + 1, status: defaultStatus, rating: null, notes: '', added: Date.now() };
      commit([entry, ...L.current]); say('Logged: ' + h.title); setJust(h.key);
    } catch { say('Could not load details. Try again.'); }
  }

  const remove = () => { const prev = L.current, t = item.title; commit(prev.filter((x) => x.key !== cur)); if (isCustom(item.key)) { const gone = item; setTimeout(() => { if (!L.current.some((x) => x.key === gone.key)) dropPoster(gone, user); }, 6500); } setCur(null); say('Removed ' + t, { label: 'Undo', fn: () => commit(prev) }); };
  function statusSet(key, status) { const prev = L.current; patch(key, { status }); say('Moved to ' + ST[status], { label: 'Undo', fn: () => commit(prev) }); }
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
  function tweak(ch) { const o = { ...topt, ...ch }; setTopt(o); pickTonight(null, o); }
  function pickTonight(skip, o) {
    const opt = o || topt, g = {};
    lib.filter((x) => x.rating != null).forEach((x) => (x.genres || []).forEach((n) => { (g[n] = g[n] || []).push(x.rating / 10); }));
    const t = Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
    const has = (x, ks) => ks.some((k) => (x.genres || []).includes(k));
    const mood = { funny: (x) => has(x, ['Comedy']) || (x.tags || []).includes('funny'), thrilling: (x) => has(x, ['Thriller', 'Action', 'Horror', 'Crime']),
      comfort: (x) => (x.tags || []).includes('comfort') || has(x, ['Family', 'Animation']), mind: (x) => has(x, ['Science Fiction', 'Sci-Fi', 'Sci-Fi & Fantasy', 'Mystery']) || (x.tags || []).includes('mind-bending'),
      cry: (x) => has(x, ['Drama', 'Romance']) || (x.tags || []).includes('cried') };
    const mins = (x) => +((/(\d+) min/.exec(x.runtime || '') || [])[1]) || 0;
    const timeOk = (x) => opt.kind === 'any' || (opt.kind === 'movie' ? x.kind === 'movie' : opt.kind === 'short' ? x.kind === 'movie' && mins(x) > 0 && mins(x) < 100 : x.kind !== 'movie');
    const pool = lib.filter((x) => (x.status === 'plan' || (opt.re && x.status === 'done' && ((x.tags || []).includes('rewatchable') || x.rating >= 85))) && x.key !== skip && timeOk(x) && (!opt.mood || mood[opt.mood](x)));
    if (!pool.length) { setTonight({ x: null, why: 'Nothing matches. Loosen a filter, or add more titles to Plan to watch.' }); return; }
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
      const fresh = (a) => a.filter((h) => !lib.some((x) => x.key === h.key));
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

  function Rating({ it }) {
    const v = it.rating;
    if (M === '5') return [0, 1, 2, 3, 4].map((i) => <button key={i} className={v >= i * 20 + 20 ? 'on' : ''} aria-label={i + 1 + ' stars'} onClick={() => rate(it, i * 20 + 20)}>★</button>);
    if (M === 'smiley') return F.map((f, i) => <button key={i} className={v != null && face(v) === i ? 'on' : ''} onClick={() => rate(it, i * 20 + 20)}>{f}</button>);
    const h = M === '100';
    return <input type="number" min="0" max={h ? 100 : 10} step={h ? 1 : 0.1} key={it.key + M} defaultValue={v == null ? '' : h ? v : v / 10} placeholder={h ? '0-100' : '0-10'} aria-label="Your rating"
      onBlur={(e) => { const t = e.target.value; patch(it.key, { rating: t === '' ? null : Math.min(100, Math.max(0, +t * (h ? 1 : 10))) }); }} />;
  }

  const byNew = [...lib].sort((a, b) => b.added - a.added);
  const filtering = fS !== 'all' || fK !== 'all' || lq || minR || fT || fC;
  const rows = [['Continue watching', byNew.filter((x) => x.status === 'now')], ['Up next', byNew.filter((x) => x.status === 'plan').slice(0, 14)],
    ['Your top rated', lib.filter((x) => x.rating != null).sort((a, b) => b.rating - a.rating).slice(0, 14)]].filter(([, a]) => a.length);
  const jump = () => document.getElementById('all')?.scrollIntoView({ behavior: 'smooth' });
  const tiles = [['Watched', done, () => { setFS('done'); setFK('all'); jump(); }], ['Watching', lib.filter((x) => x.status === 'now').length, () => { setFS('now'); setFK('all'); jump(); }],
    ['Plan to watch', lib.filter((x) => x.status === 'plan').length, () => { setFS('plan'); setFK('all'); jump(); }]];
  const card = (x, i = 0) => (
    <article className={'card' + (selected.includes(x.key) ? ' picked' : '')} key={x.key} style={{ '--i': i }}>
      <button className="pb" onClick={(e) => (selMode ? setSelected(selected.includes(x.key) ? selected.filter((k) => k !== x.key) : [...selected, x.key]) : openMorph(e, x.key))}>
        <div className={'poster' + (x.poster ? '' : ' blank')} style={bg(sm(x.poster))}>
          {x.poster ? '' : x.title}<span className={'st ' + x.status}>{ST[x.status]}</span>{selMode && <span className="tick">{selected.includes(x.key) ? '✓' : ''}</span>}{x.rating != null && <span className="stamp">{fmt(x.rating)}</span>}{showPub && x.score != null && <span className="pubb" title="Public score">{fmt(x.score * 10)}</span>}{(x.log?.length || 0) > 1 && <span className="rew" title="Times watched">↻{x.log.length}</span>}
        </div>
        <div className="stub"><b>{x.title}</b><small>No. {pad(x.no)}, {KD[x.kind]}{x.year ? ', ' + x.year : ''}{x.status === 'now' && x.progress?.e != null ? ', ' + (x.progress.s ? 'S' + x.progress.s + ' ' : '') + 'E' + x.progress.e : ''}</small></div>
      </button>
      <div className="ov"><small>{(x.genres || []).slice(0, 3).join(', ')}</small>
        <div>{x.status !== 'now' && <button className="btn" onClick={() => statusSet(x.key, 'now')}>Start</button>}{x.status !== 'done' && <button className="btn g" onClick={() => statusSet(x.key, 'done')}>Done</button>}{x.status === 'now' && x.kind !== 'movie' && <button className="btn" onClick={() => nextEp(x)}>+1 ep</button>}</div></div>
    </article>
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

  function setProg(it, s, e) {
    const seasons = it.seasons || [], sObj = seasons.find((z) => z.n === s);
    const max = sObj ? sObj.eps : it.episodes || null;
    if (e != null && max) e = Math.min(e, max);
    const last = seasons.length ? seasons[seasons.length - 1] : null;
    const finished = last ? s === last.n && e != null && e >= last.eps : !!it.episodes && e != null && e >= it.episodes;
    patch(it.key, { progress: { s: s ?? null, e: e ?? null }, ...(finished ? { status: 'done' } : e > 0 && it.status === 'plan' ? { status: 'now' } : {}) });
  }
  function nextEp(it) {
    const seasons = it.seasons || [], p = it.progress || {};
    let s = p.s ?? seasons[0]?.n ?? null, e = (p.e ?? 0) + 1;
    const sObj = seasons.find((z) => z.n === s), max = sObj ? sObj.eps : it.episodes || null;
    if (max && e > max) { const nx = seasons.find((z) => z.n > s); if (nx) { s = nx.n; e = 1; } else e = max; }
    setProg(it, s, e);
  }
  const dragY = useRef(0);
  const gs = (e) => { dragY.current = e.touches[0].clientY; };
  const gm = (e) => { const dy = Math.max(0, e.touches[0].clientY - dragY.current); dlg.current.style.transition = 'none'; dlg.current.style.transform = `translateY(${dy}px)`; };
  const ge = (e) => { const dy = e.changedTouches[0].clientY - dragY.current; dlg.current.style.transition = ''; dlg.current.style.transform = ''; if (dy > 110) dlg.current.close(); };
  function rate(it, r) { patch(it.key, { rating: r }); try { if (vibeOn) navigator.vibrate?.(12); } catch {} }
  function setAccent(c) { document.documentElement.style.setProperty('--brass', c); try { localStorage.setItem('seenlog_accent', c); } catch {} }
  function openMorph(e, key) {
    const el = e.currentTarget.querySelector('.poster');
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches || !el) return setCur(key);
    el.style.viewTransitionName = 'poster';
    document.startViewTransition(() => { el.style.viewTransitionName = ''; flushSync(() => setCur(key)); const d = dlg.current; if (d && !d.open) d.showModal(); });
  }
  const cyN = new Date().getFullYear();
  const doneThisYear = lib.filter((x) => (x.log?.length ? x.log.some((l) => (l.d || '').startsWith(String(cyN))) : x.status === 'done' && x.added && new Date(x.added).getFullYear() === cyN)).length;
  function editGoal() {
    const v = prompt(`How many titles do you want to watch in ${cyN}?`, goal || 50);
    if (v === null) return;
    const n = Math.max(0, parseInt(v) || 0); setGoal(n); try { localStorage.setItem('seenlog_goal', String(n)); } catch {}
  }
  const dayDiff = (a) => Math.round((new Date(a.date + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5);
  const airRows = lib.filter((x) => x.status === 'now' && airing[x.key] && dayDiff(airing[x.key]) >= 0 && dayDiff(airing[x.key]) <= 7)
    .map((x) => { const a = airing[x.key], n = dayDiff(a); return { x, a: { label: a.label, when: n === 0 ? 'today' : n === 1 ? 'tomorrow' : new Date(a.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'long' }) } }; });
  const now = new Date(), md = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'), yNow = now.getFullYear();
  const otd = lib.flatMap((x) => (x.log?.length ? x.log.map((l) => l.d) : x.added ? [new Date(x.added).toISOString().slice(0, 10)] : []).filter((dt) => dt && dt.slice(5) === md && +dt.slice(0, 4) < yNow).map((dt) => ({ x, ago: yNow - +dt.slice(0, 4) })));
  const justItem = lib.find((x) => x.key === just);
  const bulk = (fn, msg) => { const prev = L.current; commit(prev.map((x) => (selected.includes(x.key) ? { ...x, ...fn(x) } : x))); say(msg, { label: 'Undo', fn: () => commit(prev) }); };
  const bulkAdd = (f, raw, clear) => { const v = f === 'tags' ? raw.trim().toLowerCase().slice(0, 30) : raw.trim().slice(0, 30); if (!v) return; bulk((x) => ({ [f]: [...new Set([...(x[f] || []), v])] }), `Added to ${selected.length} titles`); clear(); };
  const bulkDelete = () => { if (!selected.length) return; const prev = L.current, n = selected.length; commit(prev.filter((x) => !selected.includes(x.key))); setSelected([]); say(`Removed ${n} titles`, { label: 'Undo', fn: () => commit(prev) }); };
            
    
    const ctx = { isAdmin, loose, customOpen, setCustomOpen, setOpen, L, Rating, add, addNew, airRows, authOpen, authReady, because, bulk, bulkAdd, bulkDelete, cap, card, changeMode, chips, colCount, commit, cyN, defaultStatus, dlg, done, doneThisYear, editGoal, exportList, fC, fK, fS, fT, failed, file, filtering, fmt, focused, fresh, ge, gm, goal, gs, helpOpen, hits, importList, item, justItem, lib, list, logWatch, lq, minR, moveLocal, nextEp, onChange, onTitle, open, otd, patch, path, pct, pending, pickTonight, prof, q, rated, ready, recent, remove, rmode, router, rows, s, saveProfile, say, scrolled, sel, selMode, selected, setAccent, setAuthOpen, setCap, setCur, setDefaultStatus, setFC, setFK, setFS, setFT, setFocused, setGoal, setHelpOpen, setJust, setLog, setLq, setMinR, setPending, setProg, setQ, setSel, setSelMode, setSelected, setSort, setTab, setToast, setToastAct, setTonight, setUname, setVibeOn, share, shareCol, showPub, shown, sim, sort, tab, tagCount, tiles, toast, toastAct, today, toggleIn, togglePub, togglePubCol, tonight, topt, trend, tweak, uname, user, vibeOn };
  return (
    <AppCtx.Provider value={ctx}>
      <TopBar />
      <NavBar />
      <Views />
      <Popup />
      <Overlays />
    </AppCtx.Provider>
  );}
