'use client';
import { useEffect, useState } from 'react';

const KD = { movie: 'Movie', series: 'Series', anime: 'Anime' };

export default function DiscoverCard({ h }) {
  const [keys, setKeys] = useState([]);
  useEffect(() => {
    setKeys(window.__slKeys || []);
    const f = (e) => setKeys(e.detail);
    window.addEventListener('seenlog:keys', f);
    return () => window.removeEventListener('seenlog:keys', f);
  }, []);
  return (
    <article className="card">
      <button className="pb" onClick={() => window.dispatchEvent(new CustomEvent('seenlog:add', { detail: h }))}>
        <div className="poster" style={{ backgroundImage: `url('${h.poster}')` }}>{keys.includes(h.key) && <span className="st done">In your list</span>}</div>
        <div className="stub"><b>{h.title}</b><small>{KD[h.kind]}{h.year ? ', ' + h.year : ''}</small></div>
      </button>
    </article>
  );
}
