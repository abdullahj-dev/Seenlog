'use client';
import { useEffect, useState } from 'react';

// Compares the visitor's own ratings (kept in the browser) with the profile owner's public ratings.
export default function TasteMatch({ theirs, by }) {
  const [mine, setMine] = useState(null);
  useEffect(() => {
    const f = () => setMine(window.__slRatings || {});
    f(); window.addEventListener('seenlog:keys', f);
    return () => window.removeEventListener('seenlog:keys', f);
  }, []);
  if (!mine) return null;
  const shared = Object.keys(theirs).filter((k) => mine[k] != null);
  if (shared.length < 3) return <p className="tag">Rate at least 3 titles that {by} also rated to see your taste match ({shared.length} so far).</p>;
  const diffs = shared.map((k) => ({ k, d: Math.abs(mine[k] - theirs[k][0]), t: theirs[k][1] }));
  const pct = Math.max(0, Math.round(100 - diffs.reduce((a, x) => a + x.d, 0) / diffs.length));
  const love = diffs.filter((x) => mine[x.k] >= 80 && theirs[x.k][0] >= 80).slice(0, 3);
  const clash = [...diffs].sort((a, b) => b.d - a.d).filter((x) => x.d >= 30).slice(0, 2);
  return (
    <div className="taste">
      <b>{pct}% taste match</b><small>{shared.length} titles you both rated</small>
      {love.length > 0 && <div className="prov"><small>You both loved:</small>{love.map((x) => <span key={x.k}>{x.t}</span>)}</div>}
      {clash.length > 0 && <div className="prov"><small>You disagree on:</small>{clash.map((x) => <span key={x.k}>{x.t}</span>)}</div>}
    </div>
  );
}
