'use client';
import Link from 'next/link';
import Shelf from '@/components/Shelf';
import { KD, ST, MINOPTS } from '@/lib/ui';
import { useApp } from '@/components/AppContext';

export default function ListScreen() {
  const { airRows, cap, card, chips, colCount, cyN, doneThisYear, editGoal, fC, fK, fS, fT, filtering, fmt, goal, lib, list, lq, minR, otd, pct, prof, rated, ready, rmode, rows, selMode, setCap, setFC, setFK, setFS, setFT, setLq, setMinR, setSelMode, setSelected, setSort, shareCol, sort, tagCount, tiles, togglePubCol, user } = useApp();
  
  return (
    <>

      <div className="stats">
        <div className="stat ringtile"><div className="ring" style={{ '--p': pct }} data-t={pct + '%'} /><small>{lib.length} logged{rated.length ? ', avg ' + fmt(rated.reduce((t, x) => t + x.rating, 0) / rated.length) : ''}</small></div>
        {tiles.map(([l, n, f]) => <button key={l} className="stat" disabled={!f} onClick={f}><b>{n}</b><small>{l}</small></button>)}
        <button className="stat goal" onClick={editGoal}><b>{goal ? `${doneThisYear}/${goal}` : 'Set goal'}</b><small>{goal ? `${cyN} goal` : 'yearly goal'}</small>{goal > 0 && <i className="bt"><span className="barfill" style={{ width: Math.min(100, (doneThisYear / goal) * 100) + '%' }} /></i>}</button>
      </div>

      {ready && !filtering && airRows.length > 0 && <section><h2 className="rh d">Airing this week<small>shows you are watching</small></h2><Shelf>{airRows.map(({ x, a }) => <div className="otd" key={x.key}>{card(x)}<small className="ago">{a.label}, {a.when}</small></div>)}</Shelf></section>}
      {ready && !filtering && otd.length > 0 && <section><h2 className="rh d">On this day<small>from your own past</small></h2><Shelf>{otd.map(({ x, ago }) => <div className="otd" key={x.key + ago}>{card(x)}<small className="ago">{ago} {ago === 1 ? 'year' : 'years'} ago</small></div>)}</Shelf></section>}
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
      <div className="bar toolbar">
        <div className="seg2">{chips(ST, fS, setFS)}</div><div className="seg2">{chips(KD, fK, setFK)}</div>
        <input type="search" placeholder="Recall: title, plot, cast, notes, who with" value={lq} onChange={(e) => setLq(e.target.value)} />
        <button className="chip" aria-pressed={selMode} onClick={() => { setSelMode(!selMode); setSelected([]); }}>Select</button>
        <select value={minR} onChange={(e) => setMinR(+e.target.value)} aria-label="Minimum rating of mine"><option value={0}>Any rating of mine</option>{(MINOPTS[rmode] || MINOPTS[10]).map(([n, l]) => <option key={n} value={n}>Mine {l}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="recent">Recently added</option><option value="rating">My rating, high to low</option><option value="pub">Public score, high to low</option><option value="year">Newest release</option><option value="title">Title A to Z</option>
        </select>
      </div>
      <section id="grid" aria-live="polite">
        {!ready && Array.from({ length: 12 }, (_, i) => <div className="card sk" key={i}><div className="poster" /></div>)}
        {ready && list.slice(0, cap).map(card)}
        {ready && !lib.length && [1, 2, 3, 4].map((n) => <div className="card ghost" key={n}><div className="poster">{n === 1 ? 'Ticket 001' : 'Empty seat'}</div></div>)}
        {ready && !lib.length && <div className="none guide"><b>Start here</b><ol><li>Search a title you love in the bar above, and rate it.</li><li>Got a long list in Notepad? <Link href="/import">Import it</Link> in one go.</li><li>Rate five favourites and "Pick for tonight" learns your taste.</li></ol></div>}
        {ready && lib.length > 0 && !list.length && <p className="none">Nothing matches these filters.</p>}
        {ready && list.length > cap && <button className="btn g more" onClick={() => setCap(cap + 48)}>Show more ({list.length - cap} left)</button>}
      </section>
      
    </>
  );
}
