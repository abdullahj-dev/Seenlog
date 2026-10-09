'use client';
import Link from 'next/link';
import { KD, ST, bg } from '@/lib/ui';
import { useApp } from '@/components/AppContext';

export default function Popup() {
  const { Rating, dlg, fmt, ge, gm, gs, item, onTitle, patch, setCur } = useApp();
  
  return (
    <>
<dialog ref={dlg} onClose={() => { if (!onTitle) setCur(null); }} onClick={(e) => { if (e.target === dlg.current) dlg.current.close(); }}>
        {item && !onTitle && (<>
          <div className="grab" onTouchStart={gs} onTouchMove={gm} onTouchEnd={ge}><i /></div>
          <div className="qv">
            <div className={'poster' + (item.poster ? '' : ' blank')} style={bg(item.poster)}>{item.poster ? '' : item.title}</div>
            <div>
              <h2>{item.title}</h2>
              <div className="meta">{[KD[item.kind], item.year, item.runtime, (item.genres || []).slice(0, 3).join(', ')].filter(Boolean).join(', ')}</div>
              <div className="badges">{item.rating != null && <span className="mine">Your rating {fmt(item.rating)}</span>}{item.score != null && <span>Public {fmt(item.score * 10)}</span>}{(item.log?.length || 0) > 1 && <span>↻ {item.log.length}x</span>}</div>
              {item.overview && <p className="qo">{item.overview.slice(0, 170)}{item.overview.length > 170 ? '...' : ''}</p>}
              <div>{Object.entries(ST).map(([k, v]) => <button key={k} className="chip" aria-pressed={item.status === k} onClick={() => patch(item.key, { status: k })}>{v}</button>)}</div>
              <div className="rate"><Rating it={item} /></div>
              <div className="act">
                <Link className="btn" href={'/title/' + encodeURIComponent(item.key)}>Full details</Link>
                {item.watch?.link && <a className="btn watch" target="_blank" rel="noopener noreferrer" href={item.watch.link}>▶ Where to watch</a>}
                <button className="btn g" onClick={() => dlg.current.close()}>Close</button>
              </div>
            </div>
          </div>
        </>)}
      </dialog>
    </>
  );
}
