'use client';
import Link from 'next/link';
import Shelf from '@/components/Shelf';
import { KD, ST, MOODS, TAGS, bg } from '@/lib/ui';
import { isCustom, langName } from '@/lib/custom';
import { useApp } from '@/components/AppContext';

export default function TitleScreen() {
  const { setCustomOpen, Rating, add, addNew, colCount, fmt, fresh, item, logWatch, nextEp, onTitle, patch, ready, remove, router, s, setFK, setFS, setLog, setLq, setProg, share, sim, today, toggleIn } = useApp();
  const fullDetail = item ? (<>
          
          {item.backdrop && <div className="bd" style={bg(item.backdrop)} />}
          <div className="dm">
            <div className={'poster' + (item.poster ? '' : ' blank')} style={bg(item.poster)}>{item.poster ? '' : item.title}</div>
            <div>
              <h2>{item.title}</h2>
              {item.tagline && <div className="meta"><i>{item.tagline}</i></div>}
              <div className="meta">{[KD[item.kind], item.year, item.lang && item.lang !== 'en' ? langName(item.lang) : '', item.runtime, item.episodes && item.kind !== 'movie' ? item.episodes + ' episodes' : ''].filter(Boolean).join(', ')}</div>
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
                {isCustom(item.key) && <button className="btn g" onClick={() => setCustomOpen({ key: item.key })}>Edit details</button>}
                <a className="btn g" target="_blank" rel="noopener noreferrer" href={'https://www.google.com/search?q=' + encodeURIComponent(item.title + ' ' + item.year + ' ' + (item.kind === 'movie' ? 'movie' : item.kind))}>Google</a>
              </div>
              {item.watch && (item.watch.providers?.length > 0 || item.watch.rent?.length > 0) && (
                <div className="prov">{item.watch.providers.map((n) => <span key={n}>{n}</span>)}{item.watch.rent?.map((n) => <span key={n} className="alt">{n} (rent or buy)</span>)}
                  {item.key.startsWith('tm') && <small>Streaming data by JustWatch</small>}</div>
              )}
              <div className="prov">{(item.genres || []).map((g) => <button key={g} className="chip" onClick={() => { setLq(g); setFS('all'); setFK('all'); router.push('/'); }}>{g}</button>)}</div>
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
              {item.kind !== 'movie' && (() => {
                const seasons = item.seasons || [], p = item.progress || {};
                const s = p.s ?? (seasons[0]?.n ?? null), sObj = seasons.find((z) => z.n === s);
                const max = sObj ? sObj.eps : item.episodes || null;
                const lastSeason = seasons.length ? seasons[seasons.length - 1].n : null;
                return (
                  <div className="prog"><span>Watched up to</span>
                    {seasons.length > 0 && <label>Season<select value={s ?? ''} onChange={(e) => setProg(item, +e.target.value, 0)}>{seasons.map((z) => <option key={z.n} value={z.n}>{z.n}</option>)}</select><small>of {seasons.length}</small></label>}
                    <label>Episode<input type="number" min="0" max={max || undefined} key={item.key + s + (p.e ?? '')} defaultValue={p.e ?? ''} onBlur={(e) => setProg(item, s, e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0))} />{max ? <small>of {max}</small> : null}</label>
                    <button className="chip" aria-label="One episode back" onClick={() => setProg(item, s, Math.max(0, (p.e || 0) - 1))}>-1</button><button className="chip" onClick={() => nextEp(item)}>+1 episode</button>
                    {max > 0 && <button className="chip" onClick={() => setProg(item, s, max)}>{lastSeason != null && s !== lastSeason ? 'Finished this season' : 'Finished'}</button>}
                  </div>
                );
              })()}
              <h3>Your rating</h3>
              <div className="rate"><Rating it={item} /></div>
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
                  <input type="date" max={today()} defaultValue={l.d} aria-label="Date watched" onBlur={(e) => setLog(item, i, { d: e.target.value })} />
                  <input placeholder="Watched with" defaultValue={l.with} onBlur={(e) => setLog(item, i, { with: e.target.value })} />
                  <select defaultValue={l.mood} aria-label="Mood" onChange={(e) => setLog(item, i, { mood: e.target.value })}><option value="">Mood</option>{MOODS.map((m) => <option key={m}>{m}</option>)}</select>
                  <button className="chip" aria-label="Delete this entry" onClick={() => setLog(item, i, null)}>✕</button>
                  <input className="one" placeholder="What stayed with me, in one line" defaultValue={l.line} onBlur={(e) => setLog(item, i, { line: e.target.value })} />
                </div>
              ))}
              <button className="btn g" onClick={() => logWatch(item)}>{item.log?.length ? '↻ Log a rewatch' : '+ Log that I watched it'}</button>
              <div className="act"><button className="btn" onClick={() => share(item)}>Share</button><button className="btn g" onClick={() => router.push('/')}>Back to list</button><button className="btn g x" onClick={remove}>Remove</button></div>
            </div>
          </div>
        </>) : null;
  const titleView = onTitle ? (
    <section>
      <Link href="/" className="chip">← Back to my list</Link>
      {!ready ? <div className="card sk" style={{ width: 200, marginTop: 14 }}><div className="poster" /></div>
        : !item ? <p className="none">That title is not in your list. <Link href="/">Back to my list</Link></p>
        : <div className="pagecard">{fullDetail}</div>}
    </section>
  ) : null;
  return titleView;
}
