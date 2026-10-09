'use client';
import { useState } from 'react';
import Shelf from '@/components/Shelf';
import { SITE } from '@/lib/config';
import { useApp } from '@/components/AppContext';

export default function YearScreen() {
  const { card, fmt, lib, say } = useApp();
  const [yr, setYr] = useState(new Date().getFullYear());
  const Y = String(yr), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dates = lib.flatMap((x) => x.log?.length ? x.log.map((l, i) => ({ x, d: l.d || '', i, mood: l.mood })) : x.status === 'done' && x.added ? [{ x, d: new Date(x.added).toISOString().slice(0, 10), i: 0, mood: '' }] : []).filter((e) => e.d.startsWith(Y));
  const inYear = [...new Map(dates.map((e) => [e.x.key, e.x])).values()];
  const gC = {};
  inYear.forEach((x) => (x.genres || []).forEach((g) => { gC[g] = (gC[g] || 0) + 1; }));
  const topG = Object.entries(gC).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const mC = Array(12).fill(0);
  dates.forEach((e) => { mC[+e.d.slice(5, 7) - 1]++; });
  const moodC = {};
  dates.forEach((e) => { if (e.mood) moodC[e.mood] = (moodC[e.mood] || 0) + 1; });
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
  return year;
}
