'use client';
import { useRef, useState } from 'react';

const KD = { movie: 'Movie', series: 'Series', anime: 'Anime' };

export default function Finder() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [errs, setErrs] = useState({});
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(), run = useRef(0);

  function onChange(v) {
    setQ(v); clearTimeout(timer.current);
    const my = ++run.current;
    if (v.trim().length < 2) { setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const d = await (await fetch('/api/search?q=' + encodeURIComponent(v.trim()))).json();
      if (my !== run.current) return;
      setHits(d.hits || []); setErrs(d.errors || {}); setOpen(true);
    }, 350);
  }

  async function pick(h) {
    setOpen(false); setBusy(true);
    try {
      if (h.item) setSel({ ...h, ...h.item });
      else {
        const d = await (await fetch(`/api/title?tm=${h.tm}&id=${h.id}`)).json();
        setSel({ ...h, ...d });
      }
    } finally { setBusy(false); }
  }

  const n = (s) => hits.filter((h) => h.src === s).length;
  const failed = Object.entries(errs).filter(([, v]) => v);

  return (
    <>
      <div className="find">
        <label htmlFor="q">Find a movie, series or anime</label>
        <input id="q" type="search" autoComplete="off" placeholder="Start typing a title" value={q} onChange={(e) => onChange(e.target.value)} />
        {open && (
          <div id="res">
            {hits.map((h) => (
              <button className="r" key={h.key} onClick={() => pick(h)}>
                {h.poster ? <img src={h.poster} alt="" loading="lazy" /> : <i />}
                <span><b>{h.title}</b><span className="kind">{KD[h.kind]}</span><small>{h.year}</small></span>
              </button>
            ))}
            {!hits.length && <div className="r"><span>No match.</span></div>}
          </div>
        )}
      </div>
      {q.trim().length > 1 && <p className="tag">TMDB found {n('tmdb')}, AniList found {n('al')}.</p>}
      {failed.map(([k, v]) => <p className="tag" key={k} style={{ color: 'var(--ember)' }}>{k} failed: {v}</p>)}
      {busy && <p className="tag">Loading details...</p>}
      {sel && (
        <div className="dm" style={{ background: 'var(--aisle)', border: '2px solid var(--brass)', marginTop: 24 }}>
          <div className={'poster' + (sel.poster ? '' : ' blank')} style={sel.poster ? { backgroundImage: `url('${sel.poster}')` } : {}}>{sel.poster ? '' : sel.title}</div>
          <div>
            <h2>{sel.title}</h2>
            <div className="meta">{[KD[sel.kind], sel.year, sel.runtime, (sel.genres || []).join(', ')].filter(Boolean).join(', ')}</div>
            <dl className="crew">
              {[['director', 'Director or creator'], ['writer', 'Writer'], ['studio', 'Studio'], ['cast', 'Cast']].map(([k, l]) => sel[k] ? [<dt key={k + 't'}>{l}</dt>, <dd key={k}>{sel[k]}</dd>] : null)}
            </dl>
            <p>{sel.overview}</p>
          </div>
        </div>
      )}
    </>
  );
}
