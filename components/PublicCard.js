'use client';
import { useEffect, useRef, useState } from 'react';
import { fmtRating } from '@/lib/rating';

const KD = { movie: 'Movie', series: 'Series', anime: 'Anime' };
const ST = { plan: 'Plan to watch', now: 'Watching', done: 'Watched' };

export default function PublicCard({ x, by, r, ok }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const [mode, setMode] = useState(null);
  useEffect(() => {
    const read = () => { try { setMode(localStorage.getItem('seenlog_mode')); } catch {} };
    read(); window.addEventListener('seenlog:mode', read);
    return () => window.removeEventListener('seenlog:mode', read);
  }, []);
  const shown = r == null ? null : mode && x.rating != null ? fmtRating(x.rating, mode) : r;
  useEffect(() => { const d = ref.current; if (open && d && !d.open) d.showModal(); }, [open]);
  const bgSm = ok ? { backgroundImage: `url('${x.poster.replace('/w342/', '/w185/')}')` } : undefined;
  const bg = ok ? { backgroundImage: `url('${x.poster}')` } : undefined;

  function addIt() {
    const m = /^tm(movie|tv)(\d+)$/.exec(x.key), a = /^al(\d+)$/.exec(x.key);
    if (!m && !a) return;
    const hit = { key: x.key, kind: x.kind, title: x.title, year: x.year, poster: ok ? x.poster : '', ...(m ? { src: 'tmdb', tm: m[1], id: m[2] } : { src: 'al', id: a[1] }) };
    window.dispatchEvent(new CustomEvent('seenlog:add', { detail: hit }));
    ref.current.close();
  }

  return (
    <article className="card">
      <button className="pb" onClick={() => setOpen(true)}>
        <div className={'poster' + (ok ? '' : ' blank')} style={bgSm}>
          {ok ? '' : x.title}
          {x.status && <span className={'st ' + x.status}>{ST[x.status]}</span>}
          {shown != null && <span className="stamp">{shown}</span>}
        </div>
        <div className="stub"><b>{x.title}</b><small>{KD[x.kind]}{x.year ? ', ' + x.year : ''}</small></div>
      </button>
      <dialog ref={ref} onClose={() => setOpen(false)} onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}>
        {open && (
          <div className="dm">
            <div className={'poster' + (ok ? '' : ' blank')} style={bg}>{ok ? '' : x.title}</div>
            <div>
              <h2>{x.title}</h2>
              <div className="meta">{[KD[x.kind], x.year, (x.genres || []).join(', ')].filter(Boolean).join(', ')}</div>
              <div className="badges">{shown != null && <span className="mine">{by}'s rating {shown}</span>}{x.status && <span>{ST[x.status]}</span>}</div>
              {x.notes && <p>{x.notes}</p>}
              <div className="act">
                {/^(tm|al)/.test(x.key) && <button className="btn" onClick={addIt}>Add to my list</button>}
                <button className="btn g" onClick={() => ref.current.close()}>Close</button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </article>
  );
}
