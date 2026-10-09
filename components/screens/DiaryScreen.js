'use client';
import { useState } from 'react';
import { useApp } from '@/components/AppContext';

export default function DiaryScreen() {
  const { fmt, lib, setCur } = useApp();
  const [dCap, setDCap] = useState(40);
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
  return diary;
}
