'use client';
import { KD, ST, bg } from '@/lib/ui';
import { useApp } from '@/components/AppContext';
import CustomAdd from '@/components/shell/CustomAdd';
import ReportDock from '@/components/shell/ReportDock';
import Offline from '@/components/Offline';

export default function Overlays() {
  const { Rating, bulk, bulkAdd, bulkDelete, helpOpen, justItem, list, patch, pickTonight, selMode, selected, setCur, setHelpOpen, setJust, setSelMode, setSelected, setToast, setToastAct, setTonight, toast, toastAct, tonight, topt, tweak } = useApp();
  
  return (
    <>
<CustomAdd />
<ReportDock />
<Offline />
{tonight && (
        <div className="help" onClick={() => setTonight(null)}>
          <div className="helpbox tn" onClick={(e) => e.stopPropagation()}>
            <div className="prov" style={{ justifyContent: 'center' }}>{[['any', 'Anything'], ['movie', 'Movie'], ['short', 'Under 100 min'], ['long', 'Series or anime']].map(([k, l]) => <button key={k} className="chip" aria-pressed={topt.kind === k} onClick={() => tweak({ kind: k })}>{l}</button>)}</div>
            <div className="prov" style={{ justifyContent: 'center' }}>{[['', 'Any mood'], ['funny', 'Funny'], ['thrilling', 'Thrilling'], ['comfort', 'Comforting'], ['mind', 'Mind-bending'], ['cry', 'A good cry']].map(([k, l]) => <button key={k} className="chip" aria-pressed={topt.mood === k} onClick={() => tweak({ mood: k })}>{l}</button>)}<button className="chip" aria-pressed={topt.re} onClick={() => tweak({ re: !topt.re })}>Include rewatches</button></div>
            {tonight.x ? (<>
              <div className={'poster' + (tonight.x.poster ? '' : ' blank')} style={bg(tonight.x.poster)}>{tonight.x.poster ? '' : tonight.x.title}</div>
              <h2 className="d">{tonight.x.title}</h2>
              <p className="tag" style={{ margin: '6px auto 0' }}>{[KD[tonight.x.kind], tonight.x.year, tonight.x.runtime].filter(Boolean).join(', ')}. {tonight.why}.</p>
              <div className="act">
                <button className="btn watch" onClick={() => { patch(tonight.x.key, { status: 'now' }); setCur(tonight.x.key); setTonight(null); }}>Start this</button>
                <button className="btn g" onClick={() => pickTonight(tonight.x.key)}>Another</button>
                <button className="btn g" onClick={() => setTonight(null)}>Close</button>
              </div></>) : (<><p className="tag">{tonight.why}</p><div className="act"><button className="btn g" onClick={() => setTonight(null)}>Close</button></div></>)}
          </div>
        </div>
      )}
{helpOpen && (
        <div className="help" onClick={() => setHelpOpen(false)}>
          <div className="helpbox" onClick={(e) => e.stopPropagation()}>
            <h2 className="d">Shortcuts</h2>
            <dl>
              <dt><kbd>/</kbd></dt><dd>Search for a title</dd>
              <dt><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd></dt><dd>Pick a search result</dd>
              <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Previous or next title in an open popup</dd>
              <dt><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></dt><dd>Plan, watching, watched</dd>
              <dt><kbd>W</kbd></dt><dd>Where to watch</dd>
              <dt><kbd>T</kbd></dt><dd>Trailer</dd>
              <dt><kbd>?</kbd></dt><dd>Show or hide this list</dd>
              <dt><kbd>Esc</kbd></dt><dd>Close anything open</dd>
            </dl>
          </div>
        </div>
      )}
{justItem && (
        <div className="quick" role="dialog" aria-label="Rate this title">
          <b>{justItem.title}</b>
          <span>{Object.entries(ST).map(([k, v]) => <button key={k} className="chip" aria-pressed={justItem.status === k} onClick={() => patch(justItem.key, { status: k })}>{v}</button>)}</span>
          <div className="rate"><Rating it={justItem} /></div>
          <button className="btn g" onClick={() => { setCur(justItem.key); setJust(null); }}>More details</button>
          <button className="btn" onClick={() => setJust(null)}>Done</button>
        </div>
      )}
{selMode && (
        <div className="bulk">
          <b>{selected.length} selected</b>
          <button className="chip" onClick={() => setSelected(list.map((x) => x.key))}>All {list.length}</button>
          {Object.entries(ST).map(([k, v]) => <button key={k} className="chip" onClick={() => selected.length && bulk(() => ({ status: k }), `${selected.length} moved to ${v}`)}>{v}</button>)}
          <input className="mini" placeholder="+ tag, Enter" onKeyDown={(e) => { if (e.key === 'Enter') { const el = e.target; bulkAdd('tags', el.value, () => { el.value = ''; }); } }} />
          <input className="mini" placeholder="+ collection, Enter" onKeyDown={(e) => { if (e.key === 'Enter') { const el = e.target; bulkAdd('cols', el.value, () => { el.value = ''; }); } }} />
          <button className="chip" onClick={bulkDelete}>Delete</button>
          <button className="btn g" onClick={() => { setSelMode(false); setSelected([]); }}>Done</button>
        </div>
      )}
<div id="toast" className={toast ? 'on' : ''} role="status">{toast}{toastAct && <button className="chip" style={{ marginLeft: 12 }} onClick={() => { toastAct.fn(); setToastAct(null); setToast(''); }}>{toastAct.label}</button>}</div>
    </>
  );
}
